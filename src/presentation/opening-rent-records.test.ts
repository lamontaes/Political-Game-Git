import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { currentWorldTwoBedroomRentEstimate } from "./current-world-peer-estimates";
import { EconomicContextPanel } from "../player/EconomicContextPanel";
import { LEXINGTON_ECONOMIC_BINDING } from "./economic-context-bindings";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  collectTownRent,
  nextRentDay,
  hudRentRowFor,
  marketRentMinor,
  startTownLeases,
  townLeases,
} from "../simulation/living-world/town-rent";
import { lifePlaceByKey } from "../simulation/life-places";
import { PLACE_POPULATION_ROWS } from "../simulation/nationwide-world/place-population.generated";
import { SeededRng } from "../simulation/rng";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import { simulationMomentOnLocalDate } from "../simulation/dates";
import { withWorldIntegrityDeferred } from "../simulation/world";

const placesByState = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const place = lifePlaceByKey(key);
  if (
    !place?.stateJurisdictionKey ||
    !hudRentRowFor(place.context.jurisdiction.id)
  )
    continue;
  if (
    (placesByState.get(place.stateJurisdictionKey)?.[1] ?? -1) <
    Number(population)
  )
    placesByState.set(place.stateJurisdictionKey, [key, Number(population)]);
}
const candidates = [...placesByState.values()].map(([key]) => key);
const rng = new SeededRng("team8-item16-opening-rent-places");
const places = Array.from(
  { length: 5 },
  () => candidates.splice(rng.integer(0, candidates.length), 1)[0]!,
);

// Production opening route; no synthetic rent, dwelling or landlord fixture.
describe("item16 opening records existing rental terms before rent day", () => {
  it.each(places)(
    "%s saves sourced lease amounts, Money projection, first due settlement and reload",
    (placeKey) => {
      const game = withWorldIntegrityDeferred(
        () =>
          generateOpeningLife(
            prepareOpeningLife({
              ...DEFAULT_NEW_GAME_SETUP,
              seed: `team8-item16-current-opening:${placeKey}`,
              placeKey,
              startAge: 24,
              questionnaire: "skipped",
            }),
          ).game!,
      );
      const world = game.world;
      const leases = townLeases(world).filter((lease) => !lease.ended);
      expect(leases.length).toBeGreaterThan(0);
      for (const lease of leases) {
        expect(world.people[lease.leaseholderId]).toBeDefined();
        const terms = resourceFlowTermsAt(world, lease.flow.id)!;
        expect(terms.amount.minorUnits).toBeGreaterThan(0);
        expect(terms.effectiveAt <= world.currentDate).toBe(true);
        if (lease.regime === "market") {
          const source = hudRentRowFor(lease.town)!;
          expect(source).not.toBeNull();
          expect(terms.amount.minorUnits).toBe(
            marketRentMinor(
              world,
              lease.town,
              source,
              lease.bedrooms,
              world.currentDate,
            ),
          );
          expect(lease.flow.provenance.kind).toBe("authored");
          if (lease.flow.provenance.kind === "authored")
            expect(lease.flow.provenance.note).toContain("HUD FY2025");
        }
        expect(
          world.history.resourceTransferOutcomes.filter(
            (row) => row.resourceFlowId === lease.flow.id,
          ),
        ).toHaveLength(0);
      }
      const home = world.people[game.playerPersonId]!.homeJurisdictionId;
      const estimate = currentWorldTwoBedroomRentEstimate(world, home);
      const twoBedroomLeases = leases.filter((lease) => lease.bedrooms === 2);
      expect(Boolean(estimate)).toBe(twoBedroomLeases.length > 0);
      const markup = renderToStaticMarkup(
        createElement(EconomicContextPanel, {
          binding: LEXINGTON_ECONOMIC_BINDING,
          simulationDate: world.currentDate,
          world,
          jurisdictionId: home,
        }),
      );
      if (estimate) {
        expect(markup).toContain("current-world-two-bedroom-rent");
        expect(markup).toContain(
          Math.round(estimate.mean).toLocaleString("en-US"),
        );
      } else {
        expect(markup).not.toContain("current-world-two-bedroom-rent");
      }
      const saved = serializeWorld(world);
      expect(serializeWorld(startTownLeases(world, world.currentDate))).toBe(
        saved,
      );
      const restored = deserializeWorld(saved);
      expect(
        serializeWorld(startTownLeases(restored, restored.currentDate)),
      ).toBe(saved);
      expect(currentWorldTwoBedroomRentEstimate(restored, home)).toEqual(
        estimate,
      );
      const dueOn = nextRentDay(world.currentDate);
      let isolated = restored;
      for (const item of restored.history.futureDueItems ?? []) {
        if (
          item.dueAt >= dueOn ||
          futureDueItemStateAt(isolated, item.id, {
            asOfDate: isolated.currentDate,
            historySequenceExclusive: isolated.history.nextSequence,
          })?.status !== "scheduled"
        )
          continue;
        isolated = withWorldIntegrityDeferred(() =>
          cancelFutureDueItem(isolated, {
            stableKey: `fixture:item16:cancel:${item.id}`,
            dueItemId: item.id,
            effectiveAt: restored.currentDate,
            reasonKey: "fixture:isolated-rent-writer",
            context:
              "Controlled rent writer fixture; intervening clock not simulated.",
          }),
        );
      }
      const dated = {
        ...isolated,
        currentDate: dueOn,
        currentMoment: simulationMomentOnLocalDate(
          restored.currentMoment,
          dueOn,
        ),
      };
      // Controlled due-writer fixture: does not claim the intervening clock ran.
      const settled = withWorldIntegrityDeferred(() =>
        collectTownRent(dated, dueOn),
      );
      const dueRows = settled.history.resourceTransferOutcomes.filter(
        (row) =>
          leases.some((lease) => lease.flow.id === row.resourceFlowId) &&
          row.occurredAt === dueOn,
      );
      expect(dueRows.length).toBeGreaterThan(0);
      for (const row of dueRows) {
        expect(row.attemptedAmount.minorUnits).toBeGreaterThan(0);
        expect(row.transferredAmount.minorUnits).toBeLessThanOrEqual(
          row.attemptedAmount.minorUnits,
        );
      }
      const dueSave = serializeWorld(settled);
      expect(
        serializeWorld(
          withWorldIntegrityDeferred(() => collectTownRent(settled, dueOn)),
        ),
      ).toBe(dueSave);
      const dueRestored = deserializeWorld(dueSave);
      expect(
        serializeWorld(
          withWorldIntegrityDeferred(() => collectTownRent(dueRestored, dueOn)),
        ),
      ).toBe(dueSave);
    },
  );
});
