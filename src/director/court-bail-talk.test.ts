/**
 * Bail told as the pretrial record has it (Words lead, Nov 14: "Out on bail."
 * answered a bail the person had said was more than they have). Pinned to
 * Cinco Bayou, Florida (court-h:1), where the engine posted the bail and the
 * accused's cash afterward reads short of it, and to North Druid Hills,
 * Georgia (court-h:0), where they could not post it and were held.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type InvestigationRow,
} from "../core2/modules/justice";
import {
  CORRUPTION_MODULE_ID,
  type CrimeRecord,
} from "../core2/modules/corruption";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { subjectsBetween } from "./conversation";
import { composeConversationLine } from "../english/conversation-words";

const ageOf = (birth: string, on: string) =>
  Number(on.slice(0, 4)) - Number(birth.slice(0, 4));

function chargedFacts(seed: string, draw: number) {
  setBookkeeping(false);
  const place = drawPlace(`${seed}:${draw}`, "court-case");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const api = coreAPI(core);
  director.watch(core, playerId);
  const home = core.households.get(
    core.people.get(playerId)!.householdId as never,
  );
  for (const id of home?.memberIds ?? []) director.watch(core, id);
  const accused = (home?.memberIds ?? []).find((id) => {
    const person = core.people.get(id);
    return (
      id !== playerId &&
      person?.alive &&
      ageOf(person.birthDate, core.date) >= 18
    );
  })!;
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);
  const crime: CrimeRecord = {
    id: `crime:court-case:${seed}:${draw}`,
    kind: "bribe",
    date: core.date,
    offererId: accused,
    officialId: playerId,
    amountMinor: 100_000,
    subjectId: "",
    offered: true,
    taken: true,
    reasons: {},
  } as CrimeRecord;
  api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("crimes")
    .put(crime as never);
  const investigation: InvestigationRow = {
    id: `investigation:court-case:${seed}:${draw}`,
    complaintIds: [],
    crimeId: crime.id,
    prosecutorOfficeId: "office:court-case",
    prosecutorPersonId: null,
    opened: true,
    date: core.date,
    reasons: {},
    targets: [
      { personId: accused, crimeIds: [crime.id], evidence: [], strength: 1 },
    ],
    status: "open",
  };
  table("investigations").put(investigation as never);
  chargeDecision(api, investigation.id);
  const caseId = `case:${investigation.id}:${accused}`;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const subject = subjectsBetween(core, accused, playerId, director).find(
    (row) => row.kind === "charge",
  )!;
  const pretrial = core.durableLog.get(
    `justice.pretrial:${caseId}` as never,
  ) as {
    facts: Record<string, string>;
  };
  return { facts: subject.facts, decision: pretrial.facts.decision };
}

const fact = (text: string) => ({ text, sourceRecordIds: ["case:test"] });
const answers = (facts: Record<string, ReturnType<typeof fact>>) => {
  const heard = new Set<string>();
  for (let at = 0; at < 40; at += 1)
    heard.add(
      composeConversationLine({
        seed: "court-bail-talk",
        subject: "charge-reply-back",
        speakerId: "person_test" as PersonId,
        traits: {},
        facts: { "told-plea": fact("yes"), plea: fact("yes"), ...facts },
        stage: "ask",
        momentKey: `bail:${at}`,
      })?.text ?? "",
    );
  return heard;
};

describe("bail is told from the pretrial record", () => {
  it("a posted bail is said as covered, and 'Out on bail.' may be said (Cinco Bayou, court-h:1)", () => {
    const { facts, decision } = chargedFacts("court-h", 1);
    expect(decision).toBe("posted");
    expect(facts.bailPosted).toBeDefined();
    expect(facts.bailCovered).toBeDefined();
    expect(facts.bailOver).toBeUndefined();
  }, 120_000);

  it("a bail they could not post is said as more than they have, and never 'Out on bail.' (North Druid Hills, court-h:0)", () => {
    const { facts, decision } = chargedFacts("court-h", 0);
    expect(decision).toBe("held");
    expect(facts.bailOver).toBeDefined();
    expect(facts.bailPosted).toBeUndefined();
    expect(
      answers({ bail: fact("about $10,000"), bailOver: fact("yes") }),
    ).not.toContain("Out on bail.");
  }, 120_000);
});
