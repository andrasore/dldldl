import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import assert from "node:assert";
import { Listr, type ListrTaskWrapper } from "listr2";
import zod from "zod";
import PQueue from "p-queue";
import * as yaml from "yaml";
import { collectMp3s } from "./util.ts";
import * as util from "./util.ts";
import * as youtube from "./sites/youtube.ts";
import * as soundcloud from "./sites/soundcloud.ts";
import * as mp3s from "./mp3s.ts";
import { type TaskContext } from "./taskContext.ts";
import { type PlaylistItem } from "./playlists.ts";

export async function executeDldldl(workingDir: string) {
  const tasks = new Listr<TaskContext>([
    {
      title: "Parsing config.",
      task: parseConfig,
    },
    {
      title: "Reading library.",
      task: readLibrary,
    },
    {
      title: "Syncing playlists.",
      task: (ctx, task) => {
        assert(ctx.playlists); // We just put it there
        return task.newListr(
          ctx.playlists.map(p => ({
            title: p.name,
            task: processPlaylist,
            exitOnError: false,
          })),
          { ctx },
        );
      },
    },
  ]);

  try {
    await tasks.run({ workingDir });
  } catch (err) {
    console.log(err);
  }
}

async function parseConfig(
  ctx: TaskContext,
  task: ListrTaskWrapper<TaskContext, any, any>,
) {
  const ConfigFileSchema = zod.object({
    playlists: zod
      .object({
        name: zod.string(),
        url: zod.string().url(),
        path: zod.string().refine((val) => !util.isBadFilename(val), {
          message: `Playlist path cannot contain any of these chars: ${util.UnsafeCharsForPath.toString()}`,
        }),
      })
      .array(),
    concurrency: zod.number().min(1).optional(),
  });

  const workingDirContent = await fsPromises.readdir(ctx.workingDir);

  const configName = workingDirContent.includes("dldldl.yml") && "dldldl.yml";
  (workingDirContent.includes("dldldl.yaml") && "dldldl.yaml") || undefined;

  if (!configName) {
    throw new Error(
      '"dldldl.yml" or "dldldl.yaml" not found in music library!',
    );
  }

  const config = ConfigFileSchema.parse(
    yaml.parse(
      await fsPromises.readFile(path.join(ctx.workingDir, configName), {
        encoding: "utf8",
      }),
    ),
  );

  ctx.playlists = config.playlists;
  ctx.concurrency = config.concurrency;
}

async function readLibrary(
  ctx: TaskContext,
  task: ListrTaskWrapper<TaskContext, any, any>,
) {
  const mp3s = await collectMp3s(ctx.workingDir);
  ctx.mp3collection = new Set(mp3s);
  task.title = `${ctx.mp3collection.size} tracks found.`;
}

async function processPlaylist(
  ctx: TaskContext,
  task: ListrTaskWrapper<TaskContext, any, any>,
) {
  const playlistName = task.title; // hacky but the name is there
  return task.newListr<TaskContext & { playlistName: string }>(
    [
      {
        title: "Downloading playlist metadata.",
        task: downloadPlaylistMetadata,
      },
      {
        title: "Downloading and converting songs.",
        task: downloadAndConvert,
        rollback: async (ctx) => {
          const targetDir = path.join(ctx.workingDir, ctx.playlistName);
          await util.deleteMp4s(targetDir);
        },
      },
    ],
    { ctx: { ...ctx, playlistName } },
  );
}

async function downloadPlaylistMetadata(
  ctx: TaskContext & { playlistName: string },
  task: ListrTaskWrapper<TaskContext & { playlistName: string }, any, any>,
) {
  assert(ctx.playlists);
  assert(ctx.playlistName);

  const targetDir = path.join(ctx.workingDir, ctx.playlistName);
  if (!fs.existsSync(targetDir)) {
    await fsPromises.mkdir(targetDir);
  }

  const playlistUrl = new URL(
    ctx.playlists.find(p => p.name === ctx.playlistName)!.url,
  );
  const playlistType = util.getPlaylistType(playlistUrl);

  let items: PlaylistItem[];
  switch (playlistType) {
    case "YOUTUBE":
      items = await youtube.getPlaylistItems(playlistUrl);
      break;
    case "SOUNDCLOUD":
      items = await soundcloud.getPlaylistItems(playlistUrl);
      break;
    case "SOUNDCLOUD_USER":
      items = await soundcloud.getUserTracks(playlistUrl);
      break;
    default:
      throw new Error("This should not happen.");
  }

  const newItems = items.filter((item) => {
    assert(ctx.mp3collection);
    const filename = util.convertToFilename(item.title);
    if (ctx.mp3collection.has(filename + ".mp3")) {
      return false;
    }
    return true;
  });

  task.title = `Found ${newItems.length} new songs.`;

  ctx.itemsToDownload = newItems;
}

async function downloadAndConvert(
  ctx: TaskContext & { playlistName: string },
  task: ListrTaskWrapper<TaskContext & { playlistName: string }, any, any>,
) {
  assert(ctx.playlists);
  assert(ctx.itemsToDownload);
  assert(ctx.playlistName);

  // TODO extract these somewhere
  const targetDir = path.join(ctx.workingDir, ctx.playlistName);
  const playlistUrl = new URL(ctx.playlists.find(p => p.name === ctx.playlistName)!.url);
  const playlistType = util.getPlaylistType(playlistUrl);

  const workQueue = new PQueue({ concurrency: ctx.concurrency ?? 3 });

  const errors = [];
  let remaining = ctx.itemsToDownload.length;
  task.title =
    playlistType == "YOUTUBE"
      ? `Downloading and converting ${remaining} songs.`
      : `Downloading ${remaining} songs.`;

  await workQueue.addAll(
    ctx.itemsToDownload.map((item) => async () => {
      const filename = util.convertToFilename(item.title);
      try {
        const videoPath = path.join(targetDir, filename + ".mp4");
        const audioPath = path.join(targetDir, filename + ".mp3");

        switch (playlistType) {
          case "YOUTUBE": {
            await youtube.downloadYoutube(item.url, videoPath);
            break;
          }
          case "SOUNDCLOUD": {
            await soundcloud.downloadSoundcloud(item.url, audioPath);
            break;
          }
          case "SOUNDCLOUD_USER": {
            await soundcloud.downloadSoundcloud(item.url, audioPath);
            break;
          }
        }
        task.output = `Downloaded "${filename}"`;

        if (playlistType != "YOUTUBE") {
          remaining--;
          return;
        }
        await mp3s.convertVideoToMp3(videoPath, audioPath);
        task.output = `Converted "${filename}"`;

        await fsPromises.unlink(videoPath);

        remaining--;
        task.title = `Downloading and converting ${remaining} songs.`;
      } catch (err) {
        task.output = `Error when processing "${filename}"`;
        errors.push(err);
        // TODO process errors
      }
    }),
  );
}
