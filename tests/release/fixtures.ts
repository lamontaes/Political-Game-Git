/**
 * Synthetic repositories for the release tests.
 *
 * The updater is driven against real trees rather than mocks, because the
 * properties under test — nothing half-written, accepted history untouched, a
 * replayed event doing nothing — are properties of files.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangeDeclaration } from "../../scripts/release/model";

export const FIXTURE_NOTES = `# Our Civic Duty — Patch Notes

Newest release first.

## UNRELEASED — Hand-written pending work

Written under the older convention and left exactly where its author put it.

## PRE-ALPHA 0.3.0 — "A Life, Not a Fixture" — CANDIDATE, NOT YET ACCEPTED

_Proposed. The number is a candidate until somebody accepts it._

## PRE-ALPHA 0.2.0 — "The Bill Becomes Law"

You can now actually legislate.

## PRE-ALPHA 0.1.0

The first playable build.
`;

export interface FixtureOptions {
  readonly version?: string;
  readonly notes?: string;
  /** Declaration file bodies, keyed by filename stem. */
  readonly declarations?: Readonly<Record<string, string>>;
  readonly ledger?: string;
  /** Omit `docs/release/changes/` entirely, as a pre-convention branch would. */
  readonly withoutChangesDir?: boolean;
  /**
   * Make the fixture a real repository with one commit.
   *
   * The CLI dates a release from the revision it describes rather than from the
   * wall clock, so anything driving the CLI end to end needs a revision to read.
   */
  readonly asRepository?: boolean;
}

export interface Fixture {
  readonly root: string;
  dispose(): void;
}

export function declarationText(
  fields: Partial<ChangeDeclaration> & { readonly id: string },
): string {
  const header = [`id: ${fields.id}`, `impact: ${fields.impact ?? "none"}`];
  if (fields.section) header.push(`section: ${fields.section}`);
  if (fields.title) header.push(`title: ${fields.title}`);
  return `---\n${header.join("\n")}\n---\n\n${fields.body ?? "An internal reason."}\n`;
}

export function makeFixture(options: FixtureOptions = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "release-fixture-"));
  const version = options.version ?? "0.2.0";
  writeFileSync(
    join(root, "package.json"),
    `{\n  "name": "our-civic-duty",\n  "private": true,\n  "version": "${version}",\n  "type": "module"\n}\n`,
  );
  writeFileSync(
    join(root, "package-lock.json"),
    `{\n  "name": "our-civic-duty",\n  "version": "${version}",\n  "lockfileVersion": 3,\n  "packages": {\n    "": {\n      "name": "our-civic-duty",\n      "version": "${version}"\n    },\n    "node_modules/unrelated": {\n      "version": "${version}"\n    }\n  }\n}\n`,
  );
  writeFileSync(join(root, "PATCH_NOTES.md"), options.notes ?? FIXTURE_NOTES);
  mkdirSync(join(root, "docs", "release"), { recursive: true });
  writeFileSync(
    join(root, "docs", "release", "consumed-changes.json"),
    options.ledger ?? '{\n  "entries": []\n}\n',
  );
  if (!options.withoutChangesDir) {
    const dir = join(root, "docs", "release", "changes");
    mkdirSync(dir, { recursive: true });
    for (const [stem, text] of Object.entries(options.declarations ?? {})) {
      writeFileSync(join(dir, `${stem}.md`), text);
    }
  }
  if (options.asRepository) {
    const run = (...args: string[]): void => {
      execFileSync("git", args, { cwd: root, stdio: "ignore" });
    };
    run("init", "-q", "-b", "main");
    run("config", "user.email", "fixture@example.invalid");
    run("config", "user.name", "Fixture");
    run("add", "-A");
    run(
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-q",
      "-m",
      "Fixture tree",
      "--date=2026-09-08T00:00:00Z",
    );
  }
  return {
    root,
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}
