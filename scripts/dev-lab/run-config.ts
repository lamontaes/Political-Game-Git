import { randomUUID } from "node:crypto";
import { resolve, relative, isAbsolute } from "node:path";

export function runConfig(env = process.env, root = process.cwd()) {
  const port = Number(env.PLAYWRIGHT_PORT ?? env.PG_PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid server port");
  const baseURL = env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
  const url = new URL(baseURL);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.protocol !== "http:" ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Test server must be a local HTTP origin");
  if (Number(url.port || 80) !== port)
    throw new Error("Base URL and configured port disagree");
  const runId = env.PG_RUN_ID ?? randomUUID();
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Invalid run ID");
  const artifacts = resolve(
    env.PG_ARTIFACTS_DIR ?? resolve(root, "test-results", "runs"),
    runId,
  );
  const rel = relative(root, artifacts);
  // Inside a checkout all run output belongs under the ignored test-results
  // tree. External artifact parents are supported; history/baselines are not.
  if (
    !rel.startsWith("..") &&
    !isAbsolute(rel) &&
    !rel.startsWith(`test-results/`)
  )
    throw new Error(
      "Run artifacts inside a checkout must be under test-results",
    );
  const workers = Number(env.PLAYWRIGHT_WORKERS ?? 1);
  if (!Number.isInteger(workers) || workers < 1 || workers > 2)
    throw new Error("Browser workers must be 1 or 2; sequence heavy suites");
  return {
    port,
    baseURL: url.origin,
    host: url.hostname.replace(/^\[|\]$/g, ""),
    runId,
    artifacts,
    workers,
  };
}
