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

// Get git tag (remove 'v' prefix if present)
let version = "0.0.0";
try {
  const tag = execSync("git describe --tags --exact-match 2>/dev/null || echo", {
    encoding: "utf-8",
  }).trim();
  if (tag) {
    version = tag.replace(/^v/, "");
  } else {
    // Fallback to commit hash if no tag
    const commit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
    version = `0.0.0-${commit}`;
  }
} catch {
  // Use default if git fails
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
  writeFileSync(tauriConfigPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`Updated tauri.conf.json version to ${version}`);

  cargoToml = cargoToml.replace(/^version = ".*"/m, `version = "${version}"`);
  writeFileSync(cargoTomlPath, cargoToml);
  console.log(`Updated Cargo.toml version to ${version}`);

  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  console.log(`Updated package.json version to ${version}`);
} else {
  console.log(`Version already ${version}`);
}
