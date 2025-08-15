#!/usr/bin/env node

import { execSync } from "node:child_process";
import { exit } from "node:process";
import chalk from "chalk";

console.log(`${chalk.blue("[zama](process)")} Building Tauri app...`);
try {
  execSync("bun run tauri build", { stdio: "inherit" });
  console.log(`${chalk.green("[zama](success)")} Complete!`);
  console.log(`${chalk.blue("[zama](process)")} Cleaning up...`);
  execSync("cargo clean", { cwd: "src-tauri", stdio: "inherit" });
} catch (_error) {
  console.log(
    `${chalk.red("[zama](failure)")} Build failed, stopping process.`,
  );
  exit(1);
}
