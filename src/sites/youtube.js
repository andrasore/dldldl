import ytdl from "@distube/ytdl-core";
import fs from "fs-extra";
import ytpl from "ytpl";
/**  @import { PlaylistItem } from "../playlists.js" */

/**  @param {string} url
 *  @param {string} targetFile
 *  @returns {Promise<void>} */
export async function downloadYoutube(url, targetFile) {
  return await new Promise((resolve, reject) => {
    ytdl(url, { quality: "highestaudio" })
      .on("end", () => resolve())
      .on("error", reject)
      .pipe(fs.createWriteStream(targetFile));
  });
}

/**  @param {string} url
 *  @returns {Promise<PlaylistItem[]>} */
export async function getPlaylistItems(url) {
  const urlObj = new URL(url);
  const playlistId = urlObj.searchParams.get("list");
  if (playlistId === null) {
    throw new Error(`Playlist url "${url}" doesn't have a list id!`);
  }

  return (await ytpl(playlistId, { pages: Infinity })).items;
}
