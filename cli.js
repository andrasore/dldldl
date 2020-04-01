// @ts-check
'use strict';

const fs = require('fs-extra');
const path = require('path');
const PQueue = require('p-queue').default;
const util = require('./util');
const youtube = require('./youtube');
const mp3s = require('./mp3s');

const workingDir = path.dirname(path.resolve(process.argv[2]));
const config = fs.readJSONSync(path.join(workingDir, 'dldldl.json'));

const playlists = config.playlists;
const googleToken = config.googleToken;

util.collectMp3s(workingDir)
.then(async mp3s => {
    const collection = new Set(mp3s);

    for (const name of Object.keys(playlists)) {
        if (util.isBadFilename(name)) {
            throw new Error(`Playlist name "${name}" is invalid! Please fix it!" `);
        }

        const targetDir = path.dirname(path.join(workingDir, name));
        await fs.ensureDir(targetDir);

        switch (util.getPlaylistType(playlists[name])) {
            case "YOUTUBE_PLAYLIST":
            downloadYoutubePlaylist(playlists[name], targetDir, collection);
            break;
        }
    }
});

const workQueue = new PQueue({ concurrency: 3 });

async function downloadYoutubePlaylist(url, targetDir, existingTracks) {
    const items = await youtube.getPlaylistItems(url, googleToken);

    for (const item of items) {
        const filename = util.convertToSafePath(item.title);
        if (existingTracks.has(filename + '.mp3')) {
            continue;
        }

        workQueue.add(async () => {
            const videoPath = path.join(targetDir, filename, '.mp4');
            const audioPath = path.join(targetDir, filename, '.mp3');
            await youtube.downloadYoutube(item.url, videoPath);

            await mp3s.convertVideoToMp3(videoPath, audioPath);
        });        
    }
}