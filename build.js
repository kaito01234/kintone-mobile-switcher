#!/usr/bin/env node
const esbuild = require("esbuild");
const fs = require("fs-extra");
const path = require("path");

async function build() {
  const isWatch = process.argv.includes("--watch");

  // Clean dist directory
  await fs.emptyDir("dist");

  // Build TypeScript
  const buildOptions = {
    entryPoints: ["src/background.ts"],
    bundle: true,
    outdir: "dist",
    platform: "browser",
    target: "chrome100",
    format: "iife",
    sourcemap: process.env.NODE_ENV !== "production",
    minify: process.env.NODE_ENV === "production",
    logLevel: "info",
  };

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
  }

  // Copy static files
  await fs.copy("src/manifest.json", "dist/manifest.json");
  await fs.copy("icon", "dist", { filter: (src) => src.endsWith(".png") || fs.lstatSync(src).isDirectory() });

  console.log("Build complete!");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});