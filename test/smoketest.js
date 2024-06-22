import { execFileSync } from "node:child_process";
import fs from "fs-extra";

async function testYoutube() {
  console.log("Smoketesting Youtube");
  await fs.emptyDir("./test/data");
  await fs.writeJSON("./test/data/dldldl.json", {
    playlists: {
      yt: "https://www.youtube.com/playlist?list=PLdXdcfAFdpNw9LiWa_pqckQnvA7_6km9q",
    },
  });

  execFileSync("node", ["./src/cli.js", "./test/data"]);
}
async function testSoundcloud() {
  console.log("Smoketesting Soundcloud");
  await fs.emptyDir("./test/data");
  await fs.writeJSON("./test/data/dldldl.json", {
    playlists: {
      sc: "https://soundcloud.com/user999999998/sets/foo",
    },
  });

  execFileSync("node", ["./src/cli.js", "./test/data"]);
}

async function test() {
  await testYoutube();
  await testSoundcloud();
}

test()
  .then(() => console.log("Success"))
  .catch((err) => {
    console.log(err);
    process.exit(-1);
  });
