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
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { openLaws } from "../core2/modules/laws";
import { openOffices, townSeats } from "../core2/modules/offices";
import { openRecord } from "../core2/modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "../core2/modules/elections";
import {
  campaignFor,
  causesFor,
  doorsKnockedOf,
  openCampaigns,
} from "../core2/modules/campaigns";
import { openParties } from "../core2/modules/parties";
import { interviewsFor, openPress } from "../core2/modules/press";
import { viewsModule } from "../core2/modules/views";
import { campaignDay, campaignView } from "./campaign";
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
  for (const candidate of adults.slice(0, 5)) {
    core.playerId = candidate.id;
    for (const contest of openContests(api)) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
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
  // The campaign day has no list of acts: the doors, an event, an interview and the calls, each named by a control.
  expect(
    view.outings.map((c) => c.outing),
    where,
  ).toEqual(["doors", "event", "interview", "calls"]);
  expect("day" in view, `no Today list: ${where}`).toBe(false);
  for (const choice of view.outings)
    expect(
      (controls.campaignOutings as Record<string, string>)[choice.outing],
      `${choice.outing}: ${where}`,
    ).toBeTruthy();
  expect(view.outings.find((c) => c.outing === "doors")!.available, where).toBe(
    true,
  );
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
  // The doors open as a scene on a street, naming the households that
  // answered, when someone answered; on a day nobody did there is no scene
  // and no household. The households are the distinct households of the
  // people the engine recorded a door cause for (one household can give
  // several causes, so this is not the count of causes reached).
  const answered = [...core.people.values()].filter((person) =>
    causesFor(api, person.id, personId).some((cause) => cause.act === "door"),
  );
  const answeredHouseholds = new Set(
    answered.map((person) => person.householdId),
  );
  expect(
    new Set(taken.households),
    `households that answered: ${where}`,
  ).toEqual(answeredHouseholds);
  expect(taken.reached, `causes recorded: ${where}`).toBeGreaterThanOrEqual(
    answered.length,
  );
  if (answered.length > 0) {
    expect(taken.scene?.place, where).toMatch(/^door-knocking-/);
  } else {
    expect(
      taken.scene,
      `no scene when nobody answered: ${where}`,
    ).toBeUndefined();
    expect(taken.households, where).toEqual([]);
  }
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

  // An interview asked of an outlet that covers the race writes the engine's own interview row.
  const interview = view.outings.find((c) => c.outing === "interview")!;
  expect(
    townSeats(api).some((s) => s.holder?.personId === personId),
    `the candidate holds no seat: ${where}`,
  ).toBe(false);
  expect(interview.available, `an outlet covers the race: ${where}`).toBe(true);
  expect(interview.outletId, where).toBeTruthy();
  const asked = campaignDay(core, personId, {
    filingId: filing!.id,
    kind: "interview",
    outletId: interview.outletId!,
  });
  expect(asked.interview?.outletId, where).toBe(interview.outletId);
  expect(
    interviewsFor(api, personId).some((i) => i.id === asked.interview!.id),
    where,
  ).toBe(true);
  // An event needs the venue's price in the campaign's account: the calls raise it first, then the event is held.
  const eventControl = () =>
    campaignView(core, personId)
      .campaigns.find((c) => c.filing.id === filing!.id)!
      .outings.find((c) => c.outing === "event")!;
  // The calls raise what donors give; they stop when a day raises nothing (each donor is asked once).
  let callDays = 0;
  for (;;) {
    if (eventControl().available) break;
    if (++callDays > 200) throw new Error(`the calls never ran dry: ${where}`);
    const calls = campaignDay(core, personId, {
      filingId: filing!.id,
      kind: "raise-money",
    });
    if (calls.raisedMinor === 0) break;
  }
  if (eventControl().available) {
    const held = campaignDay(core, personId, {
      filingId: filing!.id,
      kind: "event",
    });
    expect(held.kind, where).toBe("event");
    expect(held.reached, `people the event reached: ${where}`).toBeGreaterThan(
      0,
    );
  } else {
    // The records do not let this campaign pay the venue: the engine refuses.
    expect(
      () =>
        campaignDay(core, personId, { filingId: filing!.id, kind: "event" }),
      `an event the campaign cannot pay for is refused: ${where}`,
    ).toThrow();
  }

  // Rest takes the day and writes no act.
  expect(
    campaignDay(core, personId, { filingId: filing!.id, kind: "rest" }).reached,
    where,
  ).toBe(0);
});
