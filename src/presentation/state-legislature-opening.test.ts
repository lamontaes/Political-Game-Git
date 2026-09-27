import { beforeAll, describe, expect, it } from "vitest";

import {
  deserializeWorld,
  lifePlaceSearch,
  serializeWorld,
  stateCandidacyPack,
} from "../simulation";
import {
  STATE_LEGISLATURE_KEYS,
  ensureStateLegislatureOpening,
  planStateChambers,
  scheduleNationwideStateLegislatureOpenings,
  stateLegislators,
} from "../simulation/nationwide-world/state-legislature-opening";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { ensureStateJurisdictionForKey } from "../simulation/nationwide-world/state-executives";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  generateOpeningLife,
  generateOpeningLifeWithProgress,
  prepareOpeningLife,
} from "./opening-life";

function placeKey(name: string, state: string): string {
  const found = lifePlaceSearch(name, 20).find(
    (place) => place.displayName === `${name}, ${state}`,
  );
  if (!found) throw new Error(`No place ${name}, ${state}`);
  return found.key;
}

const SETUP = {
  ...DEFAULT_NEW_GAME_SETUP,
  placeKey: placeKey("Valentine", "Nebraska"),
  seed: "state-legislature-nationwide-opening",
};
const SEATED = [
  ["Valentine", "Nebraska", "NE"],
  ["Ely", "Minnesota", "MN"],
  ["Hermann", "Missouri", "MO"],
  ["Tonopah", "Nevada", "NV"],
  ["Ten Sleep", "Wyoming", "WY"],
  ["Eastport", "Maine", "ME"],
  ["Hahira", "Georgia", "GA"],
] as const;

let opened: ReturnType<typeof createNewGameWorld> | undefined;
let openingDate = "";
const progress: Array<{ label: string; completed: number; total: number }> = [];

beforeAll(async () => {
  const initial = createNewGameWorld(SETUP);
  openingDate = initial.world.currentDate;
  const session = await generateOpeningLifeWithProgress(
    prepareOpeningLife(SETUP),
    {
      statesPerChunk: 2,
      onProgress: (entry) => progress.push(entry),
      // Exercise the same caller-controlled chunk boundary without slowing
      // this focused simulation test with browser timer waits.
      yieldControl: async () => undefined,
    },
  );
  opened = session.game!;
}, 120_000);

function openingFor(usps: string) {
  if (!opened) throw new Error("Opening fixture was not prepared.");
  const pack = stateCandidacyPack(`US-${usps}`);
  if (!pack) throw new Error(`Missing state candidacy pack for ${usps}.`);
  return {
    ...opened,
    pack,
    plan: planStateChambers(pack),
    members: stateLegislators(opened.world, pack.packId),
  };
}

describe("nationwide state legislature opening preparation", () => {
  it("seats all 50 state rosters during Begin at the opening date", () => {
    const { world } = opened!;
    const openings = world.history.events.filter(
      (event) => event.type === "world.state-legislature-opening",
    );
    expect(openings).toHaveLength(50);
    const openingKeys = US_STATE_USPS.map((usps) => {
      const pack = stateCandidacyPack(`US-${usps}`)!;
      return STATE_LEGISLATURE_KEYS.opening(pack.packId);
    }).sort();
    expect(openings.map((event) => event.stableKey).sort()).toEqual(
      openingKeys,
    );
    expect(openings.every((event) => event.occurredAt === openingDate)).toBe(
      true,
    );
    expect(openings.every((event) => event.recordedAt === openingDate)).toBe(
      true,
    );
    expect(world.currentDate).toBe(openingDate);
    expect(world.actionSequence).toBe(
      createNewGameWorld(SETUP).world.actionSequence,
    );

    for (const usps of US_STATE_USPS) {
      const pack = stateCandidacyPack(`US-${usps}`)!;
      const expected = planStateChambers(pack).chambers.reduce(
        (total, chamber) => total + chamber.size,
        0,
      );
      expect(stateLegislators(world, pack.packId)).toHaveLength(expected);
    }
    expect(scheduleNationwideStateLegislatureOpenings(world)).toBe(world);
    expect(progress.at(-1)).toEqual({
      label: "Preparing state legislatures",
      completed: 50,
      total: 50,
    });
    expect(progress).toHaveLength(25);
  });

  it("schedules unprepared rosters for the existing clock fallback", () => {
    const incomplete = US_STATE_USPS.reduce(
      (world, usps) => ensureStateJurisdictionForKey(world, `US-${usps}`),
      createNewGameWorld(SETUP).world,
    );
    const scheduled = scheduleNationwideStateLegislatureOpenings(incomplete);
    expect(
      scheduled.history.futureDueItems.filter((due) =>
        due.stableKey.startsWith("state-legislature-opening-calendar/v1:"),
      ),
    ).toHaveLength(50);
  });

  it("can stop between real preparation chunks", async () => {
    const controller = new AbortController();
    const reports: Array<{ label: string; completed: number; total: number }> =
      [];
    const preparation = generateOpeningLifeWithProgress(
      prepareOpeningLife(SETUP),
      {
        signal: controller.signal,
        onProgress: (entry) => {
          reports.push(entry);
          controller.abort();
        },
        yieldControl: async () => undefined,
      },
    );
    await expect(preparation).rejects.toMatchObject({ name: "AbortError" });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toEqual({
      label: "Preparing state legislatures",
      completed: 2,
      total: 50,
    });
  });

  it("survives Save and Continue without changing established seats", () => {
    const { world } = openingFor("NE");
    const members = US_STATE_USPS.map((usps) => {
      const pack = stateCandidacyPack(`US-${usps}`)!;
      return [pack.packId, stateLegislators(world, pack.packId)] as const;
    });
    const again = ensureStateLegislatureOpening(
      world,
      opened!.playerPersonId,
      "NE",
    );
    expect(again).toBe(world);
    const restored = deserializeWorld(serializeWorld(world));
    expect(
      US_STATE_USPS.map((usps) => {
        const pack = stateCandidacyPack(`US-${usps}`)!;
        return [pack.packId, stateLegislators(restored, pack.packId)] as const;
      }),
    ).toEqual(members);
  }, 30_000);

  it("uses the same IDs through synchronous and chunked generation", () => {
    const synchronous = generateOpeningLife(prepareOpeningLife(SETUP)).game!;
    expect(serializeWorld(synchronous.world)).toBe(
      serializeWorld(opened!.world),
    );
  }, 120_000);
});

