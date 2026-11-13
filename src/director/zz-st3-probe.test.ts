import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate, addDays } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  BRIBE_OFFERED,
  BRIBE_PRESSED,
  considerBribe,
  crimeRecord,
} from "../core2/modules/corruption";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import situationFile from "./data/situation-types.json" with { type: "json" };
import { createDirector } from "./ledger";
import { chooseVariant } from "./arc-variant";
import { purposeScene, replyInScene } from "./purpose-scene";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
} from "./scene-talk";

// One kind of scene, several arcs (owner, Nov 8, 9:50 voice note): the
// variants of the corruption scenes, picked from the records by one engine.
// The first half composes every variant from a generic fixture; the second
// plays a world drawn from all 56 places on a seed the builder did not
// choose, where different causes in one played year give different variants.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

type Row = { purpose: string; pull?: readonly string[] };
const FAMILIES = (
  variantFile as unknown as {
    families: Record<string, { variants: Record<string, Row> }>;
  }
).families;
const TYPES = (situationFile as unknown as { types: PurposeType[] }).types;
// A family is a purpose: the type that plays it (a reporter's call is the
// press-interview type, whose purpose is press-comment).
const typeOf = (family: string) =>
  TYPES.find((row) => row.key === family) ??
  TYPES.find((row) => row.purpose === family)!;
const played = (family: string, variant: string): PurposeType => {
  const type = typeOf(family);
  const purpose = FAMILIES[family]!.variants[variant]!.purpose;
  return purpose === type.purpose
    ? type
    : { ...type, purpose, family: type.purpose };
};

