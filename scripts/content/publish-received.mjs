/* global process, console */
/** Receiver CLI. Run under the storage guard; does not build, install packages,
 * change source, replace the host, approve artwork, or switch save tracks.
 * Input is a reviewed local delivery record, not a remote executable manifest. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { receiveContent } from "../../desktop/runtime-content.mjs";
import {
  stageReceivedCode,
  publishReceivedChannel,
} from "../../desktop/private-controller/received-channel.mjs";
import { publishSourceRef } from "./source-ref.mjs";
const file = process.argv[2];
if (!file) throw new Error("Usage: publish-received DELIVERY.json [--publish]");
const delivery = JSON.parse(readFileSync(file, "utf8"));
if (delivery.contentInput) {
  const validator = fileURLToPath(
    new URL("./validate-art-snapshot.ts", import.meta.url),
  );
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      validator,
      path.join(
        delivery.contentInput.sourceRoot,
        delivery.contentInput.manifestPath,
      ),
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
}
const content = delivery.contentInput
  ? receiveContent({
      ...delivery.contentInput,
      cacheRoot: delivery.dataRoot + "/content",
    })
  : delivery.content;
const build = delivery.clientDir
  ? stageReceivedCode({ ...delivery, content })
  : { ...delivery.build, content };
const publishing = process.argv.includes("--publish");
// New local code becomes selectable only after its exact source is reachable
// from the matching cloud branch.  Content-only updates reuse an already
// published code revision and therefore do not move a source ref.
const source =
  publishing && delivery.clientDir
    ? publishSourceRef({
        repositoryPath: delivery.repositoryPath ?? process.cwd(),
        track: delivery.track,
        revision: build.revision,
      })
    : null;
const channel = publishing
  ? publishReceivedChannel({ ...delivery, build })
  : null;
console.log(JSON.stringify({ build, content, source, channel }, null, 2));
