/**
 * The opening, told as a story (owner, Oct 14, 2026): the President's address
 * about the world the simulation made, that night's evening news, then the
 * player's household at home that evening, where the news can be picked up. Everything said comes from
 * the English engine's mined banks with the world's records in its slots,
 * composed once while the world loads; a sentence the records can't support
 * is left out, never written.
 *
 * - It opens on the address itself, the President speaking with the Vice
 *   President and key people pointed out; home comes after the governor and
 *   the family (owner, Oct 26, 2026).
 * - The address reads the macro engine's opening month against the year
 *   before, saying a figure with what it is, never a bare claim ("Prices are
 *   too high"); the President's own three issues (an ask of Congress only
 *   for an issue the President supports); a place only from a campaign visit
 *   to the player's own state; a governor's name only when the scene
 *   introduces the governor; and the Speaker's recorded gender for the
 *   salutation.
 * - Each person the camera points out is there for a recorded reason: the
 *   sentence that names them, or the player's own household.
 * - The news reads the address as that night's lead story and the town's own
 *   lead story that day (a closure, a hazard, a death, else its jobs figure).
 * - The address is recorded once as a public event, so the news engine
 *   carries it to the town and anyone who hears it can bring it up; the whole
 *   opening is kept on the director's ledger for the screens.
 */
import { applyCoreEvent, coreAPI } from "../core2/state";
import { officialsIn, type OfficialRow } from "../core2/modules/officials";
import { PRESIDENT_FACT } from "../core2/officials-president";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import {
  composeAddress,
  type ComposedMove,
} from "../english/english-composition";
import { addressesGivenBy } from "../core2/modules/people";
import type {
  OpeningLevel,
  OpeningMove,
  OpeningSpeechKind,
} from "../english/english-opening-speech";
import {
  ADDRESS_FACT,
  ADDRESS_PART_BREAK,
  addressPiecesFact,
  earlierAddressPieces,
} from "./opening-facts";
import { keyChambersOf } from "../core2/opening-key-people";
import { LEADERSHIP_MODULE_ID, organize } from "../core2/modules/leadership";
import { markWordsStopgap } from "./stopgaps";
import {
  questionAbout,
  questionAgain,
  questionLaw,
} from "../english/question-names";
import { SUBJECT_WORDS } from "../english/composed-checks";
import { P } from "../core2/parameters";
import { officeWords, saidAs } from "../english/said-as";
import { mentionsOf, noteMention, tellingOf } from "../english/telling";
import { saidPersonOf } from "./said-person";
import type { AddressKind } from "./address-kind";
import {
  SHAPE,
  packet,
  planSpeech,
  type Block,
  type Facts,
  type PlannedPoint,
} from "./speech-outline";

export {
  macroMonths,
  opposedOf,
  standFacts,
  standsAt,
  voiceOf,
  wantedOf,
  fact,
  type Block,
  type Facts,
  type PlannedPoint,
  type Stand,
} from "./speech-outline";

export interface OpeningSentence {
  readonly level: OpeningLevel;
  /** The part of the address it is said in, from 0, one per Continue. */
  readonly part: number;
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
  /** What the sentence is about: the facts it said ("jobs-up", "place", "goal"). */
  readonly facts: readonly string[];
  /** The bank pieces it was joined from, by key. */
  readonly pieces: readonly string[];
  /** What each of those facts said in the sentence, the figure or name filled in. */
  readonly values: Readonly<Record<string, string>>;
  /** The state a place line names, from the campaign visit it came from. */
  readonly stateKey?: string;
  /**
   * The policy question the sentence's block speaks on, in the stand's own
   * words and with the President's side, whether or not this sentence's
   * words said them.
   */
  readonly stand?: {
    readonly about: string;
    readonly to: string;
    readonly stance: "for" | "against";
  };
}

