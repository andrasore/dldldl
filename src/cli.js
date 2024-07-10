#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { executeDldldl } from "./execution.js";

const program = new Command();

program
  .name("dldldl")
  .description("A music playlist syncing utility")
  .version(packageJson.version)
  .argument("<library path>");

program.parse();

const workingDir = path.resolve(program.processedArgs[0]);

executeDldldl(workingDir).then(() => process.exit());
