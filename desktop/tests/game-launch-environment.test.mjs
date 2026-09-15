import assert from "node:assert/strict";
import test from "node:test";
import { isPackagedRenderRequest } from "../scripts/game-launch-environment.mjs";

test("native prepared blobs are local; external and lookalike origins remain refused", () => {
  assert.equal(isPackagedRenderRequest("app://game/assets/source.svg"), true);
  assert.equal(isPackagedRenderRequest("blob:app://game/local-variant"), true);
  for (const url of [
    "https://example.com/image.svg",
    "app://game.evil/image",
    "blob:https://example.com/id",
    "file:///tmp/image",
    "blob:null/id",
  ])
    assert.equal(isPackagedRenderRequest(url), false, url);
});
import { gameLaunchEnvironment } from "../scripts/game-launch-environment.mjs";

test("controller health check launches a GUI game, not its Node worker mode", () => {
  const input = {
    ELECTRON_RUN_AS_NODE: "1",
    PATH: "/bin",
    OCD_EXPECT_ART_PREVIEW: "1",
  };
  const output = gameLaunchEnvironment(input, "/isolated/profile");
  assert.equal(output.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(output.OCD_USER_DATA_DIR, "/isolated/profile");
  assert.equal(output.OCD_EXPECT_ART_PREVIEW, "1");
  assert.equal(output.PATH, "/bin");
  assert.equal(input.ELECTRON_RUN_AS_NODE, "1");
});
