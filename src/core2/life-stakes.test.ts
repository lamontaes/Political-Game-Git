/**
 * A person's view comes from their own life (SG-GOV-views-stand-in, cut 1):
 * renters and owners, workers and the jobless, parents of young children and
 * people with no private health plan hold different stances on the questions
 * their circumstances bear on, read from the records the engines keep, for a
 * counted resident and a full person alike, and a view moves when a life
 * changes. Pinned to named places and world seeds so it never passes or
 * fails by the draw.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { groupStance } from "./campaign-views";
import { setBookkeeping } from "./bookkeeping";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { stakeReasons, stakeShift } from "./life-stake-rule";
import { countedLifeStake, fullLifeStake } from "./life-stakes";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { countedStanceProfile, lifeShift } from "./modules/views";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState, PersonId } from "./types";

// Found by drawing with base seed lv5 (purpose "life-stakes"), Nov 14: a town
// with counted renters and owners and full workers who lose work in the first
// weeks. One world serves the three checks, in order (the last two fill
// people in and play on), so the file stays near a minute.
const MARSHFIELD = {
  name: "Marshfield, Massachusetts",
  key: "2538820",
  seed: "75d9b7ad36560f47b03a252ae33001b88ec529e8f4871fa480acf053c7642a78",
};
const RENT = "us-policy-positions:housing-land-use.rent-stabilization";
const TAX_CAP = "us-policy-positions:fiscal.cap-property-tax-growth";
const WORK_RULE =
  "us-policy-positions:health-human-services.medicaid-work-requirement";

const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

function open(place: typeof MARSHFIELD) {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const c = core as CoreState;
  const api = coreAPI(c);
  const town = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as {
      townPlaceId: string;
    }
  ).townPlaceId;
  return { core: c, api, town };
}

const where = (place: typeof MARSHFIELD) =>
  `${place.name} (${place.key}), seed ${place.seed}`;

describe("views from the person's own life", () => {
  let world: ReturnType<typeof open>;
  beforeAll(() => {
    world = open(MARSHFIELD);
  }, 120_000);

  it("renters and owners in the same town stand apart on rent and property tax, by their tenure", () => {
    {
      const place = MARSHFIELD;
      const { core, api, town } = world;
      const adults = countedResidents(core).filter(
        (voter) => voter.placeId === town && voter.birthDate < "2000-01-01",
      );
      const read = adults.map((voter) => ({
        voter,
        profile: countedStanceProfile(api, voter),
      }));
      const renters = read.filter((row) => row.profile.life?.facts.rents === 1);
      const owners = read.filter((row) => row.profile.life?.facts.rents === 0);
      expect(renters.length, where(place)).toBeGreaterThan(20);
      expect(owners.length, where(place)).toBeGreaterThan(20);
      // Two townspeople at the same lean, faith and degree: their own tenure
      // alone parts them, by how much each weighs their stake.
      const renter = renters[0]!;
      const owner = owners[0]!;
      const at = (row: (typeof read)[number], question: string) =>
        groupStance(0, question, { life: row.profile.life });
      const who = `${where(place)}: renter ${renter.voter.id}, owner ${owner.voter.id}`;
      expect(at(renter, RENT), who).toBeGreaterThan(at(owner, RENT));
      expect(at(owner, TAX_CAP), who).toBeGreaterThan(at(renter, TAX_CAP));
      const reasons = stakeReasons(renter.profile.life, RENT);
      expect(
        reasons.map((row) => row.fact),
        who,
      ).toEqual(["rents"]);
      expect(reasons[0]!.adds, who).toBeCloseTo(
        stakeShift(renter.profile.life, RENT),
        12,
      );
      // Across the town, with each resident's own lean, faith and degree:
      // renters lean further toward rent stabilization than owners.
      const mean = (rows: typeof read) =>
        rows.reduce(
          (sum, row) =>
            sum + stakeShift(row.profile.life, RENT) * row.voter.weight,
          0,
        ) / rows.reduce((sum, row) => sum + row.voter.weight, 0);
      expect(mean(renters), where(place)).toBeGreaterThan(0);
      expect(mean(owners), where(place)).toBeLessThan(0);
    }
  }, 120_000);

  it("a counted resident filled in keeps the circumstances their household's record gave them", () => {
    const { core, town } = world;
    const adults = countedResidents(core).filter(
      (voter) => voter.placeId === town && voter.birthDate < "1990-01-01",
    );
    const picked = adults.filter(
      (_, i) => i % Math.ceil(adults.length / 12) === 0,
    );
    let compared = 0;
    for (const voter of picked) {
      const counted = countedLifeStake(core, voter.id);
      // Filling in a household takes all of it: a later pick from it is full already.
      if (!counted) continue;
      fillInPerson(core, voter.id as PersonId);
      const full = fullLifeStake(core, core.people.get(voter.id as PersonId)!);
      const who = `${where(MARSHFIELD)}: ${voter.id}`;
      expect(full.care, who).toBeCloseTo(counted.care, 12);
      for (const fact of ["rents", "youngChild", "publicWorker"] as const)
        expect(full.facts[fact], `${who} ${fact}`).toBe(counted.facts[fact]);
      // Work and the health plan: a counted household's unplaced workers and
      // its plan's covered people are shares across its members until one is
      // filled in, then a job or not, a plan or not.
      for (const fact of ["noWork", "noPrivatePlan"] as const)
        if (counted.facts[fact] === 0 || counted.facts[fact] === 1)
          expect(full.facts[fact], `${who} ${fact}`).toBe(counted.facts[fact]);
      compared += 1;
    }
    expect(compared, where(MARSHFIELD)).toBeGreaterThan(5);
  }, 120_000);

  it("losing a job moves a full person's view on a Medicaid work requirement the day the records change", () => {
    const { core, api, town } = world;
    const workers = [...core.people.values()].filter((person) => {
      if (!person.alive || person.placeId !== town || !person.jobId)
        return false;
      const job = core.jobs.get(person.jobId);
      return !!job && job.endsAt === undefined;
    });
    const opening = new Map(
      workers.map((person) => [
        person.id,
        {
          stake: fullLifeStake(core, person),
          shift: lifeShift(api, person.id, WORK_RULE),
        },
      ]),
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    const lost = workers.filter((person) => {
      const now = core.people.get(person.id)!;
      const job = now.jobId ? core.jobs.get(now.jobId) : undefined;
      return now.alive && (!job || job.endsAt !== undefined);
    });
    expect(lost.length, where(MARSHFIELD)).toBeGreaterThan(0);
    let moved = 0;
    for (const person of lost) {
      const was = opening.get(person.id)!;
      const now = fullLifeStake(core, core.people.get(person.id)!);
      if (was.stake.facts.noWork !== 0 || now.facts.noWork !== 1) continue;
      const who = `${where(MARSHFIELD)}: ${person.id} on ${core.date}`;
      const shift = lifeShift(api, person.id, WORK_RULE);
      // The work requirement asks more of someone out of work: they move against it.
      expect(shift, who).toBeLessThan(was.shift);
      const reasons = stakeReasons(now, WORK_RULE);
      expect(reasons.find((row) => row.fact === "noWork")?.value, who).toBe(1);
      moved += 1;
    }
    expect(moved, where(MARSHFIELD)).toBeGreaterThan(0);
  }, 180_000);
});
