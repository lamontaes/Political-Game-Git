import {
  contextRevisionOf,
  loadAnchorFile,
  resolveAnchors,
  revisionOf,
  type AnchorProblem,
  type ComputedAnchor,
} from "../anchors";
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
 * Identity for one of these comes from `../anchors`, not from the text.
 *
 * The first version keyed a site on the first eight words of its own sentence
 * and broke ties by source order. Both halves were wrong: inserting a sentence
 * that shared another's eight-word prefix handed the existing sentence's ID to
 * the new one — moving an owner's mark onto text they never read — and editing
 * a sentence past its eighth word left the ID untouched, so a stale approval
 * kept applying. Anchors are minted once into a sidecar and matched on FULL
 * text inside the site's own (file, symbol) group, and an unresolved match is a
 * visible failure rather than a quiet rematch to the nearest neighbour.
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
    sourcePath: "src/presentation/run-b-conversation.ts",
    domain: "conversation",
    bank: "conversation-turn",
    symbols: [
      "openingConversationBeat",
      "continuingRunBReferralBeat",
      "describeRunBBriefingContext",
      "describeConversationBriefingContext",
      "conversationTopicLabel",
      "describeConversationHearing",
      "commitConversationTurn",
      "availableConversationIntents",
    ],
    surface: "artifact",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "The conversation strip composes these turns from the room and its bound people.",
    grounding: [
      {
        key: "conversation-room",
        description:
          "The room, its subject and the canonical people bound to its roles.",
      },
      {
        key: "conversation-progress",
        description:
          "What this conversation has already committed, which decides the next intents.",
      },
    ],
  },
  {
    sourcePath: "src/presentation/conversation-subjects.ts",
    domain: "conversation",
    bank: "conversation-subject",
    symbols: [
      "availableIntents",
      "options",
      "openingBeat",
      "describeBriefing",
      "settledHouseholdLine",
      "commitmentLabel",
      "dialogue",
    ],
    surface: "status",
    reachability: "PLAYER_REACHABLE",
    reachabilityReason:
      "ConversationStrip and PlayerOffice render these beats, briefings, intents and option labels during an ordinary conversation.",
    grounding: [
      {
        key: "subject",
        description:
          "The conversation subject family and the canonical vocabulary it commits turns in.",
      },
    ],
  },
  {
    sourcePath: "src/presentation/conversation-subjects.ts",
    domain: "conversation",
    bank: "commit-contract",
    symbols: ["COMMIT_CONTRACTS"],
    surface: "artifact",
    reachability: "DEV_FIXTURE_ONLY",
    reachabilityReason:
      "Canonical-record text. A conversation turn writes these into event context (setting, socialContext, motivation, pressure, choice); the only surface that renders them is EventHistory, which DeveloperViewer mounts and App.tsx shows only for `?view=developer`. Ordinary play never opens it.",
    grounding: [
      {
        key: "conversation-turn",
        description:
          "The committed turn, its intent and its outcome, as the event record states them.",
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
  // A single word is a key, a label fragment or a status token, not a
  // sentence. Authored option labels are short but never one word.
  if (!/\s/.test(text)) return false;
  // A bare slot with no words of its own is composition, not prose.
  if (/^\{[^}]*\}$/.test(text)) return false;
  return true;
}

export interface ComputedExtraction {
  readonly records: readonly ProseRecord[];
  /**
   * Sites the sidecar could not account for.
   *
   * Never empty-and-ignored: the CLI turns these into a hard error, because a
   * site with no settled identity is exactly the state in which feedback slides
   * onto the wrong sentence.
   */
  readonly problems: readonly AnchorProblem[];
}

export function extractComputedProse(
  surfaces: readonly ComputedSurface[] = COMPUTED_SURFACES,
  anchors: readonly ComputedAnchor[] = loadAnchorFile().anchors,
): ComputedExtraction {
  const records: ProseRecord[] = [];
  const problems: AnchorProblem[] = [];

  for (const surface of surfaces) {
    const wanted = new Set(surface.symbols);
    const literals = scanLiterals(surface.sourcePath)
      .filter((literal) => wanted.has(literal.enclosingSymbol))
      .filter(looksLikeProse);

    // Scope by file AND symbol set. Two surfaces can read the same module —
    // life-narration.ts carries both the connective and thread-recap banks —
    // and scoping by path alone made each one report the other's anchors as
    // orphaned.
    const scoped = anchors.filter(
      (anchor) =>
        anchor.sourcePath === surface.sourcePath && wanted.has(anchor.symbol),
    );
    const resolution = resolveAnchors(literals, scoped);
    problems.push(...resolution.problems);

    const contextRevision = contextRevisionOf(surface.grounding);
    for (const match of resolution.matches) {
      const literal = match.literal;
      const slots = templateSlots(literal.text);
      records.push({
        id: proseId({
          domain: surface.domain,
          bank: surface.bank,
          stableKey: match.anchor.anchor,
          field: "text",
        }),
        domain: surface.domain,
        bank: surface.bank,
        stableKey: match.anchor.anchor,
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
          anchor: match.anchor.anchor,
        },
        tags: ["computed"],
        textRevision: revisionOf(literal.text),
        contextRevision,
      });
    }
  }

  return { records, problems };
}

/** The records alone, for callers that handle problems separately. */
export function computedProseRecords(
  surfaces: readonly ComputedSurface[] = COMPUTED_SURFACES,
  anchors: readonly ComputedAnchor[] = loadAnchorFile().anchors,
): readonly ProseRecord[] {
  return extractComputedProse(surfaces, anchors).records;
}

/** Every literal the registry claims, for minting. */
export function computedLiterals(
  surfaces: readonly ComputedSurface[] = COMPUTED_SURFACES,
): readonly ScannedLiteral[] {
  return surfaces.flatMap((surface) => {
    const wanted = new Set(surface.symbols);
    return scanLiterals(surface.sourcePath)
      .filter((literal) => wanted.has(literal.enclosingSymbol))
      .filter(looksLikeProse);
  });
}
