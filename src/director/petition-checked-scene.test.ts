import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import {
  campaignDayChoices,
  takeCampaignDayChoice,
} from "../core2/campaign-day";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  fileCandidacy,
  petitionOf,
  petitionSigners,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { endorsementsOf } from "../core2/modules/campaigns";
import {
  JUSTICE_MODULE_ID,
  type CaseRow,
  type SentenceRow,
} from "../core2/modules/justice";
import { purposeScene, replyInScene } from "./purpose-scene";

// The clerk's word on the player's petition, the morning after its deadline.
// One pinned town (Acequia, Idaho, GEOID 1600280), as petition-filing.test.ts
// pins it: the player files a month before the town race's deadline.
const PLACE = "1600280";
const SEED = "1110d0796efcdf584767079f512566be41cf3b19d816526056f3f73445ee8eaf";
const LEAD_DAYS = 30;

/** A person convicted and sentenced, the justice records written as the justice engine writes them (law-reach-felony-voting.test.ts). */
function convict(api: ReturnType<typeof coreAPI>, personId: string) {
  const date = api.state.date;
  const sentence: SentenceRow = {
    id: `sentence:test:${personId}`,
    kind: "person",
    caseId: `case:test:${personId}`,
    personId,
    date,
    severity: 0.5,
    fineMinor: 0,
    finePaidMinor: 0,
    treasuryId: null,
    probationMonths: 0,
    custodyMonths: 24,
    releaseDate: addDays(makeIsoDate(date), 24 * 30),
    seatsVacated: [],
    jobsEnded: [],
    reasons: {},
    source: { tag: "SOURCED", citation: "test", asOf: date },
  };
  const row: CaseRow = {
    id: sentence.caseId,
    kind: "person",
    investigationId: "investigation:test",
    prosecutorOfficeId: "office:test",
    defendantId: personId,
    crimeIds: ["crime:test"],
    evidence: 1,
    date,
    status: "convicted",
    plea: false,
    trialDate: null,
    reasons: {},
    sentenceId: sentence.id,
  };
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);
  table("sentences").put(sentence as never);
  table("cases").put(row as never);
}

function playToTheCheck(strike: boolean, canvassDays = true) {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const latest = addDays(makeIsoDate(core.date), 400);
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter(
      (c) =>
        c.level !== "state" &&
        c.level !== "federal" &&
        !c.special &&
        c.filingDeadline > addDays(makeIsoDate(core.date), LEAD_DAYS) &&
        c.filingDeadline <= latest,
    )
    .sort(
      (a, b) =>
        a.filingDeadline.localeCompare(b.filingDeadline) ||
        a.id.localeCompare(b.id),
    )[0]!;
  advanceCore(core, addDays(makeIsoDate(contest.filingDeadline), -LEAD_DAYS));
  const { townPlaceId } = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 25,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: FilingRow | null = null;
  for (const adult of adults) {
    if (checkEligibility(api, adult.id, contest.id, null).some((c) => !c.met))
      continue;
    core.playerId = adult.id;
    director.watch(core, adult.id);
    const filed = fileCandidacy(api, {
      personId: adult.id,
      contestId: contest.id,
      platform: [],
      party: null,
    });
    if (filed.status !== "refused") {
      filing = filed.filing;
      break;
    }
  }
  const playerId = core.playerId as PersonId;
  const opened = petitionOf(api, filing!.id)!;
  const struck: { moved?: string; died?: string; barred?: string } = {};
  const source = {
    tag: "ESTIMATED" as const,
    asOf: core.date,
    citation: "Staged: a signer is struck before the deadline.",
    estimatedFrom: "src/director/petition-checked-scene.test.ts",
  };
  while (core.date <= opened.due) {
    const canvass = campaignDayChoices(api, filing!.id).find(
      (c) => c.kind === "canvass",
    );
    if (canvassDays && canvass?.available)
      takeCampaignDayChoice(api, filing!.id, "canvass");
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (!strike) continue;
    // Three signers, each struck a different way before the deadline, as
    // soon as three who can be are on the petition: one moves out of town
    // with their household, one dies, one is convicted (the justice
    // records written as the justice engine writes them, as
    // law-reach-felony-voting.test.ts does) and so barred.
    const mine = core.people.get(playerId)!;
    const signers = petitionSigners(api, filing!.id)
      .map((row) => core.people.get(row.personId as PersonId))
      .filter(
        (p) =>
          p &&
          p.alive &&
          p.id !== playerId &&
          p.placeId === townPlaceId &&
          p.householdId !== mine.householdId &&
          !Object.values(struck).includes(p.id),
      );
    const jobless = (householdId: string) =>
      core.households
        .get(householdId)!
        .memberIds.every((id) => !core.people.get(id as PersonId)?.jobId);
    const leaver = struck.moved
      ? undefined
      : signers.find((p) => jobless(p!.householdId));
    const rest = signers.filter(
      (p) => !leaver || p!.householdId !== leaver.householdId,
    );
    if (!struck.moved && leaver && rest.length >= 2) {
      const elsewhere = [...core.people.values()].find(
        (p) => p.placeId !== townPlaceId && p.alive,
      )!.placeId;
      api.relocatePeopleV1({
        personIds: [
          ...core.households.get(leaver.householdId)!.memberIds,
        ] as PersonId[],
        placeId: elsewhere,
        householdId: leaver.householdId,
        source,
      });
      struck.moved = leaver.id;
      struck.died = rest[0]!.id;
      api.updatePerson(struck.died, { alive: false });
      struck.barred = rest.find(
        (p) => p!.id !== struck.died && p!.householdId !== rest[0]!.householdId,
      )?.id;
      if (struck.barred) convict(api, struck.barred);
    }
  }
  advanceCore(core, addDays(makeIsoDate(opened.due), 1));
  return { core, director, api, filing: filing!, playerId, struck, contest };
}

