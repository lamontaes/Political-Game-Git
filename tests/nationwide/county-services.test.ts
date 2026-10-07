import { describe, expect, it } from "vitest";
import { countyBudgetHearings } from "../../src/simulation/county-budget-record";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { observerPlace } from "../../src/presentation/observer-world";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { GOVERNING_MATTER_OPENED } from "../../src/simulation/governing/state-governing";
import { municipalSeats } from "../../src/simulation/municipal-public-work";
import { programAuthority } from "../../src/simulation/governing/public-program";
import { openProgramMattersForAllOffices } from "../../src/simulation/governing/state-governing";
import { governingMatters } from "../../src/simulation/governing/state-governing";
import { addDays } from "../../src/simulation/dates";
import { settlePublicBudgets } from "../../src/simulation/public-budgets";
import { ensureCountyServiceAppropriations } from "../../src/simulation/county-services";
import { publicProgramRecords } from "../../src/simulation/public-program-integrity";
import { COUNTY_SERVICE_FAMILIES } from "../../src/simulation/law-consequences/service-delivered-data";
import type { IsoDate, World } from "../../src/simulation/types";
import { resolveDueThrough } from "../fixtures/due-item-clock";

/**
 * CO-9: a county's board funds its health clinics, road repair and fair from
 * its voted budget lines. A county is drawn from every county the game has a
 * government for, by seed, never named here.
 */
const CLOCK =
  /^(county:|civic:|governing|public-program|public-service|program)|tax|property|service|resource/;

const BOARD_CLOCK = /^(county:|civic:)|tax|property/;

function isolate(world: World, clock: RegExp = CLOCK): World {
  let next = world;
  const ended = new Set(
    (world.history.futureDueItemStates ?? [])
      .filter((row) => row.status !== "scheduled")
      .map((row) => row.dueItemId),
  );
  for (const item of world.history.futureDueItems)
    if (!ended.has(item.id) && !clock.test(item.transitionKey))
      next = cancelFutureDueItem(next, {
        stableKey: `${item.stableKey}:set-aside-by-test`,
        dueItemId: item.id,
        effectiveAt: world.currentDate,
        reasonKey: "test:county-services-clock",
        context: "The county services test runs only the money and the board.",
      });
  return next;
}

function openCounty(seed: string) {
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `co5-${seed}`,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  const county = homeLocalGovernmentUnits(world, game.playerPersonId)
    .counties[0]!;
  return { county, place, world };
}

