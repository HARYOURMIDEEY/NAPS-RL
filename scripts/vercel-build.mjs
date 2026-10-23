import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const bin = (name) => `${name}${isWindows ? ".cmd" : ""}`;

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, shell: isWindows });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Optional first-deploy bootstrap, configured entirely through Vercel's UI.
// Enable AUTO_DB_SETUP=true for the first deployment only. It syncs the Prisma
// schema and seeds the first Super Admin/courses when a bootstrap password is
// supplied. Disable AUTO_DB_SETUP and remove INITIAL_SUPER_ADMIN_PASSWORD after
// the first successful deployment. Do not use this switch for routine releases.
if (process.env.AUTO_DB_SETUP === "true") {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error("AUTO_DB_SETUP requires DATABASE_URL and DIRECT_URL in Vercel Environment Variables.");
  }
  run(bin("npx"), ["prisma", "db", "push"]);
  if (process.env.INITIAL_SUPER_ADMIN_PASSWORD) {
    run(bin("npx"), ["prisma", "db", "seed"]);
  } else {
    console.warn("INITIAL_SUPER_ADMIN_PASSWORD is not set; skipping initial Super Admin seed.");
  }
}

run(bin("npx"), ["prisma", "generate"]);
run(bin("npx"), ["next", "build"]);
