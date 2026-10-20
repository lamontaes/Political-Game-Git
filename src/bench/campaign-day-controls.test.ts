/**
 * The campaign day from play: the choices the records offer come through the
 * bench view with the control names, and taking one runs the engine's own act
 * (owner ruling, Oct 14), in a random place drawn from all 56.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "../core2/population";
import { createLifeCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { openLaws } from "../core2/modules/laws";
import { openOffices } from "../core2/modules/offices";
import { openRecord } from "../core2/modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "../core2/modules/elections";
import {
  campaignFor,
  doorsKnockedOf,
  openCampaigns,
} from "../core2/modules/campaigns";
import { openParties } from "../core2/modules/parties";
import { openPress, outletsHere } from "../core2/modules/press";
import { viewsModule } from "../core2/modules/views";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { campaignDay, campaignView, interviewAnswer } from "./campaign";
import controls from "./data/controls.json" with { type: "json" };

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-day-controls:${Date.now()}`)
    .digest("hex");

function setup() {
  const place = drawPlace(runSeed, "campaign-day-controls");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: FilingRow | null = null;
  for (const candidate of adults) {
    core.playerId = candidate.id;
    for (const contest of openContests(api)) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (filed.status !== "refused" && filed.filing.status === "on-ballot") {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  return { core: core as CoreState, api, filing, where };
}

it("shows the day's choices with control names and runs the one taken through the engine", () => {
  const { core, api, filing, where } = setup();
  expect(filing, `the player could file for nothing: ${where}`).not.toBeNull();
  const personId = filing!.personId;

  const view = campaignView(core, personId).campaigns.find(
    (c) => c.filing.id === filing!.id,
  )!;
  expect(
    view.day.map((c) => c.kind),
    where,
  ).toEqual(["canvass", "event", "interview", "raise-money", "rest"]);
  // Every choice has a control name in controls.json: no text is written in the screen.
  for (const choice of view.day)
    expect(
      (controls.campaignDay as Record<string, string>)[choice.kind],
      `${choice.kind}: ${where}`,
    ).toBeTruthy();
  expect(view.day.find((c) => c.kind === "canvass")!.available, where).toBe(
    true,
  );
  // An event needs the venue's price in the campaign's account first.
  expect(view.day.find((c) => c.kind === "event")!.available, where).toBe(
    false,
  );
  expect(
    () => campaignDay(core, personId, { filingId: filing!.id, kind: "event" }),
    where,
  ).toThrow();
  expect(
    () =>
      campaignDay(core, "someone-else", { filingId: filing!.id, kind: "rest" }),
    where,
  ).toThrow();

  // Canvass: the doors knocked on the campaign screen are the engine's own records.
  const taken = campaignDay(core, personId, {
    filingId: filing!.id,
    kind: "canvass",
  });
  expect(taken.doorsKnocked, `doors knocked: ${where}`).toBeGreaterThan(0);
  expect(
    doorsKnockedOf(api, campaignFor(api, filing!.id).id).length,
    where,
  ).toBe(taken.doorsKnocked);
  const after = campaignView(core, personId).campaigns.find(
    (c) => c.filing.id === filing!.id,
  )!;
  expect(after.campaign.doors, where).toBe(taken.doorsKnocked);
  // What the race turns on lists the doors act with the people it reached.
  const mine = after.causes.find((who) => who.you)!;
  expect(
    mine.acts.find((a) => a.act === "door")?.reached,
    `the doors in the race's causes: ${where}`,
  ).toBe(taken.reached);

  // Rest takes the day and writes no act.
  expect(
    campaignDay(core, personId, { filingId: filing!.id, kind: "rest" }).reached,
    where,
  ).toBe(0);
});

it("tells an interview the candidate gave as the reporter's questions and their answers", () => {
  const { core, api, filing, where } = setup();
  // Some places have no one among the richest adults who can file (filed as a pool item).
  if (!filing)
    return console.log(`campaign-day-controls: nobody filed: ${where}`);
  const outlets = outletsHere(api).filter((o) => o.tier !== "national");
  let told: ReturnType<typeof campaignDay>["interview"] = null;
  for (const outlet of outlets) {
    const result = campaignDay(core, filing.personId, {
      filingId: filing.id,
      kind: "interview",
      outletId: outlet.id,
    });
    if (result.interview?.status === "published") {
      told = result.interview;
      break;
    }
  }
  if (!told)
    return console.log(
      `campaign-day-controls: no local outlet took the interview: ${where}`,
    );
  expect(told.lines.length, where).toBeGreaterThan(0);
  for (const line of told.lines) {
    expect(line.text, where).not.toMatch(/[{}]/);
    expect(line.sourceRecordIds.length, where).toBeGreaterThan(0);
    expect(
      (controls.campaignDay as Record<string, string>)[line.speaker],
      where,
    ).toBeTruthy();
  }
  console.log(
    `campaign-day-controls: interview ${told.id} told in ${told.lines.length} lines, ${where}`,
  );
});

it("lets the candidate answer an interview an outlet invited them to, move by move", () => {
  const { core, api, filing, where } = setup();
  if (!filing)
    return console.log(`campaign-day-controls: nobody filed: ${where}`);
  const outlet = outletsHere(api).find((o) => o.tier !== "national");
  if (!outlet)
    return console.log(`campaign-day-controls: no local outlet: ${where}`);
  // An invitation waiting (the weekly invitations are the same kind of row).
  const questions = PLATFORM_QUESTIONS.slice(0, 2);
  const id = `interview:fixture:${filing.id}`;
  api
    .moduleState("core2-press-v1")
    .table("interviews")
    .put({
      id,
      outletId: outlet.id,
      candidateId: filing.personId,
      filingId: filing.id,
      contestId: filing.contestId,
      askedBy: "outlet",
      date: core.date,
      status: "invited",
      reason: null,
      questions,
      answers: [],
      audience: 0,
      newsworthiness: 0,
      reporterId: outlet.reporterIds[0] ?? null,
    } as never);
  const view = campaignView(core, filing.personId).campaigns.find(
    (c) => c.filing.id === filing.id,
  )!;
  const waiting = view.interviews.find((i) => i.id === id);
  expect(waiting, where).toBeTruthy();
  // The reporter has opened and asked; the candidate has not answered.
  expect(
    waiting!.lines.every((l) => l.speaker === "reporter"),
    where,
  ).toBe(true);
  expect(() => interviewAnswer(core, "someone-else", id, []), where).toThrow();
  expect(() =>
    interviewAnswer(core, filing.personId, id, [
      { question: questions[0]!, move: "nonsense" },
    ]),
  ).toThrow();
  const done = interviewAnswer(core, filing.personId, id, [
    { question: questions[0]!, move: "brief" },
    { question: questions[1]!, move: "lie" },
  ]);
  expect(done.status, where).toBe("published");
  expect(
    done.lines.some((l) => l.speaker === "candidate"),
    where,
  ).toBe(true);
  for (const line of done.lines) {
    expect(line.text, where).not.toMatch(/[{}]/);
    expect(line.sourceRecordIds.length, where).toBeGreaterThan(0);
  }
  // It is no longer waiting.
  expect(
    campaignView(core, filing.personId)
      .campaigns.find((c) => c.filing.id === filing.id)!
      .interviews.some((i) => i.id === id),
    where,
  ).toBe(false);
});
