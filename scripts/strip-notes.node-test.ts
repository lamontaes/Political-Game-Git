import assert from "node:assert/strict";
import test from "node:test";
import { stripFile } from "./strip-notes";

test("preserves code strings, explanations, markers and line count", () => {
  const before = [
    'const text = "Owner ruled Nov 26";',
    "// Keep the existing range (owner said Nov 26). SG-range",
    "// Use the whole value.",
    "const result = 17;",
  ].join("\n");
  const result = stripFile("src/sample.ts", before);
  assert.equal(result.removed.length, 1);
  assert.match(result.output, /Keep the existing range.*SG-range/);
  assert.match(result.output, /Use the whole value/);
  assert.equal(result.output.split("\n").length, before.split("\n").length);
  assert.equal(result.output.split("\n")[0], before.split("\n")[0]);
  assert.ok(result.output.endsWith("const result = 17;"));
  assert.deepEqual(stripFile("src/sample.ts", result.output).removed, []);
  assert.equal(stripFile("src/sample.test.ts", before).output, before);
});

test("drops provenance from a block without removing its prose or stopgap", () => {
  const before = "/**\n * This buffers adjacent entries (CTO Nov 26).\n * stopgap(buffer)\n */\nexport const buffered = true;\n";
  const { output } = stripFile("src/sample.ts", before);
  assert.match(output, /This buffers adjacent entries/);
  assert.match(output, /stopgap\(buffer\)/);
  assert.doesNotMatch(output, /CTO|Nov 26/);
  assert.equal(output.split("\n").length, before.split("\n").length);
});
