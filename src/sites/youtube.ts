import ytdl from 'ytdl-core'
import fs from 'fs-extra'
import ytpl from 'ytpl'
import { PlaylistItem } from '../playlists'

export async function downloadYoutube (url: string, targetFile: string): Promise<void> {
  return await new Promise((resolve, reject) => {
    ytdl(url, { quality: 'highestaudio' })
      .on('end', () => resolve())
      .on('error', reject)
      .pipe(fs.createWriteStream(targetFile))
  })
}

export async function getPlaylistItems (url: string): Promise<PlaylistItem[]> {
  const urlObj = new URL(url)
  const playlistId = urlObj.searchParams.get('list')
  if (playlistId === null) {
    throw new Error(`Playlist url "${url}" doesn't have a list id!`)
  }
  const ytplResult = await ytpl(playlistId)

  return ytplResult.items
}
