import fs from 'fs-extra'
import path from 'path'
import { PlaylistType } from './playlists'

export async function collectMp3s (dir: string): Promise<string[]> {
  const result: string[] = []

  async function collect (dir: string): Promise<void> {
    const items = await fs.readdir(dir)
    for (const item of items) {
      const stat = await fs.stat(path.join(dir, item))
      if (stat.isFile() && item.endsWith('.mp3')) {
        result.push(item)
      } else if (stat.isDirectory()) {
        await collect(path.join(dir, item))
      }
    }
  }

  await collect(dir)

  return result
}

export function getPlaylistType (url: URL): PlaylistType {
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    if (url.host === 'www.youtube.com' || url.host === 'youtube.com') {
      if (url?.pathname.startsWith('/playlist')) {
        return 'YOUTUBE'
      }
    } else if (url.host === 'soundcloud.com') {
      // This check should work for now...
      if (url?.pathname.includes('/sets/')) {
        return 'SOUNDCLOUD'
      }
    }
  }
  throw new Error(`Invalid playlist url: ${url.toString()}`)
}

// These are sure are bad for filesystem names!
// For simplicity we only allow filenames that are both good on Windows and UN*Xes
export const UnsafeChars = /["\\/:*?<>|]/g

export function isBadFilename (s: string): boolean {
  return UnsafeChars.test(s)
}

export function convertToSafePath (p: string): string {
  return p.replace(UnsafeChars, '').normalize()
}
