#!/usr/bin/env node
/**
 * Set Tauri version from git tag.
 * This script reads the git tag and updates tauri.conf.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeLF(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

const SEMVER_REGEX = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

let version = "0.0.0";

try {
  const tag = execSync("git describe --tags --exact-match", {
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf-8",
  }).trim();
  version = tag.replace(/^v/, "");
} catch {
  try {
    const commit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
    version = `0.0.0-${commit}`;
  } catch {
    version = "0.0.0-dev";
  }
}

if (!SEMVER_REGEX.test(version)) {
  console.error(`Error: Invalid version string "${version}". Defaulting to 0.0.0-dev`);
  version = "0.0.0-dev";
}

const tauriConfigPath = join(__dirname, "../src-tauri/tauri.conf.json");
const config = JSON.parse(readFileSync(tauriConfigPath, "utf-8"));

const cargoTomlPath = join(__dirname, "../src-tauri/Cargo.toml");
let cargoToml = readFileSync(cargoTomlPath, "utf-8");

const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

if (config.version !== version || cargoToml.match(/^version = "([^"]+)"/)?.[1] !== version || packageJson.version !== version) {
  config.version = version;
  writeFileSync(tauriConfigPath, normalizeLF(JSON.stringify(config, null, 2) + "\n"));
  console.log(`Updated tauri.conf.json version to ${version}`);

  cargoToml = cargoToml.replace(/^version = ".*"/m, `version = "${version}"`);
  writeFileSync(cargoTomlPath, normalizeLF(cargoToml));
  console.log(`Updated Cargo.toml version to ${version}`);

  packageJson.version = version;
  writeFileSync(packageJsonPath, normalizeLF(JSON.stringify(packageJson, null, 2) + "\n"));
  console.log(`Updated package.json version to ${version}`);
} else {
  console.log(`Version already ${version}`);
}
