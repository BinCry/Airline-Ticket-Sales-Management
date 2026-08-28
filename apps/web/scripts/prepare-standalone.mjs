import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = process.env.NEXT_DIST_DIR ?? ".next";
const nextRoot = path.join(appRoot, distDir);
const standaloneAppRoot = path.join(nextRoot, "standalone", "apps", "web");

await mkdir(standaloneAppRoot, { recursive: true });
await cp(path.join(appRoot, "public"), path.join(standaloneAppRoot, "public"), {
  recursive: true,
  force: true
});
await cp(
  path.join(nextRoot, "static"),
  path.join(standaloneAppRoot, distDir, "static"),
  { recursive: true, force: true }
);

console.log(`Đã chuẩn bị public và ${distDir}/static cho standalone server.`);