export interface OpeningStory {
  /** The public event the address is recorded as. */
  readonly id: string;
  readonly date: string;
  readonly speechKind: OpeningSpeechKind;
  /** The kind of address it is (crisis, combative, hopeful, victory, mourning, policy), picked from the world and the President. */
  readonly addressKind: AddressKind;
  /** The one theme the speech is about (a bill catalog subject), from the speech outline; null when the record gives none. */
  readonly theme: string | null;
  /** The questions the speech asks for or against, each once, by question. */
  readonly asks: readonly string[];
  /** Each point as the outline planned it (shape, side, belief, figure). */
  readonly points: readonly PlannedPoint[];
  readonly president: {
    readonly id: PersonId;
    readonly name: string;
    /** The home state's name, from the President's past facts. */
    readonly homeState: string | null;
    /** The office held before, by its title, from the past facts. */
    readonly priorOffice: string | null;
    readonly sourceRecordIds: readonly string[];
  };
  readonly address: {
    readonly sentences: readonly OpeningSentence[];
    /** The first sentence, the one the opening shows first. */
    readonly openingLine: OpeningSentence;
    /** The line people remember: the President's own ask, else the country's state. */
    readonly rememberedLine: OpeningSentence;
    readonly text: string;
    /** The address as the talk box plays it, one paragraph per Continue. */
    readonly parts: readonly string[];
    readonly sourceRecordIds: readonly string[];
  };
  /** The handoff: the player's household at home on the evening of day one. */
  readonly home: {
    readonly date: string;
    readonly householdId: string;
    readonly memberIds: readonly PersonId[];
    /** A subject the household can bring up: the address, by its event. */
    readonly subjectEventId: string;
  };
}

/** The offices engine's public record of the taking of office on Inauguration Day. */
const INAUGURATION_EVENT = "inauguration";

/** The kind of public event the address is recorded as. */
export const OPENING_ADDRESS_EVENT = "president.address";

/** The world's names and subjects an address says no more often than `namesSaid` while another wording can do without them. */
const WORLD_NAMES: readonly string[] = [
  "prior-office",
  "hardest",
  "best",
  // The governor's state or the local head's place (speech-has-one-theme:
  // "Tennessee" four times in one address).
  "realm-name",
];

/** The world's names that are never said more than `namesSaid` times unless a required move needs them: its people and the President's own office. */
const PERSON_NAMES: readonly string[] = ["prior-office"];

/**
 * The people an address names, by the fact key of their slot (owner, Nov
 * 12: "who's Kathryn Hansen?", "There needs to be pronouns and titles."). The
 * shared said-as reader (src/english/said-as.ts) says each from the address's
 * telling: "Vice President Kathryn Hansen" at first mention, then "the Vice
 * President" or "she". A slot names the case its place in the sentence needs:
 * `-object` ("with her beside me"), `-possessive` ("her counsel"); a slot
 * ending `-addressed` speaks to the person, with title and name.
 */
const PEOPLE: readonly string[] = ["vice-president", "speaker"];
const CASES = {
  "": "subject",
  "-object": "object",
  "-possessive": "possessive",
  "-addressed": "subject",
} as const;

/**
 * The fact keys a composed part used, with each person said in a case
 * ({vice-president-object}) also counted as that person's own fact: the bank
 * requires a case slot by its own name, and the composer fills it from the
 * person's one fact (`withCases`), so the name budgets count the person.
 */
function usedKeys(part: {
  readonly usedFactKeys: readonly string[];
}): string[] {
  return [
    ...new Set([
      ...part.usedFactKeys,
      ...part.usedFactKeys.flatMap((key) => {
        const slot = personSlot(key);
        return slot ? [slot.person] : [];
      }),
    ]),
  ];
}

/** The person and the case a slot's fact key says, or null for a slot that is no person. */
function personSlot(
  key: string,
): { person: string; ending: keyof typeof CASES } | null {
  for (const person of PEOPLE)
    for (const ending of Object.keys(CASES) as (keyof typeof CASES)[])
      if (key === `${person}${ending}`) return { person, ending };
  return null;
}

/** The times a lead-in may name, which its core then does not name again. */
const TIME_WORDS: readonly string[] = ["year", "term", "today", "tonight"];

