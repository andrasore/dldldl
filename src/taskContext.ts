import { type PlaylistItem } from "./playlists.ts";

export type TaskContext = {
  workingDir: string;
  playlists?: Record<string, string>;
  mp3collection?: Set<string>;
  playlistName?: string;
  playlistUrl?: string;
  itemsToDownload?: PlaylistItem[];
  concurrency?: number;
};