const base = enrichCivicInputs(
  buildPopulation({
    seed: "arc-variant-fixture",
    startedAt: "2021-01-01",
    minimumPeople: 300,
  }),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const adults = base.people.filter(
  (person) => person.tier !== "husk" && age(person.birthDate) >= 25,
);
const input = { ...base, playerId: adults[0]!.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-01-03");
const askerId = adults[1]!.id;
const askedId = adults[0]!.id;
const fact = (text: string): Fact => ({ text, sourceRecordIds: [askerId] });
const generic: Record<string, Fact> = {
  name: fact("Pat Rivera"),
  first: fact(core.people.get(askedId)!.givenName),
  place: fact("the town"),
};

// What a donor's gift hands the scene (purpose-scene.ts, campaign-gift): the
// amount, and the bill the donor holds the strongest view on.
const donorFacts: Record<string, Fact> = {
  ...generic,
  money: fact("$2,500"),
  gift: fact("$2,500"),
  bill: fact("Bill 14"),
  "donor-bill": fact("Bill 14"),
  // The side the donor wants and what the bill is about (donor-ask-facts.ts).
  "want-against": fact("yes"),
  about: fact("free fares on public transit"),
};
// What a reporter's call hands the scene (purpose-scene.ts, press-interview):
// the bill, the outlet, and the facts the variant's reads add to the scene
// (`read-<name>`, set only where the read came to more than nothing).
const pressFacts: Record<string, Fact> = {
  ...generic,
  bill: fact("Bill 14"),
  outlet: fact("the Courier"),
  "vote-held": fact("Bill 14"),
  "read-town-against": fact("yes"),
  "read-scandal": fact("yes"),
  // The member's own vote on it, as the facts module reads it from the roll
  // (press-comment-facts.ts): a reporter calls after the vote.
  "own-vote": fact("yes"),
  "stand-against": fact("yes"),
  about: fact("free fares on public transit"),
  "next-dead": fact("yes"),
};
// What an accusation hands the plain arc's lines (a bill the accuser names).
const accuseFacts: Record<string, Fact> = { ...generic, bill: fact("Bill 14") };
// What a colleague's ask for a vote hands the scene: the bill, the bill the
// asker already voted for (`earlier`) and the reads that came to something.
const voteFacts: Record<string, Fact> = {
  ...generic,
  bill: fact("Bill 14"),
  earlier: fact("Bill 9"),
  "read-holds-post": fact("yes"),
  "read-same-party": fact("yes"),
  "read-favor-given": fact("yes"),
  "read-town-for-bill": fact("yes"),
  "read-close": fact("yes"),
};
// What an office-hours visit hands the scene (constituent-help-facts.ts): the
// employer lost and how long ago, the rent owed and its day, the pay and the
// floor, the relative who is ill, and the reads that came to something.
const helpFacts: Record<string, Fact> = {
  ...generic,
  employer: fact("Hartley Foods"),
  since: fact("two months"),
  owed: fact("$1,850"),
  deadline: fact("March 14th"),
  pay: fact("$6.50"),
  floor: fact("$7.25"),
  relative: fact("Dana"),
  "read-laid-off": fact("yes"),
  "read-notice-served": fact("yes"),
  "read-paid-under-floor": fact("yes"),
  "read-household-illness": fact("yes"),
  // The case on the office's books (caseFacts).
  "problem-work": fact("yes"),
  "money-left": fact("running low"),
  agency: fact("the workforce office"),
  "respond-in": fact("in seven days"),
};
// What a bribe hands the scene (bribe-facts.ts): the price and the bill.
const bribeFactsOf: Record<string, Fact> = {
  ...generic,
  amount: fact("about $400"),
  "favor-vote": fact("yes"),
  bill: fact("the free-fares ordinance"),
};
const factsOf = (family: string) =>
  family === "bribe-offer" || family === "bribe-pressed"
    ? bribeFactsOf
    : family === "donor-ask"
      ? donorFacts
      : family === "press-comment"
        ? pressFacts
        : family === "conflict-accuse"
          ? accuseFacts
          : family === "ask-vote"
            ? voteFacts
            : family === "constituent-help"
              ? helpFacts
              : generic;

const everyLine = (node: TreeNode | null, into: string[] = []): string[] => {
  if (!node) return into;
  for (const line of node.lines) into.push(line.text);
  if (node.end?.close) into.push(node.end.close.text);
  for (const reply of node.replies) {
    into.push(reply.line.text);
    everyLine(reply.next, into);
  }
  for (const branch of node.branches ?? []) everyLine(branch.node, into);
  return into;
};

/** The facts of a wage case: the problem is the pay, not a job lost. */
const wageCase = (facts: Record<string, Fact>): Record<string, Fact> => {
  const wage = {
    ...facts,
    "problem-wage": fact("yes"),
    agency: fact("the labor standards office"),
  };
  delete wage["problem-work"];
  delete wage["money-left"];
  return wage;
};

const compose = (
  family: string,
  variant: string,
  // A wage case is the short-pay scene's: the case's own problem (caseFacts).
  facts: Record<string, Fact> = variant === "short-pay"
    ? wageCase(factsOf(family))
    : factsOf(family),
  causeId = "cause-a",
): SceneTalk => {
  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId, causeId },
    played(family, variant),
    facts,
    {},
    { includeHeld: true },
  );
  expect(result.kind, `${family}/${variant} ${JSON.stringify(result)}`).toBe(
    "composed",
  );
  if (result.kind !== "composed") throw new Error("not composed");
  return result.talk;
};


it("probe", () => {
  for (const [F, row] of Object.entries(FAMILIES)) {
    if (process.env.FAM && F !== process.env.FAM) continue;
    for (const v of Object.keys(row.variants)) {
      const talk = compose(F, v);
      const bad = talk.gaps.filter((gap) => /\/(reply|follow|close|end|ending)\//.test(gap));
      process.stdout.write(`PROBE ${F}/${v} depth=${talk.depth} replies=${talk.tree.replies.length} bad=${JSON.stringify(bad)} all=${JSON.stringify(talk.gaps)} endings=${JSON.stringify(talk.endingCounts)}\n`);
      if (process.env.SHOW) process.stdout.write(JSON.stringify(talk.tree, (k, v) => (k === "lines" || k === "replies" || k === "next" || k === "text" || k === "line" || k==="move" || k==="end" || k==="close" || k==="ending" || k==="label" || /^\d+$/.test(k) || k==="") ? v : undefined, 1) + "\n");
    }
  }
});
