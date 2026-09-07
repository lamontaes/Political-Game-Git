import { scanLiterals, type ScannedLiteral } from "../scan";
import { proseId, templateSlots } from "../ids";
import type { ProseDomain, ProseRecord, ProseSurface } from "../types";

/**
 * Prose that a function builds rather than a bank declares.
 *
 * Connective narration, thread recaps, callback summaries, campaign status and
 * the legislative briefing all compose their sentences in code. There is no
 * bank to read and no per-sentence key to read it by, so this adapter names
 * the surfaces explicitly and extracts their literals from the syntax tree.
 *
 * Two things keep that honest. The registry below is a declared list, so a
 * module is inventoried because somebody said it is player-facing, never
 * because a heuristic guessed. And the coverage check runs the same scanner
 * over everything else, so a prose-producing function nobody registered shows
 * up as NEEDS_CLASSIFICATION rather than silently vanishing — which is exactly
 * the failure the old #92 corpus had, where whole surface families were
 * missing and the report still called itself complete.
 *
 * The key for one of these is `<function>:<slug>`, not an ordinal. A function
 * has no per-sentence key to borrow, and numbering the sentences would renumber
 * them the moment one was inserted — the defect that made the old global IDs
 * useless. The slug is derived from the sentence's own words, so inserting a
 * line above it changes nothing. Editing the sentence does change its ID, which
 * is the honest cost: for a keyless literal, a different sentence in the same
 * function is a different sentence, and an owner's mark should not silently
 * follow the edit. Where a function repeats one literal exactly, the duplicates
 * take a deterministic `--2`, `--3` suffix in source order.
 */

export interface ComputedSurface {
  readonly sourcePath: string;
  readonly domain: ProseDomain;
  readonly bank: string;
  /** Functions and consts in this module whose literals a player reads. */
  readonly symbols: readonly string[];
  readonly surface: ProseSurface;
  readonly reachability: ProseRecord["reachability"];
  readonly reachabilityReason: string;
  /** What canonical data licenses these sentences' factual claims. */
  readonly grounding: readonly { key: string; description: string }[];
}

export const COMPUTED_SURFACES: readonly ComputedSurface[] = [
  {
    sourcePath: "src/presentation/life-narration.ts",
    domain: "narration",
    bank: "connective",
    symbols: [
      "elapsedPhrase",
      "steadyState",
      "quietSentence",
      "composeConnectiveNarration",
      "listOf",
    ],
    surface: "connective",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "Every moment after the first opens with connective narration; it is never skipped.",
    grounding: [
      {
        key: "elapsed-days",
        description: "Days between the last recorded moment and this one.",
      },
      {
        key: "recorded-events",
        description:
          "The events the record actually holds for the elapsed stretch.",
      },
    ],
  },
  {
    sourcePath: "src/presentation/life-narration.ts",
    domain: "narration",
    bank: "thread-recap",
    symbols: ["recapSentence", "threadMovementSentence"],
    surface: "thread-recap",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "Open threads are recapped beside the scene whenever any are open.",
    grounding: [
      {
        key: "open-thread",
        description:
          "A narrative thread the record shows is open, and its last movement.",
      },
    ],
  },
  {
    sourcePath: "src/simulation/life-callbacks.ts",
    domain: "life",
    bank: "callback",
    symbols: [
      "RETURN_SUMMARY",
      "GENERIC_RETURN",
      "lifeCallbackTransitionHandler",
    ],
    surface: "callback",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "A scheduled life callback fires when its recorded aftermath comes due.",
    grounding: [
      {
        key: "aftermath-record",
        description:
          "The recorded aftermath the callback returns to, and the person bound to it.",
      },
    ],
  },
  {
    sourcePath: "src/presentation/campaign-projection.ts",
    domain: "campaign",
    bank: "campaign-status",
    symbols: [
      "detail",
      "offersFor",
      "unavailable",
      "fileForOffice",
      "projectCampaign",
      "officeAuthority",
    ],
    surface: "status",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "The campaign workspace shows these once a candidacy is filed (merged PR #85).",
    grounding: [
      {
        key: "candidacy",
        description: "A filed candidacy, its office and its jurisdiction.",
      },
      {
        key: "campaign-treasury",
        description: "The campaign's recorded money and scheduled sessions.",
      },
    ],
  },
  {
    sourcePath: "src/presentation/legislation-projection.ts",
    domain: "legislative",
    bank: "measure-briefing",
    symbols: [
      "STEP_COPY",
      "PHASE_SENTENCES",
      "ACTION_HEADLINES",
      "projectMeasureBriefing",
      "uncertaintiesFor",
      "questionLabel",
      "deadlinesFor",
      "requirementNoteFor",
      "voteSentence",
      "otherPart",
    ],
    surface: "status",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "The measure briefing is the player-reachable legislative surface once seated.",
    grounding: [
      {
        key: "measure",
        description: "The measure, its chamber, its stage and its vote record.",
      },
      {
        key: "rule-pack",
        description:
          "The jurisdiction's compiled legislative rule pack and its cited instrument.",
      },
    ],
  },
  {
    sourcePath: "src/presentation/life-introduction.ts",
    domain: "life",
    bank: "introduction",
    symbols: ["buildGrounding", "buildLifeIntroduction"],
    surface: "connective",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "The opening introduces the life before its first moment.",
    grounding: [
      {
        key: "person-record",
        description:
          "The character's own canonical name, age, place and household.",
      },
    ],
  },
];

/** Is this literal a sentence a player reads, or machinery? */
function looksLikeProse(literal: ScannedLiteral): boolean {
  if (literal.isKeyPosition || literal.isThrownError) return false;
  const text = literal.text.trim();
  if (text.length < 4) return false;
  if (!/[a-z]/.test(text)) return false;
  // A bare slot with no words of its own is composition, not prose.
  if (/^\{[^}]*\}$/.test(text)) return false;
  return true;
}

function slugOf(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/\{[^}]*\}/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 8)
    .join("-");
  return slug.length > 0 ? slug : "unnamed";
}

export function computedProseRecords(): readonly ProseRecord[] {
  const records: ProseRecord[] = [];
  for (const surface of COMPUTED_SURFACES) {
    const wanted = new Set(surface.symbols);
    const literals = scanLiterals(surface.sourcePath)
      .filter((literal) => wanted.has(literal.enclosingSymbol))
      .filter(looksLikeProse);
    const used = new Map<string, number>();
    for (const literal of literals) {
      const base = `${literal.enclosingSymbol}:${slugOf(literal.text)}`;
      const seen = (used.get(base) ?? 0) + 1;
      used.set(base, seen);
      const stableKey = seen === 1 ? base : `${base}--${seen}`;
      const slots = templateSlots(literal.text);
      records.push({
        id: proseId({
          domain: surface.domain,
          bank: surface.bank,
          stableKey,
          field: "text",
        }),
        domain: surface.domain,
        bank: surface.bank,
        stableKey,
        field: "text",
        surface: surface.surface,
        sourcePath: surface.sourcePath,
        sourceSymbol: literal.enclosingSymbol,
        text: literal.text,
        realization: slots.length > 0 ? "templated" : "static",
        slots,
        reachability: surface.reachability,
        reachabilityReason: surface.reachabilityReason,
        grounding: surface.grounding.map((entry) => ({
          key: entry.key,
          description: entry.description,
          kind: "requirement" as const,
        })),
        provenance: {
          extraction: "syntax-tree",
          symbol: literal.enclosingSymbol,
        },
        tags: ["computed"],
      });
    }
  }
  return records;
}
