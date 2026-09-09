import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  copyFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import { it, expect } from "vitest";
import verifyServer from "./verify-server";
import type { FullConfig } from "@playwright/test";
import { sourceIdentity, assertIdentity } from "./identity";

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
    child.kill("SIGTERM");
  });
}
async function identityAt(port: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/__dev/identity`);
      if (response.ok) return await response.json();
    } catch {
      /* Startup has not bound the owned port yet. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Owned server did not start on ${port}`);
}

it("two isolated checkouts identify distinct sources, reject mismatches and clean only their own server", async () => {
  const parent = mkdtempSync(join(tmpdir(), "dev-lab-servers-"));
  const children: ChildProcess[] = [];
  const roots: string[] = [];
  const ports: number[] = [];
  try {
    for (const label of ["first", "second"]) {
      const root = mkdtempSync(join(parent, label));
      roots.push(root);
      symlinkSync(resolve("node_modules"), join(root, "node_modules"));
      writeFileSync(join(root, ".gitignore"), "node_modules/\n.cache/\n");
      writeFileSync(join(root, "package.json"), '{"type":"module"}');
      writeFileSync(join(root, "index.html"), `<h1>${label} checkout</h1>`);
      for (const file of ["identity.ts", "vite-identity.ts"])
        copyFileSync(resolve("scripts/dev-lab", file), join(root, file));
      writeFileSync(
        join(root, "vite.config.ts"),
        'import { identifiedBuild } from "./vite-identity.ts"; export default {cacheDir:".cache",plugins:[identifiedBuild()]};',
      );
      const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: root, stdio: "pipe" });
      git("init");
      git("config", "user.name", "Harness test");
      git("config", "user.email", "test@example.invalid");
      git("add", ".");
      git("commit", "-m", label);
      const port = await freePort();
      ports.push(port);
      const child = spawn(
        process.execPath,
        [resolve("scripts/dev-identified.mjs"), "--port", String(port)],
        { cwd: root, stdio: "pipe" },
      );
      children.push(child);
      let log = "";
      child.stdout?.on("data", (data) => {
        log += data;
      });
      child.stderr?.on("data", (data) => {
        log += data;
      });
      const actual = await identityAt(port).catch((error) => {
        throw new Error(`${error}\n${log}`);
      });
      assertIdentity(sourceIdentity(root), actual);
      expect(actual.pid).not.toBe(child.pid); // Identity belongs to Vite, not a guessed launcher PID.
      if (process.platform === "darwin") {
        const cwd = execFileSync(
          "lsof",
          ["-a", "-p", String(actual.pid), "-d", "cwd", "-Fn"],
          { encoding: "utf8" },
        );
        expect(cwd).toContain(root);
        const listener = execFileSync(
          "lsof",
          [
            "-a",
            "-p",
            String(actual.pid),
            "-iTCP:" + port,
            "-sTCP:LISTEN",
            "-Fn",
          ],
          { encoding: "utf8" },
        );
        expect(listener).toContain(String(port));
      }
    }
    const first = await identityAt(ports[0]!);
    const second = await identityAt(ports[1]!);
    expect(first.head).not.toBe(second.head);
    await expect(
      verifyServer({
        metadata: {
          expectedIdentity: first,
          artifacts: join(parent, "mismatch-proof"),
        },
        projects: [{ use: { baseURL: `http://127.0.0.1:${ports[1]}` } }],
      } as unknown as FullConfig),
    ).rejects.toThrow("Served checkout mismatch");
    expect(() => assertIdentity(first, second)).toThrow("workspace");
    writeFileSync(join(roots[0]!, "index.html"), "changed after startup");
    expect(
      (await fetch(`http://127.0.0.1:${ports[0]}/__dev/identity`)).status,
    ).toBe(409);
    await stop(children[0]!);
    expect(await identityAt(ports[1]!)).toEqual(second);
    await expect(
      fetch(`http://127.0.0.1:${ports[0]}/__dev/identity`),
    ).rejects.toThrow();
  } finally {
    for (const child of children) await stop(child);
    rmSync(parent, { recursive: true, force: true });
  }
}, 30_000);
