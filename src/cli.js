#!/usr/bin/env node
import fs from "fs-extra";
import path from "node:path";
import * as util from "./util.js";
import * as youtube from "./sites/youtube.js";
import * as soundcloud from "./sites/soundcloud.js";
import * as mp3s from "./mp3s.js";
import PQueue from "p-queue";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import zod from "zod";
/** @typedef {import("./playlists.js").PlaylistType} PlaylistType */

const program = new Command();

program
  .name("dldldl")
  .description("A music playlist syncing utility")
  .version(packageJson.version)
  .argument("<library path>");

program.parse();

const workingDir = path.resolve(program.processedArgs[0]);

console.log("Working dir is: " + workingDir);

const ConfigFileSchema = zod.object({
  playlists: zod.record(zod.string()),
});

const config = ConfigFileSchema.parse(
  fs.readJSONSync(path.join(workingDir, "dldldl.json")),
);

const playlists = config.playlists;

console.log("Reading library...");

const workQueue = new PQueue({ concurrency: 3 });

util
  .collectMp3s(workingDir)
  .then(async (mp3s) => {
    const collection = new Set(mp3s);

    console.log(`${collection.size} tracks found.`);
    console.log();

    for (const name of Object.keys(playlists)) {
      if (util.isBadFilename(name)) {
        throw new Error(
          `Playlist name "${name}" contains one or more of "${util.UnsafeChars.toString()}" chars! Please fix it!`,
        );
      }

      const targetDir = path.join(workingDir, name);
      await fs.ensureDir(targetDir);

      const playlistUrl = new URL(playlists[name]);
      const playlistType = util.getPlaylistType(playlistUrl);

      await downloadPlaylist(
        name,
        playlists[name],
        playlistType,
        targetDir,
        collection,
      );
    }
  })
  .catch((err) => console.log(err));

/**  @param {string} name
 *  @param {string} url
 *  @param {PlaylistType} type
 *  @param {string} targetDir
 *  @param {Set<string>} existingTracks */
async function downloadPlaylist(name, url, type, targetDir, existingTracks) {
  let items;
  try {
    items =
      type === "YOUTUBE"
        ? await youtube.getPlaylistItems(url)
        : await soundcloud.getPlaylistItems(url);
  } catch (err) {
    console.error(`Error when processing playlist: ${url}`);
    console.error(err);
    return;
  }

  console.log(`Playlist ${name} has ${items.length} items.`);

  for (const item of items) {
    const filename = util.convertToSafePath(item.title);
    if (existingTracks.has(filename + ".mp3")) {
      continue;
    }

    console.log(`Found new track: "${filename}"`);

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    workQueue.add(async () => {
      const videoPath = path.join(targetDir, filename + ".mp4");
      const audioPath = path.join(targetDir, filename + ".mp3");

      try {
        switch (type) {
          case "YOUTUBE": {
            await youtube.downloadYoutube(item.url, videoPath);
            break;
          }
          case "SOUNDCLOUD": {
            await soundcloud.downloadSoundcloud(item.url, videoPath);
            break;
          }
        }

        await mp3s.convertVideoToMp3(videoPath, audioPath);
        await fs.remove(videoPath);
        console.log(`Track "${filename}" is ready.`);
      } catch (err) {
        console.error(`Error when processing track: ${item.title}`);
      }
    });
  }
}
