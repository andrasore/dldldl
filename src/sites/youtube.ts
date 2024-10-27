import { createWriteStream } from "node:fs";
import ytdl from "@distube/ytdl-core";
import ytpl from "ytpl";
import { type PlaylistItem } from "../playlists.ts";

export async function downloadYoutube(
  url: string,
  targetFile: string,
): Promise<void> {
  return await new Promise((resolve, reject) => {
    ytdl(url, { quality: "highestaudio" })
      .on("end", () => resolve())
      .on("error", reject)
      .pipe(createWriteStream(targetFile));
  });
}

export async function getPlaylistItems(url: URL): Promise<PlaylistItem[]> {
  const playlistId = url.searchParams.get("list");
  if (playlistId === null) {
    throw new Error(`Playlist url "${url}" doesn't have a list id!`);
  }

  return (await ytpl(playlistId, { pages: Infinity })).items;
}
