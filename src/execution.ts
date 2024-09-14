import { Listr, type ListrTaskWrapper } from "listr2";
import zod from "zod";
import fs from "fs-extra";
import path from "node:path";
import PQueue from "p-queue";
import assert from "node:assert";
import { collectMp3s } from "./util.ts";
import * as util from "./util.ts";
import * as youtube from "./sites/youtube.ts";
import * as soundcloud from "./sites/soundcloud.ts";
import * as mp3s from "./mp3s.ts";
import { type TaskContext } from "./taskContext.ts";
import { type PlaylistItem } from "./playlists.ts";

export async function executeDldldl(workingDir: string) {
  const tasks = new Listr([
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
          Object.keys(ctx.playlists).map((name) => ({
            title: name,
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

async function parseConfig(ctx: TaskContext) {
  const ConfigFileSchema = zod.object({
    playlists: zod.record(zod.string()),
    concurrency: zod.number().min(1).optional(),
  });

  const config = ConfigFileSchema.parse(
    fs.readJSONSync(path.join(ctx.workingDir, "dldldl.json")),
  );

  for (const name of Object.keys(config.playlists)) {
    if (util.isBadFilename(name)) {
      throw new Error(
        `Playlist name "${name}" contains one or more of "${util.UnsafeChars.toString()}" chars! Please fix it!`,
      );
    }
  }

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
  return task.newListr(
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
  ctx: TaskContext,
  task: ListrTaskWrapper<TaskContext, any, any>,
) {
  assert(ctx.playlists);
  assert(ctx.playlistName);

  const targetDir = path.join(ctx.workingDir, ctx.playlistName);
  await fs.ensureDir(targetDir);

  const playlistUrl = new URL(ctx.playlists[ctx.playlistName]);
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
    const filename = util.convertToSafePath(item.title);
    if (ctx.mp3collection.has(filename + ".mp3")) {
      return false;
    }
    return true;
  });

  task.title = `Found ${newItems.length} new songs.`;

  ctx.itemsToDownload = newItems;
}

async function downloadAndConvert(
  ctx: TaskContext,
  task: ListrTaskWrapper<TaskContext, any, any>,
) {
  assert(ctx.playlists);
  assert(ctx.itemsToDownload);
  assert(ctx.playlistName);

  // TODO extract these somewhere
  const targetDir = path.join(ctx.workingDir, ctx.playlistName);
  const playlistUrl = new URL(ctx.playlists[ctx.playlistName]);
  const playlistType = util.getPlaylistType(playlistUrl);

  const workQueue = new PQueue({ concurrency: ctx.concurrency ?? 3 });

  const errors = [];
  let remaining = ctx.itemsToDownload.length;
  task.title = `Downloading and converting ${remaining} songs.`;

  await workQueue.addAll(
    ctx.itemsToDownload.map((item) => async () => {
      const filename = util.convertToSafePath(item.title);
      try {
        const videoPath = path.join(targetDir, filename + ".mp4");
        const audioPath = path.join(targetDir, filename + ".mp3");

        switch (playlistType) {
          case "YOUTUBE": {
            await youtube.downloadYoutube(item.url, videoPath);
            break;
          }
          case "SOUNDCLOUD": {
            await soundcloud.downloadSoundcloud(item.url, videoPath);
            break;
          }
          case "SOUNDCLOUD_USER": {
            await soundcloud.downloadSoundcloud(item.url, videoPath);
            break;
          }
        }
        task.output = `Downloaded "${filename}"`;

        await mp3s.convertVideoToMp3(videoPath, audioPath);
        task.output = `Converted "${filename}"`;

        await fs.remove(videoPath);

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
