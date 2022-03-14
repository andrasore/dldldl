dldldl
======

**dldldl** is a simple node utility for syncing your music playlists on various
sites onto your hard drive. Currently it supports YouTube.

It is similar to https://github.com/alltomp3/alltomp3-app, except
**dldldl** is focused on syncing playlists incrementally. Currently it only
has ffmpeg-static as a native dependency.

Usage
-----

Run `npm run build` and `npm link` since it is not published yet to npm.
For `npm link` you may need `sudo` on Linux based systems.
Start with `dldldl <library path>`.

Configuration
-------------

Pick a folder for storing the music library.

A config JSON file is required into the libary folder, called
`<library path>/dldldl.json`.

The config JSON file should have a "playlists" field with the playlist names and
URLs listed as key-value pairs.

The playlist names are arbitrary, and are also used as folder names for downloading music.

Example:

```
  {
    "playlists": {
      "MyPlaylistName1": "https://youtube.com/playlist?list=<playlist url>",
      "MyPlaylistName2": "https://youtube.com/playlist?list=<playlist url>"
    }
  }
```

This will result in the following folder structure:

```
  <libarary path>/MyPlaylistName1/...
  <libarary path>/MyPlaylistName2/...
```