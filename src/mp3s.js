'use strict'

import path from 'node:path'
import util from 'node:util'
import * as child_process from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'
const execFile = util.promisify(child_process.execFile)

/**  @param {string} inputFile
  *  @param {string} outputFile */
export async function convertVideoToMp3 (inputFile, outputFile) {
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
