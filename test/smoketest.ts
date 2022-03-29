import * as execa from 'execa'
import fs from 'fs-extra'

// These smoke tests ensure that the basic download functionality is working on
// all sites

describe('Test Youtube', function () {
  it('should download a song from a test playlist', async function () {
    await fs.emptyDir('./test/data')
    await fs.writeJSON('./test/data/dldldl.json', {
      playlists: {
        yt: 'https://www.youtube.com/playlist?list=PLdXdcfAFdpNw9LiWa_pqckQnvA7_6km9q'
      }
    })

    execa.sync('node', ['./lib/src/cli.js', './test/data'])
  })
})

describe('Test Soundcloud', function () {
  it('should download a song from a test playlist', async function () {
    await fs.emptyDir('./test/data')
    await fs.writeJSON('./test/data/dldldl.json', {
      playlists: {
        sc: 'https://soundcloud.com/user999999998/sets/foo'
      }
    })

    execa.sync('node', ['./lib/src/cli.js', './test/data'])
  })
})
