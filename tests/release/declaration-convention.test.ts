/**
 * The convention every agent is asked to follow, and what it refuses.
 *
 * A declaration format is only worth having if a wrong one fails loudly at
 * `npm run validate` rather than quietly reaching a player-facing document.
 */

import { describe, expect, it } from "vitest";
import {
  DeclarationError,
  parseDeclaration,
} from "../../scripts/release/declarations";

const where = "docs/release/changes/example.md";

function parse(text: string) {
  return parseDeclaration(text, where, "example");
}

describe("a well-formed declaration", () => {
  it("carries an impact, a section, a title and player prose", () => {
    const declaration = parse(
      `---\nid: example\nimpact: minor\nsection: Added\ntitle: You can do a new thing.\n---\n\nThe new thing, described the way a public update would describe it.\n`,
    );
    expect(declaration).toMatchObject({
      id: "example",
      impact: "minor",
      section: "Added",
      title: "You can do a new thing.",
    });
    expect(declaration.body).toContain("public update");
  });

  it("says 'nothing to tell a player' out loud", () => {
    const declaration = parse(
      `---\nid: example\nimpact: none\n---\n\nParser change; no player-visible effect.\n`,
    );
    expect(declaration.impact).toBe("none");
    expect(declaration.section).toBeUndefined();
  });
});

describe("a malformed declaration is refused", () => {
  const cases: readonly (readonly [string, string, RegExp])[] = [
    [
      "no header",
      `id: example\nimpact: none\n`,
      /must begin with a '---' header delimiter/,
    ],
    [
      "unknown impact",
      `---\nid: example\nimpact: major\n---\n\nBody.\n`,
      /impact 'major' must be one of/,
    ],
    [
      "id that does not match its filename",
      `---\nid: other\nimpact: none\n---\n\nBody.\n`,
      /does not match its filename stem/,
    ],
    [
      "player impact with no section",
      `---\nid: example\nimpact: patch\ntitle: A fix.\n---\n\nBody.\n`,
      /missing 'section'/,
    ],
    [
      "no-player-change carrying a section",
      `---\nid: example\nimpact: none\nsection: Added\n---\n\nBody.\n`,
      /must not carry 'section' or 'title'/,
    ],
    [
      "an empty body",
      `---\nid: example\nimpact: none\n---\n\n`,
      /still needs a one-line reason/,
    ],
    [
      "an unknown header key",
      `---\nid: example\nimpact: none\nurgency: high\n---\n\nBody.\n`,
      /unknown header key 'urgency'/,
    ],
  ];

  for (const [name, text, message] of cases) {
    it(name, () => {
      expect(() => parse(text)).toThrow(DeclarationError);
      expect(() => parse(text)).toThrow(message);
    });
  }
});

describe("repository bookkeeping never reaches player prose", () => {
  const bookkeeping: readonly (readonly [string, string])[] = [
    ["a commit hash", "Fixed in da939329fcc3ae0a2eb9db8016665738b40733d4."],
    ["a pull request number", "Landed with #133."],
    ["a branch name", "See claude/some-branch for the detail."],
    ["a packet identifier", "Completes the packet's scope."],
    ["a corpus reference", "Regenerated the prose corpus."],
    ["CI bookkeeping", "Green in CI."],
    ["merge bookkeeping", "Merged after review."],
  ];

  for (const [name, body] of bookkeeping) {
    it(`refuses ${name}`, () => {
      expect(() =>
        parse(
          `---\nid: example\nimpact: patch\nsection: Fixed\ntitle: A fix.\n---\n\n${body}\n`,
        ),
      ).toThrow(/does not belong|belong in the traceability ledger/);
    });
  }

  it("checks the title as well as the body", () => {
    expect(() =>
      parse(
        `---\nid: example\nimpact: patch\nsection: Fixed\ntitle: Fixes #133.\n---\n\nOrdinary prose.\n`,
      ),
    ).toThrow(/pull request or issue number/);
  });
});
