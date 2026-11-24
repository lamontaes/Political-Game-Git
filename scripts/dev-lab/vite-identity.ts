import { readFileSync, realpathSync } from "node:fs";
import type { Plugin } from "vite";
import { sourceIdentity } from "./identity";

/** Public version fields match VERSION-AUTO1's package/revision contract. */
export function publicBuildIdentity(
  root: string,
  identity = sourceIdentity(root),
) {
  const { version } = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
  if (typeof version !== "string")
    throw new Error("Package version is missing");
  return {
    version,
    revision: identity.head,
    revisionShort: identity.head.slice(0, 7),
  };
}

export function identifiedBuild(): Plugin {
  const identity = sourceIdentity();
  const publicIdentity = publicBuildIdentity(identity.workspace, identity);
  const served = {
    ...identity,
    pid: process.pid,
    runId: process.env.PG_RUN_ID ?? null,
  };
  let localReview = false;
  return {
    name: "our-civic-duty-source-identity",
    config: (config, environment) => {
      // An environment variable alone can never put local provenance in a build.
      localReview =
        environment.command === "serve" && process.env.PG_LOCAL_REVIEW === "1";
      return {
        define: {
          __RELEASE_VERSION__:
            config.define?.__RELEASE_VERSION__ ??
            JSON.stringify(publicIdentity.version),
          __BUILD_REVISION__:
            config.define?.__BUILD_REVISION__ ??
            JSON.stringify(publicIdentity.revision),
          __BUILD_REVISION_SHORT__:
            config.define?.__BUILD_REVISION_SHORT__ ??
            JSON.stringify(publicIdentity.revisionShort),
          ...(localReview
            ? { __PG_BUILD_IDENTITY__: JSON.stringify(served) }
            : {}),
        },
      };
    },
    configResolved(config) {
      if (localReview && realpathSync(config.root) !== identity.workspace)
        throw new Error(
          "Vite root differs from identified checkout; launch from the target checkout",
        );
      if (
        localReview &&
        ![undefined, "localhost", "127.0.0.1", "::1"].includes(
          config.server.host as string | undefined,
        )
      )
        throw new Error("Local review provenance requires a loopback host");
    },
    configureServer(server) {
      if (!localReview) return;
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
  };
}
