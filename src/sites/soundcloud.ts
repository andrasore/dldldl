import * as fs from "fs";
import { promisify } from "util";
import { pipeline } from "stream";
import { Soundcloud } from "soundcloud.ts";
import { type PlaylistItem } from "../playlists.ts";

const pipelinePromise = promisify(pipeline);

const soundcloud = new Soundcloud();

export async function downloadSoundcloud(url: string, targetFile: string) {
  const stream = await soundcloud.util.streamTrack(url);
  return await pipelinePromise(stream, fs.createWriteStream(targetFile));
}

export async function getPlaylistItems(url: URL): Promise<PlaylistItem[]> {
  const playlist = await soundcloud.playlists.get(url.toString());
  return playlist.tracks.map((t) => ({ title: t.title, url: t.permalink_url }));
}

export async function getUserTracks(url: URL): Promise<PlaylistItem[]> {
  const userTracks = await soundcloud.users.tracks(
    url.pathname.slice(1) /* skip leading / */,
  );
  return userTracks.map((t) => ({ title: t.title, url: t.permalink_url }));
}
