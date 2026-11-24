/**
 * The addresses told through the one outline planner
 * (src/english/outline-planner.ts; the Story lead's brief, Nov 24, 2026): the
 * President's inaugural and State of the Union, a governor's State of the
 * State, a mayor's address and a candidate's campaign speech. The planner of record (`planSpeech`) still reads the world: the
 * theme, the speaker's stand and its reason, and the story the country or
 * state has been through. This file hands those facts to the kind's outline
 * row (data/english/outlines.json), which says them in the shapes real
 * addresses take: a pledge, a call or an address run to the people far more
 * than an ask of a body (research: 4 of 88 inaugural points end in an ask of
 * a body; docs/research/first-evening-2026-11-24.md).
 */
import speechOutlines from "./data/speech-outlines.json" with { type: "json" };
import type { EntityId } from "../core2/kernel/brands";
import {
  officialsIn,
  PRESIDENT_FACT,
  type OfficialRow,
} from "../core2/modules/officials";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { termLeft } from "./address-story";
import type { CoreState, PersonState } from "../core2/types";
import type {
  OpeningLevel,
  OpeningSpeechKind,
} from "../english/english-opening-speech";
import type { GroundedEnglishFact } from "../english/grounded-english";
import {
  DISASTER_WORDS,
  tell,
  type TellingInput,
  type ToldSentence,
} from "../english/outline-planner";
import { officeWords } from "../english/said-as";
import { saidPersonOf } from "./said-person";
import type { OpeningSentence } from "./opening-story";
import {
  outlineOf,
  planSpeech,
  termOf,
  type OutlineSpeaker,
  type SpeechPlan,
} from "./speech-outline";

type Facts = Record<string, GroundedEnglishFact>;

const THEME = speechOutlines as unknown as {
  themeNames: Record<string, string>;
  themeShort: Record<string, string>;
  nationWords: { nation: string; "nation-full": string };
};

const fact = (text: string, ids: readonly string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as EntityId[],
});

/**
 * Every fact the plan's blocks carry, the first block's value kept, and of
 * the points only the first: an address's theme argues one point (its second
 * section the plan's second), so its question, belief and law all come from
 * one block (the Story lead, Nov 24:
 * a stand on sentencing said with a belief about immigrants).
 */
function planFacts(plan: SpeechPlan): Facts {
  const all: Facts = {};
  // The planned first point, else (a crisis answered from the record) the
  // first point block the plan holds.
  const points = plan.blocks.filter((block) => block.key.startsWith("point-"));
  const first =
    points.find(
      (block) => block.key === `point-${plan.points[P.zero]?.question}`,
    ) ?? points[P.zero];
  for (const block of plan.blocks) {
    if (block.key.startsWith("point-") && block !== first) continue;
    for (const [key, row] of Object.entries(block.facts)) all[key] ??= row;
  }
  return all;
}

/** The kinds of address told through the outline planner: each has a row in data/english/outlines.json. */
export type AddressTellingKind = Extract<
  OpeningSpeechKind,
  | "inaugural"
  | "state-of-the-union"
  | "state-of-the-state"
  | "town-address"
  | "campaign-speech"
>;

/**
 * The facts an address's pieces read, from the plan and the speaker's
 * record: the years left in the term, the theme said as people say it, the
 * disaster as people say it, and what the other side of the speaker's stand
 * wants. A national address adds the Vice President; the inaugural alone adds
 * the oath taken today and the election last November.
 */
