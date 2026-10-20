/**
 * The paper's headline for a law taking effect (words-scene-narration, the
 * News screen slice): the press prints a `law-took-effect` record with its
 * series, the value, whether it is new, replaces an earlier row or ends, and
 * the level of government. The headline is composed from those facts through
 * the English engine's headlines bank, in the direction the record shows: an
 * amount that rose is "Raises", one that fell is "Cuts", a first amount is
 * "Sets", a policy that began is "Approves" and one that ended is "Repeals".
 * A change the record does not make plain (an amount replaced by the same
 * amount, an amount that ended) gets no headline rather than a wrong one.
 */
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import {
  corePlaceByJurisdictionId,
  corePlaceStateIdentities,
} from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import type { EntityId } from "../core2/kernel/brands";
import { BILL_SECTIONS, valueWords } from "../english/bill-sections";
import { composeHeadline } from "../english/english-newscast";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "../english/grounded-english";
import { spoken } from "./words";

const QUESTION = /^[a-z]+(?:-[a-z]+)*:/;

interface LawStory {
  id: string;
  placeId: string;
  facts: Readonly<Record<string, string>>;
}

/** Who made the law, as a paper says it. */
function bodyName(core: CoreState, story: LawStory): string | null {
  const level = story.facts.level;
  if (level === "federal") return "Congress";
  if (level === "state") {
    const key = story.facts.jurisdiction;
    return (
      corePlaceStateIdentities().find((row) => row.jurisdictionKey === key)
        ?.name ?? null
    );
  }
  if (level === "county") return "The county";
  const town = corePlaceByJurisdictionId(story.placeId as never);
  void core;
  return town ? spoken(town) : null;
}

/** The grounded packet a story's headline is composed from. */
export function storyPacket(
  core: CoreState,
  recordId: string,
  also: readonly string[],
  facts: Record<string, GroundedEnglishFact>,
): GroundedEnglishPacket {
  return {
    surface: "dialogue",
    momentKey: `story:${recordId}`,
    worldSeed: core.seed,
    bankVersion: "words-newscast-v1",
    stage: "default",
    sourceRecordIds: [recordId, ...also] as EntityId[],
    facts,
    speaker: { personId: recordId as EntityId, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, row]) => ({
      personId: recordId as EntityId,
      factKey,
      sourceRecordIds: row.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
}

export function lawStoryHeadline(
  core: CoreState,
  story: LawStory,
  /** Grading and tests only: also use parts held back until graded. */
  includeHeld = false,
): { headline: string; sourceRecordIds: string[] } | null {
  const { lawId, series, change, value, unit } = story.facts;
  if (!lawId || !series || !change || value === undefined) return null;
  const body = bodyName(core, story);
  if (!body) return null;
  const recordId = story.id;
  const fact = (text: string, ...ids: string[]): GroundedEnglishFact => ({
    text,
    sourceRecordIds: [recordId, lawId, ...ids] as EntityId[],
  });
  const facts: Record<string, GroundedEnglishFact> = { body: fact(body) };
  let roles: string[];
  const question = QUESTION.test(series)
    ? BILL_SECTIONS.policies[series.replace(QUESTION, "")]
    : undefined;
  const amount = BILL_SECTIONS.amounts[series];
  if (question) {
    facts.measure = fact(question.subject);
    if (change === "new") {
      facts.passed = fact("yes");
      roles = ["council"];
    } else if (change === "ended") roles = ["law-repealed"];
    else return null;
  } else if (amount) {
    if (change === "ended") return null;
    facts.subject = fact(amount.subject);
    facts.value = fact(valueWords(Number(value), unit || undefined));
    if (change === "new") roles = ["law-set"];
    else {
      // Replaced: the direction is the new value against the row it replaced.
      const before = story.facts.replacesLawId
        ? (coreAPI(core)
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .get(story.facts.replacesLawId) as unknown as
            { value: number | null } | undefined)
        : undefined;
      if (before?.value == null || before.value === Number(value)) return null;
      roles = [Number(value) > before.value ? "law-raised" : "law-lowered"];
    }
  } else return null;
  const composed = composeHeadline(
    storyPacket(core, recordId, [lawId], facts),
    roles,
    includeHeld,
  );
  return composed
    ? { headline: composed.text, sourceRecordIds: composed.sourceRecordIds }
    : null;
}
