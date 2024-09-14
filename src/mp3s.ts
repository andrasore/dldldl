import z from "zod";
import path from "node:path";
import util from "node:util";
import fs from "fs-extra";
import * as child_process from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
const execFile = util.promisify(child_process.execFile);
const exec = util.promisify(child_process.exec);

export async function convertVideoToMp3(inputFile: string, outputFile: string) {
  const args = [
    "-i",
    inputFile, // input file
    "-vn", // disable video
    "-ar",
    "44100", // audio sampling frequency
    "-ac",
    "2", // no. of audio channels
    "-b:a",
    "256k", // audio bitrate
    outputFile, // output file
  ];

  const cwd = path.dirname(outputFile);

  const ffmpegStaticPath = z.string().parse(ffmpegStatic);

  if (await fs.exists(ffmpegStaticPath)) {
    await execFile(ffmpegStaticPath, args, { cwd });
  } else {
    await exec(`ffmpeg ${args.join(" ")}`, { cwd });
  }
}
