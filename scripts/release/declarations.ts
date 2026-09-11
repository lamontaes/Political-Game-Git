/**
 * The one repository-native change-declaration convention.
 *
 * A branch that changes what a player sees drops one file in
 * `docs/release/changes/`. Two branches never edit the same file, so the
 * declarations merge cleanly; the release consumes them into `PATCH_NOTES.md`
 * and deletes them, so they never become a second permanent changelog.
 *
 * The format is deliberately smaller than YAML — a delimited header of
 * `key: value` lines and a prose body — because a hand-written convention that
 * needs a parser dependency is a convention agents will get wrong.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import type { ChangeDeclaration, ChangeImpact, NoteSection } from "./model";
import { NOTE_SECTIONS } from "./model";

/** Where declarations wait to be released. */
export const CHANGES_DIR = join("docs", "release", "changes");

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MAX_ID_LENGTH = 80;
const MAX_TITLE_LENGTH = 140;

const IMPACTS: readonly ChangeImpact[] = ["none", "patch", "minor"];

/**
 * Bookkeeping that does not belong in prose a player reads.
 *
 * Patch notes are for the audience of the game, not the audience of the
 * repository. This list is deliberately short and literal: it catches the
 * failure that actually happens — an agent pasting its own audit identifiers,
 * branch name or commit hash into the player note — without trying to police
 * writing style.
 */
const FORBIDDEN_PROSE: readonly {
  readonly pattern: RegExp;
  readonly why: string;
}[] = [
  { pattern: /\b[0-9a-f]{7,40}\b/, why: "a commit hash" },
  { pattern: /#\d+/, why: "a pull request or issue number" },
  { pattern: /\b(?:claude|codex)\//i, why: "a branch name" },
  { pattern: /\bPR\b/, why: "pull-request bookkeeping" },
  { pattern: /\bCI\b/, why: "CI bookkeeping" },
  { pattern: /\bpacket\b/i, why: "an internal packet identifier" },
  { pattern: /\bcorpus\b/i, why: "an internal corpus reference" },
  { pattern: /\bmerge[ds]?\b/i, why: "merge bookkeeping" },
];

export class DeclarationError extends Error {}

interface RawDeclaration {
  readonly header: ReadonlyMap<string, string>;
  readonly body: string;
}

/** Split `---`-delimited header lines from the prose body. */
function splitFragment(text: string, where: string): RawDeclaration {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---") {
    throw new DeclarationError(
      `${where}: must begin with a '---' header delimiter.`,
    );
  }
  const closing = lines.indexOf("---", 1);
  if (closing === -1) {
    throw new DeclarationError(`${where}: header is never closed with '---'.`);
  }
  const header = new Map<string, string>();
  for (let index = 1; index < closing; index++) {
    const line = lines[index] ?? "";
    if (line.trim() === "") continue;
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new DeclarationError(
        `${where}: header line ${index + 1} is not 'key: value'.`,
      );
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (header.has(key)) {
      throw new DeclarationError(`${where}: duplicate header key '${key}'.`);
    }
    header.set(key, value);
  }
  return {
    header,
    body: lines
      .slice(closing + 1)
      .join("\n")
      .trim(),
  };
}

function requireKnownKeys(
  header: ReadonlyMap<string, string>,
  where: string,
): void {
  const allowed = new Set(["id", "impact", "section", "title"]);
  for (const key of header.keys()) {
    if (!allowed.has(key)) {
      throw new DeclarationError(
        `${where}: unknown header key '${key}'. Allowed: id, impact, section, title.`,
      );
    }
  }
}

function assertProseIsPlayerFacing(body: string, where: string): void {
  for (const { pattern, why } of FORBIDDEN_PROSE) {
    const match = pattern.exec(body);
    if (match) {
      throw new DeclarationError(
        `${where}: player-facing prose contains ${why} ("${match[0]}"). ` +
          `Internal identifiers belong in the traceability ledger, not in patch notes.`,
      );
    }
  }
}

/**
 * Parse one declaration.
 *
 * `expectedId` is the filename stem when the fragment came from disk; the id
 * and the filename must agree so a fragment can be found from a ledger entry.
 */
export function parseDeclaration(
  text: string,
  where: string,
  expectedId?: string,
): ChangeDeclaration {
  const { header, body } = splitFragment(text, where);
  requireKnownKeys(header, where);

  const id = header.get("id");
  if (!id) throw new DeclarationError(`${where}: missing 'id'.`);
  if (!ID_PATTERN.test(id) || id.length > MAX_ID_LENGTH) {
    throw new DeclarationError(
      `${where}: id '${id}' must be lowercase kebab-case, at most ${MAX_ID_LENGTH} characters.`,
    );
  }
  if (expectedId !== undefined && id !== expectedId) {
    throw new DeclarationError(
      `${where}: id '${id}' does not match its filename stem '${expectedId}'.`,
    );
  }

  const impactValue = header.get("impact");
  if (!impactValue) throw new DeclarationError(`${where}: missing 'impact'.`);
  if (!IMPACTS.includes(impactValue as ChangeImpact)) {
    throw new DeclarationError(
      `${where}: impact '${impactValue}' must be one of ${IMPACTS.join(", ")}.`,
    );
  }
  const impact = impactValue as ChangeImpact;

  const section = header.get("section");
  const title = header.get("title");

  if (body === "") {
    throw new DeclarationError(
      impact === "none"
        ? `${where}: an impact:none declaration still needs a one-line reason in its body.`
        : `${where}: missing player-facing prose body.`,
    );
  }

  if (impact === "none") {
    if (section !== undefined || title !== undefined) {
      throw new DeclarationError(
        `${where}: impact:none must not carry 'section' or 'title'. ` +
          `A change with no player-visible effect gets no patch note.`,
      );
    }
    return { id, impact, body, path: where };
  }

  if (!section) throw new DeclarationError(`${where}: missing 'section'.`);
  if (!NOTE_SECTIONS.includes(section as NoteSection)) {
    throw new DeclarationError(
      `${where}: section '${section}' must be one of ${NOTE_SECTIONS.join(", ")}.`,
    );
  }
  if (!title) throw new DeclarationError(`${where}: missing 'title'.`);
  if (title.length > MAX_TITLE_LENGTH) {
    throw new DeclarationError(
      `${where}: title is longer than ${MAX_TITLE_LENGTH} characters.`,
    );
  }
  assertProseIsPlayerFacing(`${title}\n${body}`, where);

  return {
    id,
    impact,
    section: section as NoteSection,
    title,
    body,
    path: where,
  };
}

/**
 * Every pending declaration, in deterministic id order.
 *
 * A missing directory is not an error: a checkout that predates this convention
 * has nothing to declare, and failing there would retroactively break every
 * branch cut before the convention existed.
 */
export function loadDeclarations(root: string): ChangeDeclaration[] {
  const dir = join(root, CHANGES_DIR);
  if (!existsSync(dir)) return [];
  const declarations: ChangeDeclaration[] = [];
  const seen = new Map<string, string>();
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === "README.md") continue;
    const where = `${CHANGES_DIR}/${entry.name}`;
    const stem = basename(entry.name, ".md");
    const declaration = parseDeclaration(
      readFileSync(join(dir, entry.name), "utf8"),
      where,
      stem,
    );
    const previous = seen.get(declaration.id);
    if (previous) {
      throw new DeclarationError(
        `${where}: id '${declaration.id}' is already declared by ${previous}.`,
      );
    }
    seen.set(declaration.id, where);
    declarations.push(declaration);
  }
  return declarations;
}
