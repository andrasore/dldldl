# dldldl

![CI](https://github.com/andrasore/dldldl/actions/workflows/node.js.yml/badge.svg)

**dldldl** is a simple node utility for syncing your online music playlists to
your computer. Currently it supports YouTube and Soundcloud.

## Usage

Start with `npm run start <library path>`.

## Configuration

Pick a folder for storing the music library.

A config YML file is required into the libary folder, called
`<library path>/dldldl.yml` or `<library path>/dldldl.yaml`.

Config example:

```
  playlists:
    - name: MyPlaylist1
      url: "https://youtube.com/playlist?list=<playlist id>"
      path: "./MyPlaylist1"
    - name: MyPlaylist2
      url: "https://soundcloud.com/user/<user>/sets/<playlist name>"
      path: "./MyPlaylist2"
```

This will result in the following folder structure:

```
  <libarary path>/MyPlaylist1/...
  <libarary path>/MyPlaylist2/...
```

## Music library

The tracks are downloaded into separate folders, as seen above. The tracks are
identified by their filenames. Renaming the files will result in downloading
them again.

The filename based identification has some advantages. For scanning a music
library we only have to read file paths, which is very fast. No DB is built
from file metadata, etc.

The folder structure can be modified freely, so you can organize the tracks
however you want. New tracks will always be downloaded into the playlist's
original folders.

## Spotify

Supporting Spotify is a non-goal because AFAIK there are no libraries to extract
music from it. The working solutions are _very_ hacky, e.g. one application I saw
started an actual Spotify client to do the job.

## Similar software

- [AllToMP3](https://github.com/alltomp3/alltomp3-app) is a desktop app for downloading playlists.
- [youtube-dl](https://github.com/ytdl-org/youtube-dl) is a command line
  application for downloading videos from Youtube. The project also provides the
  fine [https://www.npmjs.com/package/ytdl-core](ytdl-core) library, which is also used in this project.
- [https://pypi.org/project/soundcloud-dl/](soundcloud-dl) is a Python program for getting Soundcloud playlists.
