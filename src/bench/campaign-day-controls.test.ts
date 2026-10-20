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
import { openPress } from "../core2/modules/press";
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
  // The campaign day has no list of acts: only the doors and the calls open as scenes, each named by a control.
  expect(
    view.outings.map((c) => c.outing),
    where,
  ).toEqual(["doors", "calls"]);
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
  // The doors open as a scene on a street, naming the households that answered.
  expect(taken.scene?.place, where).toMatch(/^door-knocking-/);
  expect(taken.households.length, `households that answered: ${where}`).toBe(
    taken.reached,
  );
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
