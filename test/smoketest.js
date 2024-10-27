import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs/promises";
import * as yaml from "yaml";

async function testYoutube() {
  console.log("Smoketesting Youtube");
  execSync("rm -rf ./test/data && mkdir -p ./test/data");

  const cfg = {
    playlists: [
      {
        name: 'yt',
        url: "https://www.youtube.com/playlist?list=PLdXdcfAFdpNw9LiWa_pqckQnvA7_6km9q",
        path: "./yt",
      },
    ],
  };

  await fs.writeFile("./test/data/dldldl.yml", yaml.stringify(cfg));

  execFileSync("node", [
    "--experimental-transform-types",
    "./src/cli.ts",
    "./test/data",
  ]);
}
async function testSoundcloud() {
  console.log("Smoketesting Soundcloud");
  execSync("rm -rf ./test/data && mkdir -p ./test/data");

  const cfg = {
    playlists: [
      {
        name: 'sc',
        url: "https://soundcloud.com/user999999998/sets/foo",
        path: "./sc",
      },
    ],
  };

  await fs.writeFile("./test/data/dldldl.yml", yaml.stringify(cfg));

  execFileSync("node", [
    "--experimental-transform-types",
    "./src/cli.ts",
    "./test/data",
  ]);
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