export function addressFacts(
  core: CoreState,
  kind: AddressTellingKind,
  speaker: OutlineSpeaker,
  plan: SpeechPlan,
  occasionId: string,
): Facts {
  const facts = planFacts(plan);
  const { person, official } = speaker;
  const ids = [official?.id ?? person.id];
  // The years left, from the offices engine, where the plan's blocks did not
  // carry them.
  // A local speaker's term is the one their seat's record holds.
  const termId = official?.termId ?? speaker.local?.termId;
  if (!facts["term-left"] && termId)
    Object.assign(facts, termLeft(core, termOf(core, termId)));
  // A local speaker (a mayor, a candidate) never speaks for the nation.
  const national = !speaker.local && outlineOf(kind).level === "federal";
  // The country by name, for a blessing or a send-off: a national address only.
  if (national) {
    facts.nation = fact(THEME.nationWords.nation, ids);
    facts["nation-full"] = fact(THEME.nationWords["nation-full"], ids);
  }
  // The Vice President, from the officials engine, where the plan's blocks
  // did not carry them: a national address only.
  if (national && !facts["vice-president"]) {
    const vice = officialsIn(coreAPI(core), "US:vice-president")[P.zero];
    const vicePerson = vice ? core.people.get(vice.id) : undefined;
    if (vice && vicePerson)
      facts["vice-president"] = fact(
        [vicePerson.givenName, vicePerson.familyName].join(" "),
        [vice.id],
      );
  }
  if (kind === "inaugural" && official) {
    facts["took-oath"] = fact("yes", [occasionId, official.id]);
    const elected = (person.pastFacts ?? []).find(
      (row) => row.kind === PRESIDENT_FACT.elected,
    );
    if (
      elected &&
      Number(elected.facts?.year) ===
        Number(core.date.slice(P.zero, core.date.indexOf("-"))) - P.one
    )
      facts["elected-last-fall"] = fact("yes", [elected.id]);
  }
  // The theme said is the argued point's own family, so the speech never
  // names one subject and argues another (a crisis address answers with a
  // question outside its theme).
  const family = plan.points[P.zero]?.family ?? plan.theme;
  const theme = family ? THEME.themeNames[family] : undefined;
  if (theme) facts["theme-name"] = fact(theme, ids);
  const short = family ? THEME.themeShort[family] : undefined;
  if (short) facts["theme-short"] = fact(short, ids);
  else delete facts["theme-short"];
  const disaster = facts["story-disaster"];
  const said = disaster ? DISASTER_WORDS[disaster.text] : undefined;
  if (disaster && said)
    facts["the-disaster"] = fact(said, disaster.sourceRecordIds);
  // The Vice President by office and name, as the said-as reader words an office.
  const vp = national ? facts["vice-president"] : undefined;
  const vpId = vp?.sourceRecordIds[P.zero];
  const vpOffice = vpId
    ? officeWords(
        saidPersonOf(core, vpId, {
          speakerId: person.id,
          listenerId: person.id,
        }).officeKind,
      )
    : undefined;
  if (vp && vpOffice)
    facts["the-vice-president"] = fact(
      [vpOffice.before, vp.text].join(" "),
      vp.sourceRecordIds,
    );
  Object.assign(facts, otherSide(facts));
  return facts;
}

/** What the other side of a stand wants done, as a verb phrase. */
function otherSide(facts: Facts): Facts {
  const about = facts.about;
  const to = facts.to;
  const law = facts["law-name"];
  if (!about || !to || !law) return {};
  const against = !!facts["stance-against"];
  const inForce = !!facts["law-in-force"];
  const other = against
    ? inForce
      ? `keep ${law.text}`
      : to.text
    : inForce
      ? `repeal ${law.text}`
      : `block ${about.text}`;
  return { "other-side": fact(other, about.sourceRecordIds) };
}

/** The stand facts of the plan's second point, where it has one: said in the address's second section. */
function secondPoint(
  plan: SpeechPlan,
): { facts: Facts; question: string } | null {
  const point = plan.points[P.one];
  const block = point
    ? plan.blocks.find((row) => row.key === `point-${point.question}`)
    : undefined;
  if (!point || !block) return null;
  const facts: Facts = { ...block.facts };
  return {
    facts: { ...facts, ...otherSide(facts) },
    question: point.question,
  };
}

/** A told sentence as the address keeps it: one part per paragraph, its camera, its pieces and the stand it speaks on. */
function asOpening(
  row: ToldSentence,
  facts: Facts,
  question: string | null,
): OpeningSentence {
  const about = facts.about;
  const to = facts.to;
  const onStand =
    (row.section === "theme" ||
      row.section === "second" ||
      row.facts.includes("about")) &&
    about &&
    to &&
    (facts["stance-for"] || facts["stance-against"]);
  return {
    level: (row.camera ?? "country") as OpeningLevel,
    part: row.paragraph,
    text: row.text,
    // A sentence on the stand cites its question, so every view of the
    // address (the talk at home, the Journal, the news) finds the point it
    // argued, whichever slots its words used (pre-grade, Nov 24: the
    // Journal's evening lost the point when no sentence said {about}).
    sourceRecordIds:
      onStand && question
        ? [...new Set([...row.sourceRecordIds, `question:${question}`])]
        : row.sourceRecordIds,
    facts: row.facts,
    pieces: [row.piece],
    values: {
      ...Object.fromEntries(
        row.facts.map((key) => [key, facts[key]?.text ?? ""]),
      ),
      ...(onStand ? { about: about.text, to: to.text } : {}),
    },
    ...(onStand
      ? {
          stand: {
            about: about.text,
            to: to.text,
            stance: facts["stance-for"]
              ? ("for" as const)
              : ("against" as const),
            inForce: !!facts["law-in-force"],
          },
        }
      : {}),
  };
}

