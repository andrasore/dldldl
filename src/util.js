import fs from "fs-extra";
import path from "node:path";
/** @typedef {import("./playlists.js").PlaylistType} PlaylistType */

/**  @param {string} dir */
export async function collectMp3s(dir) {
  /**  @type {string[]} */
  const result = [];

  /**  @param {string} dir */
  async function collect(dir) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const stat = await fs.stat(path.join(dir, item));
      if (stat.isFile() && item.endsWith(".mp3")) {
        result.push(item);
      } else if (stat.isDirectory()) {
        await collect(path.join(dir, item));
      }
    }
  }

  await collect(dir);

  return result;
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
