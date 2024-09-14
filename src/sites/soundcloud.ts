import * as fs from "fs";
import { promisify } from "util";
import { pipeline } from "stream";
import { Soundcloud } from "soundcloud.ts";
/**  @import { PlaylistItem } from "../playlists.ts" */

const pipelinePromise = promisify(pipeline);

const soundcloud = new Soundcloud();

/**  @param {URL} url
     @param {string} targetFile */
export async function downloadSoundcloud(url, targetFile) {
  const stream = await soundcloud.util.streamTrack(url.toString());
  return await pipelinePromise(stream, fs.createWriteStream(targetFile));
}

/**  @param {URL} url
     @returns {Promise<PlaylistItem[]>} */
export async function getPlaylistItems(url) {
  const playlist = await soundcloud.playlists.getV2(url.toString());
  return playlist.tracks.map((t) => ({ title: t.title, url: t.permalink_url }));
}

/**  @param {URL} url
     @returns {Promise<PlaylistItem[]>} */
export async function getUserTracks(url) {
  const userTracks = await soundcloud.users.tracksV2(
    url.pathname.slice(1) /* skip leading / */,
  );
  return userTracks.map((t) => ({ title: t.title, url: t.permalink_url }));
}
