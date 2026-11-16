// Read the content into a static snapshot as part of the build.
//
// `tinacms build --local` starts a local Tina GraphQL server before it runs
// the build command, so by the time this plugin's buildStart hook runs the
// content is indexed and queryable on http://localhost:4001/graphql.

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
// This plugin lives in the repository root, alongside vite.config.ts.
const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** A Vite plugin that snapshots the content before the bundle is built. */
export function contentSnapshot() {
  let isBuild = false;
  return {
    name: "racps-content-snapshot",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    async buildStart() {
      if (!isBuild) return;
      const script = path.join(ROOT, "scripts", "snapshot_content.mjs");
      try {
        const { stdout } = await execFileAsync(process.execPath, [script], {
          cwd: ROOT,
          env: process.env,
        });
        const line = stdout.trim().split("\n").pop();
        if (line) this.info(line);
      } catch (error) {
        this.error(
          `Could not snapshot the content: ${error.message}\n` +
            "Is the local Tina GraphQL server running on port 4001? " +
            "It is started by `tinacms build --local`.",
        );
      }
    },
  };
}
