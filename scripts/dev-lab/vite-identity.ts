import { realpathSync } from "node:fs";
import type { Plugin } from "vite";
import { sourceIdentity } from "./identity";

export function identifiedBuild(): Plugin {
  const identity = sourceIdentity();
  const served = {
    ...identity,
    pid: process.pid,
    runId: process.env.PG_RUN_ID ?? null,
  };
  return {
    name: "our-civic-duty-source-identity",
    config: () => ({
      define: { __PG_BUILD_IDENTITY__: JSON.stringify(served) },
    }),
    configResolved(config) {
      if (realpathSync(config.root) !== identity.workspace)
        throw new Error(
          "Vite root differs from identified checkout; launch from the target checkout",
        );
    },
    configureServer(server) {
      server.middlewares.use("/__dev/identity", (_request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        const current = sourceIdentity(identity.workspace);
        if (
          current.head !== identity.head ||
          current.branch !== identity.branch ||
          current.sourceDigest !== identity.sourceDigest
        ) {
          response.statusCode = 409;
          response.end(
            JSON.stringify({
              error: "Served source changed; restart before collecting proof",
              startup: served,
              current,
            }),
          );
          return;
        }
        response.end(JSON.stringify(served));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-identity.json",
        source: JSON.stringify(served, null, 2),
      });
    },
  };
}
