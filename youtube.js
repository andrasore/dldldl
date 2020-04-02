'use strict';

const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');

exports.downloadYoutube = async function (url, targetFile) {
    return new Promise((resolve, reject) => {
        ytdl(url, { quality: 'highestaudio' })
        .on('end', () => resolve())
        .on('error', reject)
        .pipe(fs.createWriteStream(targetFile));
    });
}

exports.getPlaylistItems = async function(url, googleToken) {
    const playlistId = new URL(url).searchParams.get('list');

    if (!playlistId) {
        throw new Error('Invalid Youtube playlist url: ' + url);
    }

    const endpoint = 'https://www.googleapis.com/youtube/v3/playlistItems';

    let playlistItems = [];

    let pageToken;
    do {
        let response;
        try {
            response = await axios.get(endpoint, {
                params: {
                    part: 'snippet',
                    playlistId: playlistId,
                    maxResults: 20,
                    key: googleToken,
                    pageToken: pageToken
                }
            });
        }
        catch (err) {
            if (err.isAxiosError && err.response.status === 404) {
                console.warn('Playlist is not available: ' + url);
                return [];
            }
            else {
                throw err;
            }
        }
        pageToken = response.data.nextPageToken;

        playlistItems.push(...response.data.items);
    } while (pageToken)

    return playlistItems.map(item => ({
        title: item.snippet.title,
        url: 'https://youtube.com/watch?v=' + item.snippet.resourceId.videoId
    }));
}