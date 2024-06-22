import * as fs from "fs";
import { promisify } from "util";
import { pipeline } from "stream";
import { Soundcloud } from "soundcloud.ts";
/** @typedef {import("../playlists.js").PlaylistItem} PlaylistItem */

const pipelinePromise = promisify(pipeline);

const soundcloud = new Soundcloud();

/**  @param {string} url
     @param {string} targetFile */
export async function downloadSoundcloud(url, targetFile) {
  const stream = await soundcloud.util.streamTrack(url);
  return await pipelinePromise(stream, fs.createWriteStream(targetFile));
}

/**  @param {string} url
     @returns {Promise<PlaylistItem[]>} */
export async function getPlaylistItems(url) {
  const playlist = await soundcloud.playlists.getV2(url);
  return playlist.tracks.map((t) => ({ title: t.title, url: t.permalink_url }));
}
