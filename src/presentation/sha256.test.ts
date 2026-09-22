import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { sha256Text } from "./sha256";
it("matches SHA-256 for empty, standard, UTF-8 and multi-block profile bytes", () => {
  for (const text of [
    "",
    "abc",
    "é🧩",
    "a".repeat(100000),
    JSON.stringify({
      schema: "modular-body-profile-v1",
      poses: { standing: { x: 2.75 } },
    }),
  ])
    expect(sha256Text(text)).toBe(
      createHash("sha256").update(text).digest("hex"),
    );
});