describe.each(SEATED)("a fictional roster in %s, %s", (_name, _state, usps) => {
  it("fills every chamber seat with a unique living person", () => {
    const { world, pack, plan, members } = openingFor(usps);
    expect(plan.chambers.length).toBe(pack.offices.length);
    for (const chamber of plan.chambers) {
      const inChamber = members.filter(
        (member) => member.officeKey === chamber.officeKey,
      );
      expect(inChamber.length).toBe(chamber.size);
      expect(new Set(inChamber.map((member) => member.ordinal)).size).toBe(
        chamber.size,
      );
      for (const member of inChamber) {
        expect(world.people[member.personId]).toBeDefined();
        expect(member.title).toContain(chamber.chamberName);
      }
    }
    expect(new Set(members.map((member) => member.personId)).size).toBe(
      members.length,
    );
  });

  it("uses the pack or that state's own districts for chamber size", () => {
    const { pack, plan } = openingFor(usps);
    for (const chamber of plan.chambers) {
      const office = pack.offices.find(
        (candidate) => candidate.officeKey === chamber.officeKey,
      )!;
      const drawn =
        office.seats.kind === "known" &&
        office.seats.source?.authority === "game-profile";
      if (office.seats.kind === "known" && !drawn) {
        expect(chamber.basis).toBe("rule-pack");
        expect(chamber.size).toBe(office.seats.value);
      } else {
        expect(chamber.basis).toBe("one-member-per-district");
        expect(
          chamber.districts.every(
            (district) => district !== null && district.stateUsps === usps,
          ),
        ).toBe(true);
      }
    }
  });

  it("seats party affiliations from this save's generated conditions", () => {
    const { members } = openingFor(usps);
    expect(
      members.every(
        (member) =>
          member.party === "democratic" || member.party === "republican",
      ),
    ).toBe(true);
  });

  it("uses the body a campaign winner joins", () => {
    const { world, pack } = openingFor(usps);
    const body = world.history.organizations.filter(
      (organization) =>
        organization.stableKey === STATE_LEGISLATURE_KEYS.body(pack.packId),
    );
    expect(body).toHaveLength(1);
  });
});

describe("Puerto Rico's Legislative Assembly", () => {
  it("is seated with simulated members who have no national party", () => {
    const { world, playerPersonId } = opened!;
    const withPuertoRico = ensureStateLegislatureOpening(
      world,
      playerPersonId,
      "PR",
    );
    const pack = stateCandidacyPack("US-PR")!;
    const members = stateLegislators(withPuertoRico, pack.packId);
    expect(members.length).toBeGreaterThan(0);
    expect(members.every((member) => member.party === null)).toBe(true);
  });
});

describe("the District of Columbia", () => {
  it("does not receive a state candidacy pack", () => {
    expect(stateCandidacyPack("US-DC")).toBeNull();
    expect(opened!.world.history.events).not.toContainEqual(
      expect.objectContaining({
        stableKey: STATE_LEGISLATURE_KEYS.opening("US-DC"),
      }),
    );
  });
});
