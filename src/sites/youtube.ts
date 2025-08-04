import assert from "node:assert";
import { createWriteStream } from "node:fs";
import { pipeline } from 'node:stream/promises';
import { Innertube } from 'youtubei.js';
import { type PlaylistItem } from "../playlists.ts";

export async function downloadYoutube(
  id: string,
  targetFile: string,
): Promise<void> {
  const innertube = await Innertube.create();
  const readableStream = await innertube.download(id);
  await pipeline(readableStream, createWriteStream(targetFile));
}

export async function getPlaylistItems(url: URL): Promise<PlaylistItem[]> {
  const playlistId = url.searchParams.get("list");
  if (playlistId === null) {
    throw new Error(`Playlist url "${url}" doesn't have a list id!`);
  }
  const innertube = await Innertube.create();

  const playlist = await innertube.getPlaylist(playlistId);
  const allVideos = [...playlist.videos];

  // Continue fetching more videos if available
  let next = await playlist.getContinuation();
  do {
    allVideos.push(...next.videos);
    next = await next.getContinuation();
  } while (next.has_continuation)
  
  return allVideos.map(v => {
    assert("id" in v);
    assert("title" in v);
    return {
      title: v.title.toString(),
      id: v.id,
      url: ""
    }
  });
}
