/**
 * The President's inaugural, told through the one outline planner
 * (src/english/outline-planner.ts; the Story lead's brief, Nov 24, 2026). The
 * planner of record (`planSpeech`) still reads the world: the theme, the
 * President's stand and its reason, and the story the country has been
 * through. This file hands those facts to the outline row `inaugural`
 * (data/english/outlines.json), which says them in the shapes real
 * inaugurals take: a pledge, a call or an address run to the people far
 * more than an ask of Congress (research: 4 of 88 inaugural points end in
 * an ask of a body; docs/research/first-evening-2026-11-24.md).
 */
import outlineData from "../../data/english/outlines.json" with { type: "json" };
import speechOutlines from "./data/speech-outlines.json" with { type: "json" };
import type { EntityId } from "../core2/kernel/brands";
import type { OfficialRow } from "../core2/modules/officials";
import { PRESIDENT_FACT } from "../core2/officials-president";
import type { CoreState, PersonState } from "../core2/types";
import type { OpeningLevel } from "../english/english-opening-speech";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { tell, type ToldSentence } from "../english/outline-planner";
import { officeWords } from "../english/said-as";
import { saidPersonOf } from "./said-person";
import type { OpeningSentence } from "./opening-story";
import { planSpeech, type SpeechPlan } from "./speech-outline";

type Facts = Record<string, GroundedEnglishFact>;

const DISASTER_WORDS = (
  outlineData as unknown as { disasterWords: Record<string, string> }
).disasterWords;
const THEME_NAMES = (
  speechOutlines as unknown as { themeNames: Record<string, string> }
).themeNames;

const fact = (text: string, ids: readonly string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as EntityId[],
});

/** Every fact the plan's blocks carry, the first block's value kept. */
function planFacts(plan: SpeechPlan): Facts {
  const all: Facts = {};
  for (const block of plan.blocks)
    for (const [key, row] of Object.entries(block.facts)) all[key] ??= row;
  return all;
}

/**
 * The facts the inaugural's pieces read, from the plan and the President's
 * record: the oath taken today, the election last November, the theme said
 * as people say it, the disaster as people say it, and what the other side
 * of the President's stand wants.
 */
export function inauguralFacts(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  plan: SpeechPlan,
  inaugurationId: string,
): Facts {
  const facts = planFacts(plan);
  const ids = [official.id];
  facts["took-oath"] = fact("yes", [inaugurationId, official.id]);
  const elected = (president.pastFacts ?? []).find(
    (row) => row.kind === PRESIDENT_FACT.elected,
  );
  if (
    elected &&
    Number(elected.facts?.year) === Number(core.date.slice(0, 4)) - 1
  )
    facts["elected-last-fall"] = fact("yes", [elected.id]);
  const theme = plan.theme ? THEME_NAMES[plan.theme] : undefined;
  if (theme) facts["theme-name"] = fact(theme, ids);
  const disaster = facts["story-disaster"];
  const said = disaster ? DISASTER_WORDS[disaster.text] : undefined;
  if (disaster && said)
    facts["the-disaster"] = fact(said, disaster.sourceRecordIds);
  // The Vice President by office and name, as the said-as reader words an office.
  const vp = facts["vice-president"];
  const vpId = vp?.sourceRecordIds[0];
  const vpOffice = vpId
    ? officeWords(
        saidPersonOf(core, vpId, {
          speakerId: president.id,
          listenerId: president.id,
        }).officeKind,
      )
    : undefined;
  if (vp && vpOffice)
    facts["the-vice-president"] = fact(
      [vpOffice.before, vp.text].join(" "),
      vp.sourceRecordIds,
    );
  // What the other side of the stand wants done, as a verb phrase.
  const about = facts.about;
  const to = facts.to;
  const law = facts["law-name"];
  if (about && to && law) {
    const against = !!facts["stance-against"];
    const inForce = !!facts["law-in-force"];
    const other = against
      ? inForce
        ? `keep ${law.text}`
        : to.text
      : inForce
        ? `repeal ${law.text}`
        : `block ${about.text}`;
    facts["other-side"] = fact(other, about.sourceRecordIds);
  }
  return facts;
}

/** A told sentence as the address keeps it: one part per paragraph, its camera, its pieces and the stand it speaks on. */
function asOpening(row: ToldSentence, facts: Facts): OpeningSentence {
  const about = facts.about;
  const to = facts.to;
  const onStand =
    (row.section === "theme" || row.facts.includes("about")) &&
    about &&
    to &&
    (facts["stance-for"] || facts["stance-against"]);
  return {
    level: (row.camera ?? "country") as OpeningLevel,
    part: row.paragraph,
    text: row.text,
    sourceRecordIds: row.sourceRecordIds,
    facts: row.facts,
    pieces: [row.piece],
    values: Object.fromEntries(
      row.facts.map((key) => [key, facts[key]?.text ?? ""]),
    ),
    ...(onStand
      ? {
          stand: {
            about: about.text,
            to: to.text,
            stance: facts["stance-for"]
              ? ("for" as const)
              : ("against" as const),
          },
        }
      : {}),
  };
}

/**
 * The inaugural as told: its sentences, and the plan whose theme, story and
 * stand they say. Null when a required section cannot be said.
 */
export function tellInaugural(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  inaugurationId: string,
): { sentences: OpeningSentence[]; plan: SpeechPlan } | null {
  const plan = planSpeech(core, "inaugural", {
    person: president,
    official,
    jurisdiction: "US",
    serviceStart: official.serviceStart,
  });
  const facts = inauguralFacts(core, president, official, plan, inaugurationId);
  const told = tell({
    kind: "inaugural",
    facts,
    momentKey: `inaugural:${core.date}:${president.id}`,
    worldSeed: core.seed,
    sourceRecordIds: [official.id as EntityId, inaugurationId as EntityId],
    knower: president.id as EntityId,
    traits: president.traits,
  });
  if (!told) return null;
  return {
    sentences: told.sentences.map((row) => asOpening(row, facts)),
    plan,
  };
}
