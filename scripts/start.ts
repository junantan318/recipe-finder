// One-command start: installs dependencies if missing, rebuilds only when the code changed,
// starts the app and opens it in the browser. Used by `npm run app` and "Recipe Box.bat".
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const port = process.env.PORT ?? "3000";
const url = `http://127.0.0.1:${port}`;
const shell = process.platform === "win32";

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function newestChange(p: string): number {
  const s = statSync(p);
  if (!s.isDirectory()) return s.mtimeMs;
  return Math.max(0, ...readdirSync(p).map((f) => newestChange(path.join(p, f))));
}

if (!existsSync(path.join(root, "node_modules"))) {
  console.log("Installing dependencies (first run only)…");
  run("npm", ["install"]);
}

const buildId = path.join(root, ".next", "BUILD_ID");
const sources = ["src", "package.json", "next.config.ts", "tailwind.config.ts"].map((p) => path.join(root, p));
if (!existsSync(buildId) || Math.max(...sources.map(newestChange)) > statSync(buildId).mtimeMs) {
  console.log("Building the app (only when the code has changed)…");
  run("npm", ["run", "build"]);
}

const server = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", port], { cwd: root, stdio: "inherit", shell });

// Open the browser once the server answers.
const started = Date.now();
const timer = setInterval(async () => {
  try {
    await fetch(url);
    clearInterval(timer);
    console.log(`\nRecipe Box is running at ${url} — close this window to stop it.\n`);
    if (process.env.RECIPE_BOX_NO_OPEN) return;
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true });
    else spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore", detached: true });
  } catch {
    if (Date.now() - started > 60000) clearInterval(timer);
  }
}, 500);

server.on("exit", (code) => process.exit(code ?? 0));
