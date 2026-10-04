import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, realpathSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const repositoryDirectory = realpathSync(resolve(frontendDirectory, ".."));
const exportDirectory = join(frontendDirectory, ".next-sites");
const deploymentDirectory = join(repositoryDirectory, "out");
const helper = process.argv[2];
const buildArguments = helper
  ? [resolve(helper)]
  : [join(frontendDirectory, "node_modules/next/dist/bin/next"), "build", "--webpack"];

const build = spawnSync(process.execPath, buildArguments, {
  cwd: frontendDirectory,
  env: { ...process.env, SITES_STATIC_EXPORT: "1" },
  stdio: "inherit",
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(join(exportDirectory, "index.html"))) {
  throw new Error("The static export is missing index.html.");
}

// Only replace this repository's generated deployment directory.
if (dirname(deploymentDirectory) !== repositoryDirectory || deploymentDirectory === frontendDirectory) {
  throw new Error("The deployment output must stay within the repository.");
}
if (existsSync(deploymentDirectory) && lstatSync(deploymentDirectory).isSymbolicLink()) {
  throw new Error("The deployment output must not be a symbolic link.");
}
rmSync(deploymentDirectory, { recursive: true, force: true });
cpSync(exportDirectory, deploymentDirectory, { recursive: true, errorOnExist: true, force: false });
console.log("Static Site output prepared in the repository's out/ directory.");
