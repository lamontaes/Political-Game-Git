import assert from "node:assert/strict";
import test from "node:test";

import { hubViewLayout } from "../private-controller/hub-model.mjs";

test("hub layout divides an ordinary window between chrome and content", () => {
  assert.deepEqual(hubViewLayout({ width: 1440, height: 900 }), {
    chrome: { x: 0, y: 0, width: 1440, height: 92 },
    content: { x: 0, y: 92, width: 1440, height: 808 },
  });
});

test("transient negative macOS restoration bounds never reach AppKit", () => {
  assert.deepEqual(hubViewLayout({ width: -17, height: -9 }), {
    chrome: { x: 0, y: 0, width: 0, height: 0 },
    content: { x: 0, y: 0, width: 0, height: 0 },
  });
});

test("a temporarily short window keeps every view inside its content bounds", () => {
  assert.deepEqual(hubViewLayout({ width: 1000.8, height: 40.9 }), {
    chrome: { x: 0, y: 0, width: 1000, height: 40 },
    content: { x: 0, y: 40, width: 1000, height: 0 },
  });
});
