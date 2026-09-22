import { afterEach, describe, expect, it } from "vitest";
import {
  regularTermWindowOn,
  stateExecutiveTermRule,
  US_STATE_USPS,
  assertWorldIntegrity,
  bindRuleCapabilityResolver,
  deserializeWorld,
  ensureStateExecutiveIncumbent,
  lifePlaceStateIdentities,
  organizationProfileAt,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveOffice,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import type { RuleCapabilityResolver, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  currentPublicOfficeholders,
  establishOpeningOfficeholders,
  openingOfficeholders,
} from "./opening-officeholders";

function firstLocality(usps: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place;
}

function openIn(placeKey: string, seed: string) {
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    startAge: 34,
  };
  const generated = generateOpeningLife(prepareOpeningLife(setup));
  return { setup, ...generated.game! };
}

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("NATIONWIDE opening state executive", () => {
  it("names exactly the fifty states, and gives the District its own office", () => {
    const corpusStates = lifePlaceStateIdentities()
      .map((state) => state.usps)
      .filter((usps) => usps !== "DC" && usps !== "PR")
      .sort();
    expect([...US_STATE_USPS].sort()).toEqual(corpusStates);
    // NATIONWIDE1 asks for the District separately from the states: it is not
    // in the fifty, and it is not empty either. Its chief executive is a
    // Mayor, never a governor. Puerto Rico's own Governor is real and is not
    // compiled yet, so nothing is offered for it — an absence, not a claim
    // that the office does not exist.
    const district = stateExecutiveOffice("DC")!;
    expect(district.displayName).toBe("Mayor of the District of Columbia");
    expect(district.displayName).not.toContain("Governor");
    expect(stateExecutiveOffice("PR")).toBeNull();
  });

  it.each([...US_STATE_USPS])(
    "%s: an ordinary life opens with one fictional governor that never rerolls",
    (usps) => {
      const place = firstLocality(usps);
      const { world, playerPersonId } = openIn(place.key, `nationwide-${usps}`);
      assertWorldIntegrity(world);
      const office = stateExecutiveOffice(usps)!;

      const holders = currentPublicOfficeholders(world).filter(
        (holder) => holder.officeKey === office.officeKey,
      );
      expect(holders).toHaveLength(1);
      const [holder] = holders;
      expect(holder!.title).toBe(office.displayName);
      expect(world.people[holder!.personId]).toBeDefined();
      expect(holder!.personId).not.toBe(playerPersonId);
      // No admitted law in this composition: the term is dated by the office
      // calendar (verified for Washington, the labelled game profile
      // elsewhere), never guessed per state.
      const window = regularTermWindowOn(
        stateExecutiveTermRule(usps)!,
        world.currentDate,
      );
      expect(holder!.startedAt).toBe(window.startsAt);
      expect(holder!.endExclusive).toBe(window.endsAt);
      expect(holder!.termFactsUnknown).toEqual([]);
      expect(
        openingOfficeholders(world).map((record) => record.officeKey),
      ).toEqual(["us-president", "us-chief-justice", office.officeKey]);

      const profile = organizationProfileAt(world, holder!.organizationId);
      expect(profile?.classification).toBe(`service:${office.officeKey}`);
      expect(profile?.locationJurisdictionId).toBe(office.jurisdictionId);
      expect(world.jurisdictions[office.jurisdictionId]).toBeDefined();

      // Only the home state materializes: no other governor enters this save.
      const otherStates = currentPublicOfficeholders(world).filter(
        (record) =>
          record.officeKey !== office.officeKey &&
          record.officeKey.endsWith("-governor"),
      );
      expect(otherStates).toEqual([]);

      // Repeat, reopen and navigation leave the same record.
      expect(establishOpeningOfficeholders(world, playerPersonId)).toBe(world);
      expect(ensureStateExecutiveIncumbent(world, playerPersonId, usps)).toBe(
        world,
      );
      const restored = deserializeWorld(serializeWorld(world));
      expect(currentPublicOfficeholders(restored)).toEqual(
        currentPublicOfficeholders(world),
      );
      expect(
        ensureStateExecutiveIncumbent(restored, playerPersonId, usps),
      ).toBe(restored);
    },
  );

  it("opens a District or Puerto Rico life without inventing a state governor", () => {
    // The invariant is that no US-state governorship is manufactured for a
    // jurisdiction that is not a state. Puerto Rico seating nothing is this
    // branch not having compiled its real Governor, not a statement about
    // Puerto Rico.
    for (const usps of ["DC", "PR"]) {
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: `US-${usps}`,
        scope: "locality",
      })[0];
      if (!place) continue;
      const { world } = openIn(place.key, `nationwide-${usps}`);
      const officeKeys = currentPublicOfficeholders(world).map(
        (holder) => holder.officeKey,
      );
      expect(officeKeys).not.toContain(`us-${usps.toLowerCase()}-governor`);
      expect(officeKeys.slice(0, 2)).toEqual([
        "us-president",
        "us-chief-justice",
      ]);
      // The District's own office opens with the life. Puerto Rico's is not
      // compiled, so nothing opens with it yet.
      expect(officeKeys.slice(2)).toEqual(usps === "DC" ? ["dc-mayor"] : []);
    }
  });

  it("measures the opening save cost of the state executive", () => {
    const place = firstLocality("NV");
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "nationwide-size",
      placeKey: place.key,
      startAge: 34,
    };
    const created = createNewGameWorld(setup);
    const base = created.world;
    // The officeholder writers only; the national Congress snapshot that the
    // opening adds afterwards carries its own budget in living-world-opening.
    const opened = establishOpeningOfficeholders(base, created.playerPersonId);
    const baseBytes = serializeWorld(base).length;
    const added = serializeWorld(opened).length - baseBytes;
    console.info(
      `[nationwide-opening size] base ${baseBytes} bytes; federal + home-state executive add ${added} bytes`,
    );
    // Two federal holders plus one home-state executive, not fifty states.
    expect(added).toBeLessThan(40_000);
  });

  it("dates the term once RULES admits term facts, and the tenure ends on its date", () => {
    const fixture: RuleCapabilityResolver = (request) => ({
      ...unadmittedRuleCapabilityResolver(request),
      refusal: null,
      fields: request.fields.map((field) => ({
        field,
        state: "ADMITTED",
        value:
          field === "term.years"
            ? 4
            : {
                kind: "reference-start",
                referenceStart: "2023-12-12",
                cycleYears: 4,
              },
        ruleScope: "state-constitution",
        ruleVersion: "test-fixture-not-law-v1",
        validFrom: null,
        validThrough: null,
        source: null,
        reason: "Test fixture only; not a sourced rule.",
      })),
    });
    bindRuleCapabilityResolver(fixture);
    const { world } = openIn(firstLocality("NV").key, "nationwide-dated");
    const office = stateExecutiveOffice("NV")!;
    const holder = currentPublicOfficeholders(world).find(
      (record) => record.officeKey === office.officeKey,
    )!;
    expect(holder.startedAt).toBe("2023-12-12");
    expect(holder.endExclusive).toBe("2027-12-12");
    expect(
      openingOfficeholders(world).some(
        (record) => record.officeKey === office.officeKey,
      ),
    ).toBe(true);

    // Unbinding the fixture never reinterprets the already-recorded tenure.
    bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      currentPublicOfficeholders(reopened).find(
        (record) => record.officeKey === office.officeKey,
      )?.startedAt,
    ).toBe("2023-12-12");

    const afterTerm: World = {
      ...reopened,
      currentDate: "2027-12-12" as World["currentDate"],
    };
    expect(
      currentPublicOfficeholders(afterTerm).some(
        (record) => record.officeKey === office.officeKey,
      ),
    ).toBe(false);
  });
});