/** What an address is told from: the outline input, the plan, its facts and its second point's. */
export interface AddressTelling {
  readonly input: TellingInput;
  readonly plan: SpeechPlan;
  readonly facts: Facts;
  readonly second: { facts: Facts; question: string } | null;
}

/**
 * What an address is told from, for a plan the planner of record made: the
 * outline input (its facts, its second point, the speaker's traits), the
 * plan, and the facts of each point. The address and the sameness measure
 * read the same input.
 */
export function tellingOfPlan(
  core: CoreState,
  kind: AddressTellingKind,
  speaker: OutlineSpeaker,
  plan: SpeechPlan,
  occasionId: string,
): AddressTelling {
  const { person, official } = speaker;
  const facts = addressFacts(core, kind, speaker, plan, occasionId);
  const second = secondPoint(plan);
  return {
    input: {
      kind,
      facts,
      momentKey: `${kind}:${core.date}:${person.id}`,
      worldSeed: core.seed,
      sourceRecordIds: [
        (official?.id ?? person.id) as EntityId,
        occasionId as EntityId,
      ],
      knower: person.id as EntityId,
      traits: person.traits,
      ...(second ? { points: [second.facts] } : {}),
    },
    plan,
    facts,
    second,
  };
}

/** What an address of a kind is told from, planned now by the planner of record. */
export function addressTelling(
  core: CoreState,
  kind: AddressTellingKind,
  speaker: OutlineSpeaker,
  occasionId: string,
): AddressTelling {
  return tellingOfPlan(
    core,
    kind,
    speaker,
    planSpeech(core, kind, speaker),
    occasionId,
  );
}

/**
 * An address's sentences as told from its telling. Null when a required
 * section cannot be said (its outline bank holds no piece for it yet).
 */
export function toldSentences(
  telling: AddressTelling,
): OpeningSentence[] | null {
  const { input, plan, facts, second } = telling;
  const told = tell(input);
  if (!told) return null;
  return told.sentences.map((row) =>
    row.section === "second" && second
      ? asOpening(row, { ...facts, ...second.facts }, second.question)
      : asOpening(row, facts, plan.points[P.zero]?.question ?? null),
  );
}

/**
 * An address as told: its sentences, and the plan whose theme, story and
 * stand they say. Null when a required section cannot be said.
 */
export function tellAddress(
  core: CoreState,
  kind: AddressTellingKind,
  speaker: OutlineSpeaker,
  occasionId: string,
): { sentences: OpeningSentence[]; plan: SpeechPlan } | null {
  const telling = addressTelling(core, kind, speaker, occasionId);
  const sentences = toldSentences(telling);
  return sentences ? { sentences, plan: telling.plan } : null;
}

/** The President as the planner of record hears them speak for the country. */
export function presidentSpeaker(
  president: PersonState,
  official: OfficialRow,
): OutlineSpeaker {
  return {
    person: president,
    official,
    jurisdiction: "US",
    serviceStart: official.serviceStart,
  };
}

/** What the inaugural is told from (the sameness gate's inputs read it). */
export function inauguralTelling(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  inaugurationId: string,
): AddressTelling {
  return addressTelling(
    core,
    "inaugural",
    presidentSpeaker(president, official),
    inaugurationId,
  );
}

/** The inaugural as told; null when a required section cannot be said. */
export function tellInaugural(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  inaugurationId: string,
): { sentences: OpeningSentence[]; plan: SpeechPlan } | null {
  return tellAddress(
    core,
    "inaugural",
    presidentSpeaker(president, official),
    inaugurationId,
  );
}
