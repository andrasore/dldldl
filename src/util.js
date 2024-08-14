import fs from "fs-extra";
import path from "node:path";
import { glob } from "node:fs/promises";
/** @import { PlaylistType } from "./playlists.js" */

/**  @param {string} dir */
export async function collectMp3s(dir) {
  /**  @type {string[]} */
  const result = [];
  for await (const item of glob('**/*.mp3')) {
    result.push(path.basename(item));
  }
  return result;
}

/**  @param {string} dir */
export async function deleteMp4s(dir) {
  for await (const item of glob('**/*.mp4')) {
    await fs.remove(item);
  }
}

/** @param {URL} url
    @returns {PlaylistType} */
export function getPlaylistType(url) {
  if (url.protocol === "http:" || url.protocol === "https:") {
    if (
      url.host === "www.youtube.com" ||
      url.host === "youtube.com" ||
      url.host === "music.youtube.com"
    ) {
      if (url?.pathname.startsWith("/playlist")) {
        return "YOUTUBE";
      }
    } else if (url.host === "soundcloud.com") {
      // This check should work for now...
      if (url?.pathname.includes("/sets/")) {
        return "SOUNDCLOUD";
      }

      if (/\w+/.test(url?.pathname)) {
        return "SOUNDCLOUD_USER";
      }
    }
  }
  throw new Error(`Invalid playlist url: ${url.toString()}`);
}

// These are sure are bad for filesystem names!
// For simplicity we only allow filenames that are both good on Windows and UN*Xes
export const UnsafeChars = /["\\/:*?<>|]/g;

/**  @param {string} s */
export function isBadFilename(s) {
  return UnsafeChars.test(s);
}

/**  @param {string} p */
export function convertToSafePath(p) {
  return p.replace(UnsafeChars, "").normalize();
}
