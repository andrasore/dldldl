import * as fs from 'fs'
import { promisify } from 'util'
import { pipeline } from 'stream'
import { PlaylistItem } from '../playlists'
import Soundcloud from 'soundcloud.ts'

const pipelinePromise = promisify(pipeline)

const soundcloud = new Soundcloud()

export async function downloadSoundcloud (url: string, targetFile: string): Promise<void> {
  const stream = await soundcloud.util.streamTrack(url)
  return await pipelinePromise(stream, fs.createWriteStream(targetFile))
}

export async function getPlaylistItems (url: string): Promise<PlaylistItem[]> {
  const playlist = await soundcloud.playlists.getV2(url)
  return playlist.tracks.map(t => ({ title: t.title, url: t.permalink_url }))
}
