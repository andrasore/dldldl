'use strict'

// import nodeId3 from 'node-id3'
import path from 'node:path'
import util from 'node:util'
import * as child_process from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'
const execFile = util.promisify(child_process.execFile)

// skipping this for now

/*
export async function writeTagsToFile (targetFile: string, tags: any): Promise<void> {
  return await new Promise((resolve, reject) => {
    nodeId3.write(tags, targetFile, err => {
      if (err != null) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
*/

export async function convertVideoToMp3 (inputFile: string, outputFile: string): Promise<void> {
  const args = [
    '-i', inputFile, // input file
    '-vn', // disable video
    '-ar', '44100', // audio sampling frequency
    '-ac', '2', // no. of audio channels
    '-b:a', '256k', // audio bitrate
    outputFile // output file
  ]

  const cwd = path.dirname(outputFile)

  if (!ffmpegStatic) {
    throw new Error('ffmpeg-static not found!');
  }

  // @ts-expect-error type of ffmpegStatic is import(...) instead of string
  await execFile(ffmpegStatic, args, { cwd })
}
