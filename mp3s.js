'use strict';

const nodeId3 = require('node-id3');
const path = require('path');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const ffmpegStatic = require('ffmpeg-static');

exports.writeTagsToFile = async function (targetFile, tags) {
    return new Promise((resolve, reject) => {
        nodeId3.write(tags, targetFile, err => {
            if (err) {
                reject(err)
            }
            else {
                resolve();
            }
        })
    });
}

exports.convertVideoToMp3 = async function (inputFile, outputFile) {
    const args = [
        '-i', inputFile, // input file
        '-vn', // disable video
        '-ar', '44100', // audio sampling frequency
        '-ac', '2', // no. of audio channels
        '-b:a', '256k', // audio bitrate
        outputFile // output file
    ]

    const cwd = path.dirname(outputFile);

    await execFile(ffmpegStatic, args, { cwd });
}