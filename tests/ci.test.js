#!/usr/bin/env node

import { execSync } from "child_process";
import { exit } from "process";
import chalk from "chalk";

console.log(chalk.blue("[zama](process)") + " Testing CI with act...");
try {
  execSync("act -W .github/workflows/build.yml", { stdio: "inherit" });
  console.log(chalk.green("[zama](success)") + " Complete!");
} catch (error) {
  console.log(
    chalk.red("[zama](failure)") + " CI test failed, stopping process.",
  );
  exit(1);
}
