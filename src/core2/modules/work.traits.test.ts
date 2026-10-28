import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { scoreOffers, traitLean } from "../choice";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { parameter } from "../parameters";
import workData from "../data/work.json" with { type: "json" };
import { careNeedOf } from "./health";
import type { ActionDefinition, ActOffer } from "../types";

// Whether someone goes to a shift is decided mostly by their health, a
// little by their temperament: the absence offer carries the person's own
// care need as a reason, and the trait term is held to the small size the
// absence research allows.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "work-traits");

it(`illness, not temperament, decides most missed shifts in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  // A week of play, so the health engine has booked each person's plan.
  const end = new Date(`${core.date}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  advanceCore(core, end.toISOString().slice(0, 10));
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const attend = workData.attendanceAction as unknown as ActionDefinition;
  const absent = workData.absenceAction as unknown as ActionDefinition;
  const offers = (id: string): ActOffer[] => [
    { definition: absent, targetId: id, availableHours: 8 },
    { definition: attend, targetId: id, availableHours: 8 },
  ];
  const workers = [...core.people.values()].filter(
    (row) => row.alive && row.jobId,
  );
  expect(workers.length, where).toBeGreaterThan(20);
  const absenceReasons = (id: string) =>
    scoreOffers(core, id, offers(`work-commitment:test:${id}`))[0]!.reasons;
  // The sickest and the healthiest worker: the sick one's absence carries their care need.
  const byNeed = [...workers].sort(
    (a, b) =>
      careNeedOf(core, a.id) - careNeedOf(core, b.id) ||
      a.id.localeCompare(b.id),
  );
  const sick = byNeed.at(-1)!,
    well = byNeed[0]!;
  expect(careNeedOf(core, sick.id), `${where}: ${sick.id}`).toBeGreaterThan(0);
  expect(absenceReasons(sick.id).module, `${where}: ${sick.id}`).toBeCloseTo(
    careNeedOf(core, sick.id) *
      parameter("workAbsenceIllnessWeight", core.data.parameters),
    9,
  );
  expect(absenceReasons(well.id).module ?? 0, `${where}: ${well.id}`).toBe(0);
  // Opposite temperaments: the trait term differs by the calibrated weight
  // times their lean gap, and stays smaller than the illness term of a sick worker.
  const lean = (id: string) =>
    traitLean(core, core.people.get(id)!, absent.actKinds);
  const byLean = [...workers].sort(
    (a, b) => lean(a.id) - lean(b.id) || a.id.localeCompare(b.id),
  );
  const steady = byLean[0]!,
    drifting = byLean.at(-1)!;
  const gap =
    absenceReasons(drifting.id).trait - absenceReasons(steady.id).trait;
  const weight = parameter("traitWeightWorkAttendShift", core.data.parameters);
  expect(gap, where).toBeCloseTo(
    weight * (lean(drifting.id) - lean(steady.id)),
    9,
  );
  expect(gap, `${where}: ${drifting.id} vs ${steady.id}`).toBeGreaterThan(0);
  expect(gap, where).toBeLessThan(
    careNeedOf(core, sick.id) *
      parameter("workAbsenceIllnessWeight", core.data.parameters),
  );
}, 120_000);
