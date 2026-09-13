import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("install-once Mac delivery uploads only the mode/symlink-preserving archive", () => {
  const workflow = readFileSync(
    fileURLToPath(
      new URL("../../.github/workflows/desktop-package.yml", import.meta.url),
    ),
    "utf8",
  );
  const start = workflow.indexOf(
    "- name: Upload the install-once private Mac archive",
  );
  const end = workflow.indexOf("- name: Upload artifacts", start);
  assert.ok(start >= 0 && end > start);
  const privateUpload = workflow.slice(start, end);
  assert.match(
    privateUpload,
    /runner\.os == 'macOS' && matrix\.profile == 'internal-art-review'/,
  );
  assert.match(privateUpload, /name: private-mac-arm64-art-review/);
  assert.match(privateUpload, /desktop\/controller-release-artifacts\/\*\.zip/);
  assert.match(privateUpload, /SHA256SUMS-private-controller\.txt/);
  assert.match(privateUpload, /if-no-files-found: error/);
  assert.doesNotMatch(
    workflow,
    /desktop\/controller-release-artifacts\/\*(?:\s|$)/,
  );
  assert.doesNotMatch(privateUpload, /\.app|publish:|releases\/|secrets\./);
});
