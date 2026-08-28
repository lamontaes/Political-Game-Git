import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import path from "path";
import net from "net";

const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "dev-identified.mjs");

function checkPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(200);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(
  port: number,
  shouldBeOpen: boolean,
  timeoutMs = 10000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isOpen = await checkPortOpen(port);
    if (isOpen === shouldBeOpen) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

describe("dev:identified lifecycle and CLI forwarding", () => {
  it("prints banner and forwards custom arguments like --mode", async () => {
    const port = 5188;
    const child = spawn(
      process.execPath,
      [SCRIPT_PATH, "--port", port.toString(), "--mode", "test-proof-mode"],
      {
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });

    const exitPromise = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) => {
      child.on("exit", (code, signal) => resolve({ code, signal }));
    });

    const isReady = await waitForPort(port, true, 10000);
    expect(isReady).toBe(true);

    expect(output).toContain("POLITICAL GAME DEV SERVER");
    expect(output).toContain("Workspace:");
    expect(output).toContain("Branch:");
    expect(output).toContain("Commit:");
    expect(output).toContain("Host: 127.0.0.1");
    expect(output).toContain(`Requested Port: ${port}`);
    expect(output).toContain("Launcher PID:");
    expect(output).toContain("test-proof-mode");

    child.kill("SIGTERM");
    const isClosed = await waitForPort(port, false, 5000);
    expect(isClosed).toBe(true);

    const { code } = await exitPromise;
    expect(code).toBe(143);
  });

  it("handles --host= and --port= syntax without duplicating arguments", async () => {
    const port = 5194;
    const child = spawn(
      process.execPath,
      [SCRIPT_PATH, `--port=${port}`, "--host=127.0.0.1"],
      {
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    const exitPromise = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) => {
      child.on("exit", (code, signal) => resolve({ code, signal }));
    });

    const isReady = await waitForPort(port, true, 10000);
    expect(isReady).toBe(true);

    expect(output).toContain("Host: 127.0.0.1");
    expect(output).toContain(`Requested Port: ${port}`);

    child.kill("SIGTERM");
    const isClosed = await waitForPort(port, false, 5000);
    expect(isClosed).toBe(true);

    const { code } = await exitPromise;
    expect(code).toBe(143);
  });

  it("terminates cleanly and frees port on SIGTERM to wrapper", async () => {
    const port = 5189;
    const child = spawn(
      process.execPath,
      [SCRIPT_PATH, "--port", port.toString()],
      {
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const exitPromise = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) => {
      child.on("exit", (code, signal) => resolve({ code, signal }));
    });

    const isReady = await waitForPort(port, true, 10000);
    expect(isReady).toBe(true);

    // Send SIGTERM to wrapper
    child.kill("SIGTERM");

    const isClosed = await waitForPort(port, false, 5000);
    expect(isClosed).toBe(true);

    const { code } = await exitPromise;
    expect(code).toBe(143);
  });

  it("terminates cleanly and frees port on SIGINT to wrapper", async () => {
    const port = 5190;
    const child = spawn(
      process.execPath,
      [SCRIPT_PATH, "--port", port.toString()],
      {
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const exitPromise = new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) => {
      child.on("exit", (code, signal) => resolve({ code, signal }));
    });

    const isReady = await waitForPort(port, true, 10000);
    expect(isReady).toBe(true);

    // Send SIGINT to wrapper
    child.kill("SIGINT");

    const isClosed = await waitForPort(port, false, 5000);
    expect(isClosed).toBe(true);

    const { code } = await exitPromise;
    expect(code).toBe(130);
  });

  it("fails with non-zero exit code if requested port is occupied (--strictPort)", async () => {
    const port = 5196;
    const dummyServer = net.createServer();
    await new Promise<void>((resolve) => {
      dummyServer.listen(port, "127.0.0.1", () => resolve());
    });

    const child = spawn(
      process.execPath,
      [SCRIPT_PATH, "--port", port.toString()],
      {
        cwd: REPO_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      child.on("exit", (code) => resolve(code));
    });

    await new Promise<void>((resolve) => {
      dummyServer.close(() => resolve());
    });

    expect(exitCode).not.toBe(0);
    expect(output).toContain(`Port ${port} is already in use`);
  });
});
