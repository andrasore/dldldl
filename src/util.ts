import * as fs from "node:fs/promises";
import path from "node:path";
import { glob } from "node:fs/promises";
import { type PlaylistType } from "./playlists.ts";

export async function collectMp3s(dir: string): Promise<string[]> {
  const result = [];
  for await (const item of glob("**/*.mp3", { cwd: dir })) {
    result.push(path.basename(item));
  }
  return result;
}

export async function deleteMp4s(dir: string) {
  for await (const item of glob("**/*.mp4", { cwd: dir })) {
    await fs.unlink(item);
  }
}

export function getPlaylistType(url: URL): PlaylistType {
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

export const UnsafeChars = /[":*?<>|]/g;

export function isBadFilename(s: string) {
  return UnsafeChars.test(s);
}

export function convertToSafePath(p: string) {
  return p.replace(UnsafeChars, "").normalize();
}