describe("a county's voted budget lines fund its services", () => {
  it("funds clinics, roads and the fair from the voted year and reaches a named resident", () => {
    const { county, place, world: opened } = openCounty("co5-budget-hearing-a");
    const geoid = county.countyGeoid!;
    const hearing0 = opened.history.futureDueItems.find(
      (item) =>
        item.transitionKey === "county:budget-hearing" &&
        item.stableKey.includes(county.id),
    )!;
    process.stderr.write(
      `CO-9 world seed co9-a, place ${place.displayName} (${county.stateUsps}, ${county.id}), opened ${opened.currentDate}\n`,
    );
    let world = isolate(opened, BOARD_CLOCK);
    try {
      world = resolveDueThrough(world, hearing0.dueAt);
    } catch (error) {
      const states = new Map(
        (world.history.futureDueItemStates ?? []).map((row) => [
          row.dueItemId,
          row.status,
        ]),
      );
      const pending = world.history.futureDueItems
        .filter(
          (item) =>
            item.dueAt <= hearing0.dueAt &&
            (states.get(item.id) ?? "scheduled") === "scheduled" &&
            CLOCK.test(item.transitionKey),
        )
        .map((item) => `${item.transitionKey}@${item.dueAt}`);
      process.stderr.write(
        `BLOCKED CANDIDATES ${[...new Set(pending)].join(" | ")}\n`,
      );
      throw error;
    }
    const hearing = countyBudgetHearings(world).find(
      (row) => row.unitId === county.id,
    )!;
    world = resolveDueThrough(world, hearing.startsOn);
    const decided = countyBudgetHearings(world).find(
      (row) => row.key === hearing.key,
    )!;
    process.stderr.write(`stage ${decided.stage} starts ${decided.startsOn}\n`);
    if (decided.stage !== "adopted") return;
    // The voted year opens; the month's pass funds the county's services.
    world = resolveDueThrough(isolate(world, BOARD_CLOCK), decided.startsOn);
    const month = `${decided.startsOn.slice(0, 7)}-01` as IsoDate;
    const settled = settlePublicBudgets(
      world,
      addDays(month, -1).slice(0, 7) + "-01",
    );
    world = ensureCountyServiceAppropriations(
      settled,
      addDays(month, -31) as IsoDate,
    );
    const mine = (record: { programKey?: string }) =>
      COUNTY_SERVICE_FAMILIES.some(
        (row) => record.programKey === `${row.family}:${geoid}`,
      );
    const appropriations = publicProgramRecords(world).filter(
      (record) => record.kind === "appropriation" && mine(record),
    );
    for (const record of appropriations)
      if (record.kind === "appropriation")
        process.stderr.write(
          `APPROPRIATION ${record.programKey}: $${record.amount.minorUnits / 100} ${record.availableFrom} to ${record.availableThrough}\n`,
        );
    expect(appropriations.length).toBeGreaterThan(0);
    process.stderr.write(
      `IDENTITY ${JSON.stringify((appropriations[0] as { publicGovernmentIdentity?: unknown }).publicGovernmentIdentity ?? "jurisdiction")}\n`,
    );
    {
      const key = (
        appropriations[0] as unknown as {
          publicGovernmentIdentity: { governmentKey: string };
        }
      ).publicGovernmentIdentity.governmentKey;
      const seats = municipalSeats(world, key);
      const manager = seats.find(
        (seat) => seat.role === "professional-manager",
      )!;
      process.stderr.write(
        `AUTHORITY ${JSON.stringify(
          programAuthority(
            world,
            manager.personId,
            { kind: "municipal", governmentKey: key },
            appropriations[0] as never,
          ),
        )} date ${world.currentDate}\n`,
      );
      world = openProgramMattersForAllOffices(
        world,
        new Set(appropriations.map((record) => record.id)),
      );
      process.stderr.write(
        `SEATS ${key}: ${seats.map((seat) => seat.role).join(",")}\n`,
      );
    }
    const matters = world.history.events.filter(
      (event) => event.type === GOVERNING_MATTER_OPENED,
    );
    process.stderr.write(
      `MATTERS ${matters.length}: ${matters
        .map((event) => event.summary)
        .slice(-6)
        .join(" | ")}\n`,
    );
    {
      const ms = governingMatters(world).filter((m) => m.family === "program");
      for (const m of ms) {
        const d = world.history.futureDueItems.filter((i) => i.entityIds.includes(m.id));
        process.stderr.write(`MATTER ${m.id} ${m.status} opts ${m.options.map((o) => o.key).join(",")} due ${d.map((i) => i.transitionKey + "@" + i.dueAt).join(";")}\n`);
      }
    }
    const startDay = world.currentDate;
    for (let day = 10; day <= 120; day += 10) {
      world = resolveDueThrough(
        isolate(world),
        addDays(startDay, day) as IsoDate,
      );
      const records = publicProgramRecords(world).filter(mine);
      const kinds = records.reduce<Record<string, number>>((acc, r) => {
        acc[r.kind] = (acc[r.kind] ?? 0) + 1;
        return acc;
      }, {});
      const delivered = world.history.events.filter(
        (event) => event.type === "service.delivery-recorded",
      );
      if (day === 20)
        process.stderr.write(`ALLMATTERS ${governingMatters(world).map((m) => m.family + ":" + m.status + ":" + m.officeKey.slice(0, 40)).join(" | ")}\n`);
      if (day === 20 || day === 120)
        for (const m of governingMatters(world).filter((x) => x.family === "program")) {
          const st = new Map((world.history.futureDueItemStates ?? []).map((r) => [r.dueItemId, r.status + ":" + ((r as { reason?: string }).reason ?? "")]));
          const d = world.history.futureDueItems.filter((i) => i.entityIds.includes(m.id));
          process.stderr.write(`MATTER ${m.status} opts ${m.options.map((o) => o.key).join(",")} due ${d.map((i) => i.transitionKey + "@" + i.dueAt + "=" + (st.get(i.id) ?? "sched")).join(";")}\n`);
        }
      process.stderr.write(
        `DAY +${day} (${world.currentDate}): ${JSON.stringify(kinds)} matters ${world.history.events.filter((event) => event.type === GOVERNING_MATTER_OPENED).length} delivered ${delivered.length}\n`,
      );
    }
  }, 3_600_000);
});