/** A sentence's runs of four words, without the words of a name it says. */
function fourWordRuns(text: string, name?: string): Set<string> {
  const skip = new Set((name ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const words = text
    .toLowerCase()
    .replace(/[^a-z' ]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !skip.has(word));
  const runs = new Set<string>();
  const size = SHAPE.parameters.sameRunWords.value;
  for (let at = P.zero; at + size <= words.length; at += P.one)
    runs.add(words.slice(at, at + size).join(" "));
  return runs;
}

/** The Speaker's recorded gender, for "Mr. Speaker" or "Madam Speaker". */
function chairStage(core: CoreState): string {
  const api = coreAPI(core);
  const speaker = officialsIn(api, "US:us-house").find(
    (row) => row.leadership === "presiding",
  );
  const gender = speaker
    ? core.people.get(speaker.id)?.looks?.gender
    : undefined;
  return gender === "female" ? "chair-female" : "chair-male";
}

function composeAddressOf(
  core: CoreState,
  president: PersonState,
  official: OfficialRow,
  kind: OpeningSpeechKind,
): {
  sentences: OpeningSentence[];
  addressKind: AddressKind;
  theme: string | null;
  asks: readonly string[];
  points: readonly PlannedPoint[];
} | null {
  const plan = planSpeech(core, kind, {
    person: president,
    official,
    jurisdiction: "US",
    serviceStart: official.serviceStart,
  });
  const sentences = composeBlocks(core, president, plan.blocks);
  return sentences
    ? {
        sentences,
        addressKind: plan.addressKind,
        theme: plan.theme,
        asks: plan.asks,
        points: plan.points,
      }
    : null;
}

/**
 * Say a plan's blocks in the speaker's own voice: the English engine writes
 * every sentence, their recorded traits pull each pick, and no piece is used
 * twice while another can say the line. Null when a required block cannot be
 * said. The one writer of every address (the President's, a governor's, a
 * mayor's).
 */
/** The roles of sentences that only set the scene, left out rather than say a subject word past its budget. */
const LEFT_OUT_PAST_BUDGET: readonly string[] = [
  // How a point's question stands today is never left out: every point
  // says it (the words lead, Nov 12: context, stand, ask).
  "meaning",
  "tie",
  "context",
  "story-says",
  "budget-condition",
  "year-condition",
  "hope",
];
/** A question's own record id in a fact's sources (speech-outline.ts `standFacts`). */
const QUESTION_ID = "question:";
/** The slots that say a question as a noun phrase, said by its second name once named. */
const AGAIN_NOUNS: readonly string[] = ["about", "law-name"];
/** The verbs a side opens with when its object is the question's own name. */
const SIDE_VERB = /^(?:say no to|repeal|keep|end) /;
/** The slots that say a side of a question with its name inside ("say no to {about}"). */
const AGAIN_INSIDE: readonly string[] = ["side", "first-side"];
/**
 * The slots whose saying names the question: its name and its sides. How it
 * stands today does not name it ("Why fix what works, when ...?"), so a
 * sentence after one still says the question's full name once.
 */
const NAMING_KEYS = /^(?:about|law-name|to|side|first-side)$/;

export function composeBlocks(
  core: CoreState,
  president: PersonState,
  blocks: readonly Block[],
): OpeningSentence[] | null {
  const stage = chairStage(core);
  // The addresses the President has given: each speech the speech module
  // recorded, and each campaign stop on their record (a rally speech there).
  const craft = [
    ...addressesGivenBy(coreAPI(core), president.id),
    ...(president.pastFacts ?? [])
      .filter((row) => row.kind === PRESIDENT_FACT.visit)
      .map((row) => row.id),
  ];
  const sentences: OpeningSentence[] = [];
  // Pieces already said, oldest first: those of every earlier address in
  // this world, whoever gave it (a frame the governor said is not the town
  // head's next month), then this one's as it is said, so no wording is used
  // twice while another can say it, and the one said longest ago comes back
  // first.
  const said: string[] = earlierAddressPieces(core);
  // How often each subject word has been said in the address.
  const subjectSaid = new Map<string, number>();
  // How often each of the world's names has been said in the address.
  const named = new Map<string, number>();
  // The seats of the people already said in this address, so a person is
  // said by title and name once and by role after.
  // The address's telling: who speaks, to whom, and who it has said so far.
  const telling = tellingOf({
    speakerId: president.id,
    listenerId: core.playerId ?? president.id,
  });
  /** A person as said-as words them now, in the slot's case; the mention is recorded only when `say`. */
  const viaSaidAs = (key: string, row: Facts[string], say: boolean) => {
    const slot = personSlot(key);
    const id = row.sourceRecordIds[P.zero];
    if (!slot || !id) return row.text;
    const person = saidPersonOf(core, id, telling);
    // Spoken to by office and name: the full name at first mention, the
    // office and family name after ("Thank you, Vice President Franklin"),
    // and the mention is the telling's, so a part after it in the same
    // sentence says the person by role (said-as; the Vice President was
    // named three times in Stockport, Iowa, seed 5c1e8a0b7d2f4e19:0).
    if (slot.ending === "-addressed") {
      const office = officeWords(person.officeKind);
      if (!office) return row.text;
      const first = mentionsOf(telling, person.id) === P.zero;
      if (say) noteMention(telling, person.id, first);
      return first
        ? `${office.before} ${person.givenName} ${person.familyName}`
        : `${office.before} ${person.familyName}`;
    }
    const memory = telling.text;
    const into = say
      ? telling
      : {
          ...telling,
          text: {
            ...memory,
            mentions: new Map(memory.mentions),
            fullNamed: new Set(memory.fullNamed),
            said: new Set(memory.said),
          },
        };
    return saidAs(into, person, { case: CASES[slot.ending] });
  };
  // Every person's slot in each case, from the one fact that names them.
  const withCases = (facts: Facts): Facts => {
    const all: Facts = { ...facts };
    for (const person of PEOPLE) {
      const row = facts[person];
      if (!row) continue;
      for (const ending of Object.keys(CASES))
        all[`${person}${ending}`] ??= row;
    }
    return all;
  };
  const tellOf = (facts: Facts): Facts =>
    Object.fromEntries(
      Object.entries(withCases(facts)).map(([key, row]) =>
        personSlot(key) && row
          ? [key, { ...row, text: viaSaidAs(key, row, false) }]
          : [key, row],
      ),
    );
  // What each person or name counts as, so the said-as forms of one person count together.
  const nameOf = (key: string, text: string) => personSlot(key)?.person ?? text;
  // The runs of four words each sentence naming the Vice President said.
  const viceSaid: Set<string>[] = [];
  // The lead-ins said so far, by their words.
  const ledIn = new Set<string>();
  // Whether the turn to the Vice President, which always names them, is still to come.
  let vpAhead = blocks.some((block) => block.key === "to-vp");
  // The questions this speech has named (speech-has-one-theme; the words
  // lead, Nov 12: "The subject is said once, then varied"): once a sentence
  // has said a question by its name or one of its sides, every later sentence
  // says it by its second-mention name (question-names `again`: "a clean
  // electricity standard" is "the standard"), in its noun slots and inside
  // the side said of it ("say no to the standard").
  const questionsNamed = new Set<string>();
  const questionOf = (row: Facts[string] | undefined) =>
    row?.sourceRecordIds
      .find((id) => id.startsWith(QUESTION_ID))
      ?.slice(QUESTION_ID.length) ?? null;
  const againOf = (facts: Facts): Facts =>
    Object.fromEntries(
      Object.entries(facts).map(([key, row]) => {
        const question = questionOf(row);
        const again = question ? questionAgain(question) : null;
        if (!row || !question || !again || !questionsNamed.has(question))
          return [key, row];
        const names = [questionAbout(question), questionLaw(question)].filter(
          (name): name is string => !!name,
        );
        if (AGAIN_NOUNS.includes(key)) return [key, { ...row, text: again }];
        if (!AGAIN_INSIDE.includes(key)) return [key, row];
        // Only where the side's verb takes the name itself ("say no to a
        // clean electricity standard"), never inside another noun ("the
        // rule against asking about ...").
        const verb = SIDE_VERB.exec(row.text)?.[P.zero] ?? null;
        const name = verb
          ? names.find((text) => row.text.slice(verb.length).startsWith(text))
          : undefined;
        return [
          key,
          verb && name
            ? {
                ...row,
                text: `${verb}${again}${row.text.slice(verb.length + name.length)}`,
              }
            : row,
        ];
      }),
    );
  let paragraph: number | null = null;
  for (const block of blocks) {
    // A pronoun points back only within its paragraph: a new paragraph says
    // the person by role again ("she and I" three paragraphs after her name).
    if (block.part !== paragraph) {
      paragraph = block.part;
      delete telling.text.lastPersonId;
    }
    const moves = block.moves.filter((row): row is OpeningMove => !!row);
    // stopgapId: SG-PEOPLE-address-register
    markWordsStopgap("SG-PEOPLE-address-register");
    // In the President's own voice: their recorded traits pull each pick,
    // and a crafted device is theirs only once the record shows the
    // addresses that earned it. Each move is said on its own, so a name from
    // the world already said twice is left to the wordings that do without
    // it, unless none can say the move.
    const sayMove = (move: OpeningMove, facts: Facts, retry = P.zero) =>
      composeAddress(
        packet(
          `opening:${core.date}:${president.id}/${block.key}${retry ? `#${retry}` : ""}`,
          core.seed,
          president.id,
          stage,
          facts,
          [president.id],
        ),
        "election-night",
        [move],
        {
          speakerTraits: president.traits,
          recentPartKeys: said,
          addressesGiven: craft.length,
        },
      );
    const address = { moves: [] as ComposedMove[] };
    // The facts each said move was worded with, the people as the telling had them.
    const toldOf: Facts[] = [];
    for (const planned of moves) {
      const told = tellOf(againOf(block.facts));
      // No lead-in ("To Congress,", "Across the country,") is said twice in
      // an address; a move whose lead-ins are all said goes without one.
      const opener = planned.bank.parts.opener;
      const unsaid = opener?.variants.filter(
        (variant) =>
          !ledIn.has(variant.kind === "template" ? variant.text : variant.key),
      );
      const move: OpeningMove =
        opener && unsaid!.length < opener.variants.length
          ? {
              ...planned,
              bank: {
                ...planned.bank,
                parts: {
                  ...planned.bank.parts,
                  opener: { ...opener, variants: unsaid! },
                },
              },
            }
          : planned;
      // A name is said at most `namesSaid` times (one fewer before the turn
      // to the Vice President, which always names them), and a subject's
      // words ("take-home pay") at most `subjectsSaid` times, counted by the
      // words said; only a required move says one again.
      const counted = (key: string) =>
        WORLD_NAMES.includes(key) ||
        !!personSlot(key) ||
        key.startsWith("say-");
      const limit = (key: string) =>
        PERSON_NAMES.includes(key) || personSlot(key)
          ? SHAPE.parameters.namesSaid.value -
            (personSlot(key)?.person === "vice-president" &&
            vpAhead &&
            block.key !== "to-vp"
              ? P.one
              : P.zero)
          : // A subject is named once, then said another way (owner, Nov
            // 12: "good news on a stronger economy ... report on a stronger
            // economy"); the greeting and the close may name it once more.
            SHAPE.parameters.subjectsSaid.value +
            (move.required || block.required ? P.one : P.zero);
      const within = (keys: (key: string) => boolean) =>
        Object.fromEntries(
          Object.entries(told).filter(
            ([key, row]) =>
              !keys(key) ||
              (named.get(nameOf(key, row.text)) ?? P.zero) < limit(key),
          ),
        );
      // A lead-in that names a time is not joined to a core that names the
      // same time ("In the year now behind us, this was a year when ...").
      const timeTwice = (row: ReturnType<typeof sayMove>) =>
        row.kind === "rendered" &&
        row.moves.some((said) => {
          const lead = said.parts.find((part) => part.part === "opener");
          const rest = said.parts.filter((part) => part.part !== "opener");
          return (
            !!lead &&
            TIME_WORDS.some(
              (word) =>
                new RegExp(`\\b${word}\\b`, "i").test(lead.text) &&
                rest.some((part) =>
                  new RegExp(`\\b${word}\\b`, "i").test(part.text),
                ),
            )
          );
        });
      const bare: OpeningMove = {
        ...move,
        bank: {
          ...move.bank,
          parts: Object.fromEntries(
            Object.entries(move.bank.parts).filter(
              ([line]) => line !== "opener",
            ),
          ) as typeof move.bank.parts,
        },
      };
      // A required move gives up a subject's limit before a name's.
      const echoesVice = (row: ReturnType<typeof sayMove>) =>
        row.kind === "rendered" &&
        row.moves.some((done) => {
          if (
            !done.parts.some((part) =>
              usedKeys(part).includes("vice-president"),
            )
          )
            return false;
          const runs = fourWordRuns(
            done.text,
            block.facts["vice-president"]?.text,
          );
          return viceSaid.some((earlier) =>
            [...runs].some((run) => earlier.has(run)),
          );
        });
      // A sentence says a person's full name once (said-as): a greeting that
      // addresses the Vice President by name and a core joined to it that
      // names them again ("Vice President Brian Franklin, ... I am grateful
      // to Vice President Brian Franklin") is drawn again.
      const fullNames = PEOPLE.flatMap((person) => {
        const id = block.facts[person]?.sourceRecordIds[P.zero];
        if (!id) return [];
        const said = saidPersonOf(core, id, telling);
        return [`${said.givenName} ${said.familyName}`];
      });
      const namesTwice = (row: ReturnType<typeof sayMove>) =>
        row.kind === "rendered" &&
        fullNames.some((name) => row.text.split(name).length - P.one > P.one);
      // A subject's word is said at most the composed check's budget in one
      // speech (speech-has-one-theme): a wording that would say one more
      // time is drawn again, a few times, and the fewest over stands.
      const overBy = (row: ReturnType<typeof sayMove>) => {
        if (row.kind !== "rendered") return P.zero;
        const names = new Set(
          Object.entries(told)
            .filter(([key]) => !!personSlot(key))
            .flatMap(([, value]) => SUBJECT_WORDS.wordsOf(value.text)),
        );
        const counts = new Map(subjectSaid);
        let over = P.zero;
        for (const word of SUBJECT_WORDS.of(row.text)) {
          if (names.has(word)) continue;
          const now = (counts.get(word) ?? P.zero) + P.one;
          counts.set(word, now);
          if (now > SUBJECT_WORDS.most()) over += P.one;
        }
        return over;
      };
      const tries = [
        within(counted),
        ...(move.required || block.required || block.key === "to-vp"
          ? [
              within((key) => PERSON_NAMES.includes(key) || !!personSlot(key)),
              told,
            ]
          : []),
      ].flatMap((facts) => {
        // The Vice President is not praised twice in the same words: a
        // sentence that would repeat four words of an earlier one naming them
        // is drawn again, a few times, before it stands.
        let said = sayMove(move, facts);
        for (
          let retry = P.one;
          retry <= SHAPE.parameters.redraws.value &&
          (echoesVice(said) || namesTwice(said) || overBy(said) > P.zero);
          retry += P.one
        ) {
          const again = sayMove(move, facts, retry);
          if (
            again.kind === "rendered" &&
            !echoesVice(again) &&
            !namesTwice(again) &&
            (echoesVice(said) ||
              namesTwice(said) ||
              overBy(again) < overBy(said))
          )
            said = again;
        }
        // A sentence that only sets the scene (a figure, a condition, a
        // hope) and would still say a subject word past the
        // budget after its redraws is left out: the point stands on its
        // belief and its ask (speech-has-one-theme).
        if (
          overBy(said) > P.zero &&
          !move.required &&
          !block.required &&
          LEFT_OUT_PAST_BUDGET.some(
            (role) => move.key === role || move.key.startsWith(`${role}-`),
          )
        )
          return [];
        return timeTwice(said) ? [sayMove(bare, facts)] : [said];
      });
      const result = tries.find((row) => row.kind === "rendered") ?? null;
      if (result?.kind === "rendered")
        for (const done of result.moves)
          if (
            done.parts.some((part) => usedKeys(part).includes("vice-president"))
          )
            viceSaid.push(
              fourWordRuns(done.text, block.facts["vice-president"]?.text),
            );
      if (result?.kind !== "rendered") {
        if (move.required || block.required) return null;
        continue;
      }
      for (const done of result.moves) {
        address.moves.push(done);
        toldOf.push(told);
        if (block.key === "to-vp") vpAhead = false;
        for (const part of done.parts)
          if (part.part === "opener") ledIn.add(part.text);
        for (const key of new Set(
          done.parts.flatMap((part) => usedKeys(part)),
        )) {
          const text = told[key]?.text;
          if (counted(key) && text)
            named.set(
              nameOf(key, text),
              (named.get(nameOf(key, text)) ?? P.zero) + P.one,
            );
          // The shared reader records the mention once the sentence said it.
          const row = told[key];
          const slot = personSlot(key);
          if (slot && row && block.facts[slot.person])
            viaSaidAs(key, block.facts[slot.person]!, true);
        }
        // A later move of this block does not repeat this one's wordings.
        said.push(...done.parts.map((part) => part.partKey));
        // A question said in this sentence is said again by its second name.
        for (const key of done.parts.flatMap((part) => usedKeys(part))) {
          const question = questionOf(told[key]);
          if (question && NAMING_KEYS.test(key)) questionsNamed.add(question);
        }
        const nameWords = new Set(
          Object.entries(told)
            .filter(([key]) => !!personSlot(key))
            .flatMap(([, value]) => SUBJECT_WORDS.wordsOf(value.text)),
        );
        for (const word of SUBJECT_WORDS.of(done.text))
          if (!nameWords.has(word))
            subjectSaid.set(word, (subjectSaid.get(word) ?? P.zero) + P.one);
      }
    }
    if (!address.moves.length) {
      if (block.required) return null;
      continue;
    }
    for (const [at, move] of address.moves.entries()) {
      const facts = toldOf[at] ?? block.facts;
      const used = new Set(move.parts.flatMap((part) => usedKeys(part)));
      // A crafted device cites the addresses that earned it.
      const earned = move.parts.some((part) => part.device) ? craft : [];
      const visit = used.has("place")
        ? block.facts.place?.sourceRecordIds
            .map((id) => /:visit:(US-[A-Z]{2})$/.exec(id)?.[P.one])
            .find(Boolean)
        : undefined;
      sentences.push({
        level: block.level,
        part: block.part,
        text: move.text,
        facts: [...used].sort(),
        pieces: move.parts.map((part) => part.variantKey),
        values: Object.fromEntries(
          [...used].sort().map((key) => [key, facts[key]?.text ?? ""]),
        ),
        ...(visit ? { stateKey: visit } : {}),
        ...(block.facts.about &&
        block.facts.to &&
        (block.facts["stance-for"] || block.facts["stance-against"])
          ? {
              stand: {
                about: block.facts.about.text,
                to: block.facts.to.text,
                stance: block.facts["stance-for"]
                  ? ("for" as const)
                  : ("against" as const),
              },
            }
          : {}),
        sourceRecordIds: [
          ...new Set([
            president.id,
            ...[...used].flatMap(
              (key) => block.facts[key]?.sourceRecordIds ?? [],
            ),
            ...earned,
          ]),
        ],
      });
    }
  }
  return sentences;
}

/**
 * Compose the opening from the world's records. Pure: reads the core and
 * writes nothing. Null when the world seats no President or the address
 * can't open and close from the record.
 */
export function composeOpeningStory(
  core: CoreState,
  playerId: PersonId,
): OpeningStory | null {
  const api = coreAPI(core);
  const player = core.people.get(playerId);
  const official = officialsIn(api, "US:president")[P.zero];
  const president = official ? core.people.get(official.id) : undefined;
  if (!player || !official || !president) return null;
  // Inaugural only when the offices engine recorded the taking of office
  // today (recordInauguration); every other opening is the address to Congress.
  const kind: OpeningSpeechKind = core.eventIds.has(
    `${INAUGURATION_EVENT}:${core.date}`,
  )
    ? "inaugural"
    : "state-of-the-union";
  const composed = composeAddressOf(core, president, official, kind);
  if (!composed?.sentences.length) return null;
  const { sentences, addressKind, theme, asks, points } = composed;
  const pastFact = (kindKey: string) =>
    (president.pastFacts ?? []).find((row) => row.kind === kindKey);
  const home = pastFact(PRESIDENT_FACT.homeState);
  const prior = pastFact(PRESIDENT_FACT.priorOffice);
  const elected = pastFact(PRESIDENT_FACT.elected);
  const remembered =
    sentences.find(
      (row) => row.level === "congress" && row.sourceRecordIds.length > P.one,
    ) ??
    sentences.find((row) => row.level === "country") ??
    sentences[P.zero]!;
  const id = `${OPENING_ADDRESS_EVENT}:${core.date}`;
  const allIds = [...new Set(sentences.flatMap((row) => row.sourceRecordIds))];
  const household = core.households.get(player.householdId);
  return {
    id,
    date: core.date,
    speechKind: kind,
    addressKind,
    theme,
    asks,
    points,
    president: {
      id: president.id,
      name: `${president.givenName} ${president.familyName}`,
      homeState: home?.facts?.stateName ?? null,
      priorOffice: prior?.facts?.title ?? null,
      sourceRecordIds: [
        official.id,
        ...[home, prior, elected].flatMap((row) => (row ? [row.id] : [])),
      ],
    },
    address: {
      sentences,
      openingLine: sentences[P.zero]!,
      rememberedLine: remembered,
      text: sentences.map((row) => row.text).join(" "),
      parts: [...new Set(sentences.map((row) => row.part))].map((part) =>
        sentences
          .filter((row) => row.part === part)
          .map((row) => row.text)
          .join(" "),
      ),
      sourceRecordIds: allIds,
    },
    home: {
      date: core.date,
      householdId: player.householdId,
      memberIds: (household?.memberIds ?? []).filter(
        (memberId) => core.people.get(memberId)?.alive,
      ),
      subjectEventId: id,
    },
  };
}

/**
 * Record the address once, as a public event on the opening day: the news
 * engine carries it to the town, the player and the household watching it
 * with them on the news at home saw it, and anyone who hears it can bring it
 * up. Returns the story it recorded, or null.
 */
export function recordOpeningStory(
  core: CoreState,
  playerId: PersonId,
): OpeningStory | null {
  // The key chambers organize now, the first time anything needs their
  // leaders, so composing reads them as they stand.
  const api = coreAPI(core);
  if (api.state.modules.has(LEADERSHIP_MODULE_ID))
    for (const chamber of keyChambersOf(core, playerId)) organize(api, chamber);
  const story = composeOpeningStory(core, playerId);
  if (!story) return null;
  applyCoreEvent(core, {
    id: story.id,
    date: core.date as never,
    kind: OPENING_ADDRESS_EVENT,
    personIds: [story.president.id],
    // The household watches it with the player, on the news they have on.
    witnessIds: [
      playerId,
      ...story.home.memberIds.filter(
        (id) => id !== playerId && core.people.has(id),
      ),
    ],
    placeId: core.people.get(playerId)!.placeId,
    source: {
      tag: "SOURCED",
      citation:
        "The President's address, composed by the English engine from the world's records (data/english/parts/opening-speech.json).",
      asOf: core.date as never,
    },
    publicRecord: true,
    news: true,
    facts: {
      // National news on every town's wire.
      level: "federal",
      [ADDRESS_FACT.event]: story.id,
      ...(core.eventIds.has(`${INAUGURATION_EVENT}:${core.date}`)
        ? { [ADDRESS_FACT.inauguration]: `${INAUGURATION_EVENT}:${core.date}` }
        : {}),
      [ADDRESS_FACT.president]: story.president.id,
      [ADDRESS_FACT.speaker]: story.president.id,
      [ADDRESS_FACT.kind]: story.speechKind,
      [ADDRESS_FACT.style]: story.addressKind,
      [ADDRESS_FACT.opening]: story.address.openingLine.text,
      [ADDRESS_FACT.remembered]: story.address.rememberedLine.text,
      [ADDRESS_FACT.text]: story.address.text,
      [ADDRESS_FACT.parts]: story.address.parts.join(ADDRESS_PART_BREAK),
      [ADDRESS_FACT.pieces]: addressPiecesFact(
        story.address.sentences,
        story.points,
      ),
    },
  });
  return story;
}
