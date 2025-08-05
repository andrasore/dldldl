import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import zod from "zod";
import * as yaml from "yaml";
import { collectMp3s } from "./util.ts";
import * as util from "./util.ts";
import * as youtube from "./sites/youtube.ts";
import * as soundcloud from "./sites/soundcloud.ts";
import * as mp3s from "./mp3s.ts";
import { wrapParallelTasks, wrapTask } from './tasks.ts';
import { type PlaylistItem } from "./playlists.ts";

export async function executeDldldl(workingDir: string) {
  const config = await wrapTask(parseConfig, { title: 'Parsing config' })({ workingDir });

  const mp3s = await wrapTask(readLibrary, { title: 'Reading library' })({ workingDir });

  const errors: Error[] = [];

  for (const playlist of config.playlists) {
    const targetDir = playlist.path
      ? path.join(workingDir, playlist.path)
      : path.join(workingDir, util.convertToFilename(playlist.name));
    const newItems = await wrapTask(downloadPlaylistMetadata, { title: `Downloading metadata for "${playlist.name}"` })({ playlist, targetDir, mp3s });
    const dlErrors = await downloadAndConvert({
      targetDir,
      playlist,
      concurrency: config.concurrency ?? 1,
      throttleMs: config.throttleMs ?? 5000,
      newItems
    });
    if (dlErrors instanceof Array) {
      errors.push(...dlErrors);
    }
  }

  // These errors may happen while doing the conversion
  if (errors.length > 0) {
    console.error(`${errors.length} errors happened while converting`)
    for (const err of errors) {
      console.log(err);
    }
  }
}

async function parseConfig(
  { workingDir }: { workingDir: string },
) {
  const ConfigFileSchema = zod.object({
    playlists: zod
      .object({
        name: zod.string(),
        url: zod.string().url(),
        path: zod.string().refine((val) => !util.isBadFilename(val), {
          message: `Playlist path cannot contain any of these chars: ${util.UnsafeCharsForPath.toString()}`,
        }).optional(),
      })
      .array(),
    concurrency: zod.number().min(1).optional(),
    throttleMs: zod.number().min(0).optional(),
  }).strict();

  const workingDirContent = await fsPromises.readdir(workingDir);

  const configName = workingDirContent.includes("dldldl.yml") && "dldldl.yml";
  (workingDirContent.includes("dldldl.yaml") && "dldldl.yaml") || undefined;

  if (!configName) {
    throw new Error(
      '"dldldl.yml" or "dldldl.yaml" not found in music library!',
    );
  }

  let config;
  try {
    config = ConfigFileSchema.parse(
      yaml.parse(
        await fsPromises.readFile(path.join(workingDir, configName), {
          encoding: "utf8",
        }),
      ),
    );
  }
  catch (err) {
    throw new Error('Failed to parse config file!', { cause: err });
  }

  return config;
}

async function readLibrary(
  { workingDir }: { workingDir: string },
) {
  const mp3s = await collectMp3s(workingDir);
  return new Set(mp3s);
}

interface Playlist {
  name: string;
  url: string;
  path?: string;
}

async function downloadPlaylistMetadata(
  { playlist, targetDir, mp3s }: { playlist: Playlist, targetDir: string, mp3s: Set<string> }
) {
  if (!fs.existsSync(targetDir)) {
    await fsPromises.mkdir(targetDir);
  }

  const playlistUrl = new URL(playlist.url);
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
    const filename = util.convertToFilename(item.title);
    if (mp3s.has(filename + ".mp3")) {
      return false;
    }
    return true;
  });

  return newItems;
}

const shuffle= <T>(array: T[]) => { 
  for (let i = array.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [array[i], array[j]] = [array[j], array[i]]; 
  } 
  return array; 
}; 

async function downloadAndConvert(
  { targetDir, playlist, concurrency, throttleMs, newItems }: { targetDir: string, playlist: Playlist, concurrency: number, throttleMs: number, newItems: PlaylistItem[] }
): Promise<void | Error[]> {
  const playlistUrl = new URL(playlist.url);
  const playlistType = util.getPlaylistType(playlistUrl);

  return wrapParallelTasks(
    shuffle(newItems).map((item) => async () => {
      const filename = util.convertToFilename(item.title);
      const videoPath = path.join(targetDir, filename + ".mp4");
      const audioPath = path.join(targetDir, filename + ".mp3");

      try {
        switch (playlistType) {
          case "YOUTUBE": {
            await youtube.downloadYoutube(item.id, videoPath);
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
      }
      catch (err) {
        return Error(`Failed to download ${item.title}`, { cause: err });
      }

      if (playlistType == "YOUTUBE") {
        try {
          await mp3s.convertVideoToMp3(videoPath, audioPath);
          await fsPromises.unlink(videoPath);
        }
        catch (err) {
          return Error(`Failed to convert ${item.title}`, { cause: err });
        }
      }
      return;
    }),
    { title: `Downloading and converting "${playlist.name}"`, concurrency, throttleMs }
  );
}
