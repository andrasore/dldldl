import { createWriteStream } from "node:fs";
import { pipeline } from 'node:stream/promises';
import { Innertube } from 'youtubei.js';
import ytpl from "ytpl";
import { type PlaylistItem } from "../playlists.ts";

const innertube = await Innertube.create();

export async function downloadYoutube(
  id: string,
  targetFile: string,
): Promise<void> {
  const readableStream = await innertube.download(id);
  await pipeline(readableStream, createWriteStream(targetFile));
}

export async function getPlaylistItems(url: URL): Promise<PlaylistItem[]> {
  const playlistId = url.searchParams.get("list");
  if (playlistId === null) {
    throw new Error(`Playlist url "${url}" doesn't have a list id!`);
  }

  return (await ytpl(playlistId, { pages: Infinity })).items;
}
