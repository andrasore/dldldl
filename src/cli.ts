#!/usr/bin/node
import fs from 'fs-extra'
import path from 'path'
import * as util from './util'
import * as youtube from './youtube'
import * as mp3s from './mp3s'
import PQueue from 'p-queue'
import { Command } from 'commander'
import packageJson from '../package.json'
import zod from 'zod'

const program = new Command()

program
  .name('dldldl')
  .description('A music playlist syncing utility')
  .version(packageJson.version)
  .argument('<library path>')

program.parse()

const workingDir = path.resolve(program.processedArgs[0])

console.log('Working dir is: ' + workingDir)

const ConfigFileSchema = zod.object({
  playlists: zod.record(zod.string())
})

const config = ConfigFileSchema.parse(fs.readJSONSync(path.join(workingDir, 'dldldl.json')))

const playlists = config.playlists

console.log('Reading library...')

util.collectMp3s(workingDir)
  .then(async mp3s => {
    const collection = new Set<string>(mp3s)

    console.log(`${collection.size} tracks found.`)
    console.log()

    const promises: Array<Promise<void>> = []

    for (const name of Object.keys(playlists)) {
      if (util.isBadFilename(name)) {
        throw new Error(`Playlist name "${name}" is invalid! Please fix it!" `)
      }

      const targetDir = path.join(workingDir, name)
      await fs.ensureDir(targetDir)

      const playlistUrl = new URL(playlists[name])

      switch (util.getPlaylistType(playlistUrl)) {
        case 'YOUTUBE_PLAYLIST':
          promises.push(downloadYoutubePlaylist(playlists[name], targetDir, collection))
          break
      }
    }
  }).catch(err => console.log(err))

const workQueue = new PQueue({ concurrency: 3 })

async function downloadYoutubePlaylist (url: string, targetDir: string, existingTracks: Set<string>): Promise<void> {
  const items = await youtube.getPlaylistItems(url)

  for (const item of items) {
    const filename = util.convertToSafePath(item.title)
    if (existingTracks.has(filename + '.mp3')) {
      continue
    }

    console.log(`Found new track: "${filename}"`)

    await workQueue.add(async () => {
      const videoPath = path.join(targetDir, filename + '.mp4')
      const audioPath = path.join(targetDir, filename + '.mp3')
      await youtube.downloadYoutube(item.url, videoPath)

      await mp3s.convertVideoToMp3(videoPath, audioPath)
      await fs.remove(videoPath)
      console.log(`Track "${filename}" is ready.`)
    })
  }
}
