'use strict'

const fs = require('fs-extra');
const path = require('path');

async function collectMp3s(dir, result = []) {
    const items = await fs.readdir(dir);
    for (const item of items) {
        const stat = await fs.stat(path.join(dir, item));
        if (stat.isFile() && item.endsWith('.mp3')) {
            result.push(item);
        }
        else if (stat.isDirectory()) {
            await collectMp3s(path.join(dir, item), result);
        }
    }
    return result;
}

exports.collectMp3s = collectMp3s;


exports.getPlaylistType = function (urlString) {
    const url = new URL(urlString);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (url.host === 'www.youtube.com' || url.host === 'youtube.com') {
            if (url.pathname && url.pathname.startsWith('/playlist')) {
                return 'YOUTUBE_PLAYLIST'
            }
        }
        else if (url.host === 'open.spotify.com') {
            return 'SPOTIFY_PLAYLIST';
        }
    }
    throw new Error('Invalid playlist url: ' + urlString);
}

// These are sure are bad for filesystem names!
const UnsafeChars = /["\\\/:*?<>|]/g;

exports.isBadFilename = function (s) {
    return UnsafeChars.test(s);
}

exports.convertToSafePath =  function (p) {
    return p.replace(UnsafeChars, '').normalize();
}