const sceneOf = (run: ReturnType<typeof playToTheCheck>) => {
  const book = run.director.ledger.people.get(run.playerId)!;
  const entry = book.schedule.find(
    (row) =>
      row.momentId.includes(`petition-checked:${run.filing.id}`) &&
      row.bindings.some((b) => b.typeKey === "petition-checked"),
  );
  return {
    entry,
    scene: entry
      ? purposeScene(run.core as CoreState, run.director, run.playerId, entry, {
          typeKey: "petition-checked",
        })
      : null,
  };
};

describe("the clerk's word on the player's petition", () => {
  it("a short petition leaves the player to back someone else, kept as their own endorsement (Acequia, Idaho)", () => {
    const run = playToTheCheck(false, false);
    expect(run.core.date >= petitionOf(run.api, run.filing.id)!.due).toBe(true);
    const { entry, scene } = sceneOf(run);
    expect(entry, "no petition-checked scene staged").toBeTruthy();
    if (scene?.kind !== "composed") return expect.fail("scene not composed");
    const backable = scene.scene.facts.find((row) => row.key === "backable")!;
    expect(backable, "nobody the player would back").toBeTruthy();
    const [theirFiling, theirPerson] = backable.recordIds;
    const byPlayer = () =>
      endorsementsOf(run.api, theirFiling!).filter(
        (row) => row.speakerId === run.playerId,
      );
    // Filing in the race ended the player's earlier backing of this candidate
    // (the engine's own rule: a yes is withdrawn the day its speaker files in the
    // same race), so nothing of theirs backs anyone now.
    expect(byPlayer().filter((row) => row.answer === "yes")).toHaveLength(0);
    const reply = scene.scene.talk.tree.replies.findIndex(
      (row) => row.line.move === "promise",
    );
    expect(reply, "no reply to back them").toBeGreaterThanOrEqual(0);
    const id = replyInScene(
      run.core as CoreState,
      run.director,
      run.playerId,
      entry!,
      [reply],
    );
    expect(id).toBeTruthy();
    const kept = endorsementsOf(run.api, theirFiling!).find(
      (row) => row.speakerId === run.playerId,
    );
    expect(kept?.answer).toBe("yes");
    expect(kept?.endedByFilingId).toBeUndefined();
    expect(kept?.candidateId).toBe(theirPerson);
    expect(kept?.askerId).toBeNull();
    expect(run.core.durableLog.has(`campaign-endorsed:${kept!.id}`)).toBe(true);
    expect(run.core.durableLog.get(id!)?.facts?.backed).toBe(theirFiling);
    // The word is kept once: saying it again changes nothing.
    expect(
      replyInScene(run.core as CoreState, run.director, run.playerId, entry!, [
        reply,
      ]),
    ).toBe(id);
    expect(byPlayer()).toHaveLength(1);
  }, 90_000);

  it("names each kind a signer was struck for (moved, died, barred), by record id and with no count (Acequia, Idaho)", () => {
    const run = playToTheCheck(true);
    const petition = petitionOf(run.api, run.filing.id)!;
    const check = petition.check!;
    const { moved, died, barred } = run.struck;
    expect(moved, "no signer to move").toBeTruthy();
    expect(died, "no signer to die").toBeTruthy();
    expect(barred, "no signer to bar").toBeTruthy();
    expect(check.struckReasons[moved!]).toBe("moved");
    expect(check.struckReasons[died!]).toBe("died");
    expect(check.struckReasons[barred!]).toBe("barred");
    expect(Object.keys(check.struckReasons).sort()).toEqual(
      [...check.struckIds].sort(),
    );
    const { entry, scene } = sceneOf(run);
    expect(entry, "no petition-checked scene staged").toBeTruthy();
    expect(scene?.kind).toBe("composed");
    if (scene?.kind !== "composed") return;
    const fact = (key: string) =>
      scene.scene.facts.find((row) => row.key === key);
    for (const [key, id] of [
      ["struck-moved", moved],
      ["struck-died", died],
      ["struck-barred", barred],
    ] as const) {
      expect(fact(key)?.recordIds, key).toContain(id);
      expect(fact(key)?.recordIds, key).toContain(petition.id);
    }
    for (const line of scene.scene.talk.lines)
      expect(line.text, line.text).not.toMatch(/\d/);
    process.stdout.write(
      scene.scene.talk.lines.map((l) => `${l.role}: ${l.text}`).join("\n") +
        "\n",
    );
  }, 90_000);
});
