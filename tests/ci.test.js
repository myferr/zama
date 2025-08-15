#!/usr/bin/env node

import { execSync } from "node:child_process";
import { exit } from "node:process";
import chalk from "chalk";

console.log(`${chalk.blue("[zama](process)")} Testing CI with act...`);
try {
  execSync("act -W .github/workflows/build.yml", { stdio: "inherit" });
  execSync("act -W .github/workflows/biome.yml", { stdio: "inherit" });
  console.log(`${chalk.green("[zama](success)")} Complete!`);
} catch (_error) {
  console.log(
    `${chalk.red("[zama](failure)")} CI test failed, stopping process.`,
  );
  exit(1);
}
