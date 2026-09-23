import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { createScenarioWorld } from "./demo";
import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import { createStableId } from "./ids";
import { introduceMeasure, measuresForJurisdiction } from "./legislation";
import {
  LEGISLATURE_GAME_PROFILE_VERSION,
  legislatureForState,
  legislatureProfileFor,
  legislatureProfilePack,
  legislatureProfilePackById,
  researchedChamberSpread,
  researchedExecutiveSpread,
  overrideThresholdFor,
  seatsForChamber,
} from "./legislature-game-profile";
import { LEGISLATIVE_RULE_PACKS, rulePackById } from "./legislature-rule-packs";
import { stateCandidacyPack } from "./candidacy-packs";
import { vetoOverrideReadingFor } from "./veto-override-source-readings";
import {
  assertRulePackIntegrity,
  chamberByKey,
  defaultOriginChamber,
} from "./legislature-rules";
import { lifePlaceStateIdentities } from "./life-places";

/** Every jurisdiction the game offers a life in. */
const ALL_JURISDICTIONS = lifePlaceStateIdentities();

/** The ones with no compiled pack — the states this module exists for. */
const UNCOMPILED = ALL_JURISDICTIONS.filter(
  (identity) =>
    !LEGISLATIVE_RULE_PACKS.some(
      (pack) => pack.jurisdictionKey === identity.jurisdictionKey,
    ),
);

describe("the gap this closes", () => {
  it("leaves most of the country without a compiled legislature", () => {
    expect(LEGISLATIVE_RULE_PACKS.length).toBeLessThan(
      ALL_JURISDICTIONS.length,
    );
    expect(UNCOMPILED.length).toBeGreaterThan(30);
  });

  it("gives every one of them a legislature anyway, except the District", () => {
    for (const identity of UNCOMPILED) {
      const pack = legislatureForState(identity.jurisdictionKey);
      if (identity.usps === "DC") {
        // The District is legislated for by one Council, not a House and a
        // Senate. A generated bicameral legislature would not be provisional,
        // it would be a shape the District has never had.
        expect(pack).toBeNull();
        continue;
      }
      expect(pack).not.toBeNull();
      expect(pack!.basis).toBe("game-profile");
    }
  });

  it("never displaces a state that has been compiled", () => {
    for (const compiled of LEGISLATIVE_RULE_PACKS) {
      const resolved = legislatureForState(compiled.jurisdictionKey);
      expect(resolved).toBe(compiled);
      expect(resolved!.basis).toBe("researched");
    }
  });
});

describe("a generated legislature is a real one", () => {
  it("passes the same integrity check every compiled pack passes", () => {
    for (const identity of UNCOMPILED) {
      const pack = legislatureForState(identity.jurisdictionKey);
      if (pack === null) continue;
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
    }
  });

  it("resolves from its pack id, so a save in that state opens", () => {
    const texas = legislatureForState("US-TX")!;
    expect(rulePackById(texas.packId)).toEqual(texas);
    expect(
      legislatureProfilePackById("us-zz-legislature-profile-v1"),
    ).toBeNull();
    expect(legislatureProfilePackById("us-ky-general-assembly-v1")).toBeNull();
  });
});

describe("what it draws, and from where", () => {
  it("measures its spread from the compiled packs rather than from itself", () => {
    const chambers = researchedChamberSpread();
    const compiledLowerSeats = LEGISLATIVE_RULE_PACKS.filter(
      (pack) => pack.structure === "bicameral",
    )
      .map((pack) => chamberByKey(pack, pack.chamberOrder[0]!).seats)
      .filter((seats) => seats.kind === "known")
      .map((seats) => (seats as { value: number }).value)
      .sort((left, right) => left - right);
    expect(chambers.lowerSeats).toEqual([...new Set(compiledLowerSeats)]);
  });

  it("seats a chamber anywhere inside the compiled spread", () => {
    const { lowerSeats } = researchedChamberSpread();
    const lowest = lowerSeats[0]!;
    const highest = lowerSeats[lowerSeats.length - 1]!;
    for (const identity of UNCOMPILED) {
      const profile = legislatureProfileFor(identity.jurisdictionKey);
      if (profile === null) continue;
      expect(Number.isInteger(profile.lowerSeats)).toBe(true);
      expect(profile.lowerSeats).toBeGreaterThanOrEqual(lowest);
      expect(profile.lowerSeats).toBeLessThanOrEqual(highest);
    }
  });

  it("never seats a senate as large as its own house", () => {
    for (const identity of UNCOMPILED) {
      const profile = legislatureProfileFor(identity.jurisdictionKey);
      if (profile === null) continue;
      expect(profile.upperSeats).toBeLessThan(profile.lowerSeats);
      expect(profile.upperSeats).toBeGreaterThanOrEqual(2);
    }
  });

  it("only ever uses a veto window and an override fraction a state enacted", () => {
    // A seat count may fall between two compiled values, because a chamber
    // genuinely can be any size. A veto window may not: it is a discrete
    // institutional choice, and a forty-day window nobody wrote would not
    // resemble anything.
    const executive = researchedExecutiveSpread();
    for (const identity of UNCOMPILED) {
      const profile = legislatureProfileFor(identity.jurisdictionKey);
      if (profile === null) continue;
      expect(executive.inSessionDays).toContain(
        profile.vetoWindowDaysInSession,
      );
      expect(executive.afterAdjournmentDays).toContain(
        profile.vetoWindowDaysAfterAdjournment,
      );
      expect(
        executive.overrideFractions.some(
          ([numerator, denominator]) =>
            numerator === profile.overrideFraction[0] &&
            denominator === profile.overrideFraction[1],
        ),
      ).toBe(true);
    }
  });

  it("answers the same way for one state every single time", () => {
    for (const identity of UNCOMPILED.slice(0, 12)) {
      const first = legislatureProfileFor(identity.jurisdictionKey);
      const again = legislatureProfileFor(identity.jurisdictionKey);
      expect(again).toEqual(first);
      expect(first?.version ?? LEGISLATURE_GAME_PROFILE_VERSION).toBe(
        LEGISLATURE_GAME_PROFILE_VERSION,
      );
    }
  });

  it("does not hand every uncompiled state the same legislature", () => {
    const shapes = new Set(
      UNCOMPILED.map((identity) => {
        const profile = legislatureProfileFor(identity.jurisdictionKey);
        return profile === null
          ? "none"
          : `${profile.lowerSeats}:${profile.upperSeats}`;
      }),
    );
    expect(shapes.size).toBeGreaterThan(20);
  });
});

describe("nothing generated claims to be law", () => {
  it("marks every source in a generated pack as the game's own", () => {
    const pack = legislatureForState("US-TX")!;
    for (const source of pack.sources) {
      expect(source.verification).toBe("game-profile");
      expect(source.authority).toBe("game-profile");
      expect(source.sourceUrl).toBeNull();
    }
    expect(pack.unresolvedGaps[0]).toMatch(/has not been compiled/i);
  });

  it("allows a generated pack to carry a read source, because that is the point", () => {
    // This used to assert the opposite, and the opposite was wrong. A game
    // profile exists because nothing has been read; the moment something IS
    // read for one of its rules, the read value belongs there and the drawn one
    // must give way. Four states' override thresholds are exactly that case. A
    // check that refused a constitution inside a generated pack would have made
    // "real law overrides the draw" impossible to honor.
    const honest = legislatureForState("US-TX")!;
    const compiled = LEGISLATIVE_RULE_PACKS[0]!;
    const blended = {
      ...honest,
      session: { ...honest.session, source: compiled.sources[0]! },
    };
    expect(() => assertRulePackIntegrity(blended)).not.toThrow();
    // The pack still says what it mostly is, so nothing reads as researched.
    expect(blended.basis).toBe("game-profile");
  });

  it("refuses a compiled pack that carries a generated rule", () => {
    const compiled = LEGISLATIVE_RULE_PACKS[0]!;
    const generated = legislatureForState("US-TX")!;
    const blended = {
      ...compiled,
      session: { ...compiled.session, source: generated.sources[0]! },
    };
    expect(() => assertRulePackIntegrity(blended)).toThrow(
      /may not carry a generated rule/i,
    );
  });

  it("stays out of the compiled registry, which answers a different question", () => {
    const generated = legislatureForState("US-TX")!;
    expect(
      LEGISLATIVE_RULE_PACKS.some((pack) => pack.packId === generated.packId),
    ).toBe(false);
  });
});

describe("a bill actually moves through one", () => {
  const TEXAS_ID = createStableId(
    "jurisdiction",
    "definition:us-tx-state-placeholder",
  );
  const TEXAS_CONTEXT: DemoJurisdictionContext = {
    jurisdiction: {
      id: TEXAS_ID,
      slug: "us-tx-state-placeholder",
      name: "Texas",
      kind: "state-placeholder",
      parentName: "United States",
      provenance: {
        asOf: null,
        source: null,
        jurisdiction: TEXAS_ID,
        status: "placeholder",
      },
    },
    initialMoment: {
      date: makeIsoDate("2026-01-05"),
      minuteOfDay: 9 * 60 + 10,
      timeZone: "America/Chicago",
      utcOffsetMinutes: -360,
    },
    creationSummary: "Seeded world for a generated Texas legislature.",
    goalScope: "Texas placeholder",
    householdLocationLabel: "Synthetic Texas location",
  };

  it("files in a state nobody has compiled, and the measure is really there", () => {
    const pack = legislatureForState("US-TX")!;
    const base = createScenarioWorld(
      "legislature-game-profile-texas",
      TEXAS_CONTEXT,
      { peopleCount: 4 },
    );
    const sponsor = base.personOrder[0]!;
    const world = introduceMeasure(
      { ...base, control: { kind: "person", personId: sponsor } },
      {
        stableKey: "texas-profile:measure",
        jurisdictionId: TEXAS_ID,
        rulePackId: pack.packId,
        designation: `${defaultOriginChamber(pack).billDesignationPrefix} 1`,
        shortTitle: "Rural Broadband Extension",
        summary: "Written for this test, to prove a bill can be filed here.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: sponsor,
      },
    );

    const measures = measuresForJurisdiction(world, TEXAS_ID);
    expect(measures).toHaveLength(1);
    expect(measures[0]!.rulePackId).toBe(pack.packId);
    expect(measures[0]!.originChamberKey).toBe("house");
    // And the engine resolves the pack back off the measure, which is the
    // step that used to be impossible because the pack did not exist.
    expect(rulePackById(measures[0]!.rulePackId).displayName).toBe(
      "Texas Legislature",
    );
  });
});

describe("a generated pack is complete enough to name", () => {
  it("names its chambers and numbers its bills", () => {
    const pack = legislatureProfilePack("US-WY", "Wyoming")!;
    expect(pack.displayName).toBe("Wyoming Legislature");
    expect(
      pack.chambers.map((chamber) => chamber.billDesignationPrefix),
    ).toEqual(["HB", "SB"]);
    expect(defaultOriginChamber(pack).chamberKey).toBe("house");
  });
});

describe("every chamber in the country can be seated", () => {
  it("gives a number for every chamber of every compiled pack", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      for (const chamber of pack.chambers) {
        const count = seatsForChamber(pack, chamber.chamberKey);
        expect(count).not.toBeNull();
        expect(Number.isInteger(count!.seats)).toBe(true);
        expect(count!.seats).toBeGreaterThan(0);
      }
    }
  });

  it("returns a compiled count exactly, and never redraws it", () => {
    const ohio = LEGISLATIVE_RULE_PACKS.find((pack) =>
      pack.packId.startsWith("us-oh-"),
    )!;
    const house = seatsForChamber(ohio, "house")!;
    expect(house.basis).toBe("researched");
    expect(house.seats).toBe(99);
  });

  it("fills the three compiled chambers whose count was never read", () => {
    // Kentucky, Nebraska and Nevada all delegate the number away, and none of
    // the delegated instruments was read. The pack still says so.
    for (const packId of [
      "us-ky-general-assembly-v1",
      "us-ne-legislature-v1",
      "us-nv-legislature-v1",
    ]) {
      const pack = LEGISLATIVE_RULE_PACKS.find(
        (candidate) => candidate.packId === packId,
      )!;
      for (const chamber of pack.chambers) {
        expect(chamber.seats.kind).toBe("unknown");
        const count = seatsForChamber(pack, chamber.chamberKey)!;
        expect(count.basis).toBe("game-profile");
        expect(count.seats).toBeGreaterThan(0);
      }
    }
  });

  it("never reports a generated legislature's seats as researched", () => {
    const texas = legislatureForState("US-TX")!;
    for (const chamber of texas.chambers) {
      expect(seatsForChamber(texas, chamber.chamberKey)!.basis).toBe(
        "game-profile",
      );
    }
  });

  it("keeps a senate smaller than its own house even when both are drawn", () => {
    const kentucky = LEGISLATIVE_RULE_PACKS.find((pack) =>
      pack.packId.startsWith("us-ky-"),
    )!;
    expect(seatsForChamber(kentucky, "senate")!.seats).toBeLessThan(
      seatsForChamber(kentucky, "house")!.seats,
    );
  });

  it("answers the same way for one chamber every time", () => {
    const nevada = LEGISLATIVE_RULE_PACKS.find((pack) =>
      pack.packId.startsWith("us-nv-"),
    )!;
    expect(seatsForChamber(nevada, "assembly")).toEqual(
      seatsForChamber(nevada, "assembly"),
    );
  });

  it("leaves the pack's own record saying exactly what it said before", () => {
    // The whole point of reading rather than writing: asking how many people
    // sit here must not change what the research says is known.
    const nevada = LEGISLATIVE_RULE_PACKS.find((pack) =>
      pack.packId.startsWith("us-nv-"),
    )!;
    seatsForChamber(nevada, "assembly");
    expect(chamberByKey(nevada, "assembly").seats.kind).toBe("unknown");
  });
});

describe("a compile gap is not a research gap", () => {
  it("never hands a drawn qualification to a state whose law has been read", () => {
    // Kentucky's constitution HAS been read — that is why it has a compiled
    // legislature. Its § 32 states an age and a residence, and the reason
    // those are not in the qualification corpus is that the corpus has not
    // caught up, not that nobody knows. A drawn number there would put a
    // figure in front of a player that Kentucky's own instrument contradicts,
    // and would make a compile gap look answered.
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const candidacy = stateCandidacyPack(pack.jurisdictionKey);
      if (candidacy === null) continue;
      for (const office of candidacy.offices) {
        const qualification = office.qualification;
        for (const rule of [
          qualification.minimumAge,
          qualification.residency,
          qualification.termYears,
        ]) {
          if (rule.kind !== "known") continue;
          expect(rule.source.verification).not.toBe("game-profile");
        }
      }
    }
  });

  it("does hand one to a state nobody has read", () => {
    const texas = stateCandidacyPack("US-TX")!;
    expect(texas.offices.length).toBeGreaterThan(0);
    const house = texas.offices[0]!.qualification;
    expect(house.minimumAge.kind).toBe("known");
    expect(
      (house.minimumAge as { source: { verification: string } }).source
        .verification,
    ).toBe("game-profile");
  });
});

describe("real law overrides the draw", () => {
  it("uses each read constitution's own override fraction, not a drawn one", () => {
    // Four states proved this matters in a way a player feels. The draw gave
    // Tennessee two thirds where its constitution sets a simple majority,
    // turning one of the easiest override bars in the country into one of the
    // hardest; North Carolina three fifths of those PRESENT AND VOTING, which
    // is the whole reason an override there is politically live.
    const expected: Record<string, readonly [number, number]> = {
      "US-TN": [1, 2],
      "US-NC": [3, 5],
      "US-VA": [1, 2],
      "US-WV": [1, 2],
    };
    for (const [key, [numerator, denominator]] of Object.entries(expected)) {
      const pack = legislatureForState(key)!;
      expect(pack.basis).toBe("game-profile");
      const forum = pack.executive.override;
      expect(forum.kind).toBe("each-chamber");
      const threshold = (
        forum as {
          threshold: {
            numerator: number;
            denominatorParts: number;
            source: { verification: string };
          };
        }
      ).threshold;
      expect([threshold.numerator, threshold.denominatorParts]).toEqual([
        numerator,
        denominator,
      ]);
      // And it cites the instrument rather than the game's own profile.
      expect(threshold.source.verification).not.toBe("game-profile");
    }
  });

  it("still draws where no constitution has been read", () => {
    const texas = legislatureForState("US-TX")!;
    const forum = texas.executive.override as {
      threshold: { source: { verification: string } };
    };
    expect(forum.threshold.source.verification).toBe("game-profile");
    expect(vetoOverrideReadingFor("TX")).toBeNull();
  });

  it("records what the schema cannot carry instead of flattening it", () => {
    // Virginia requires two thirds of those present AND a majority of the
    // elected members. An each-chamber forum carries one fraction against one
    // denominator, so the second condition has nowhere to live — and dropping
    // it silently would make the override easier in play than the instrument
    // allows, which is the sort of thing nobody notices until it decides a
    // vote.
    const virginia = legislatureForState("US-VA")!;
    expect(virginia.unresolvedGaps.join(" ")).toMatch(
      /Virginia also requires 2 of 3 of "members-present"/,
    );
    // West Virginia's higher bar is per measure class, which the schema has no
    // field for on an each-chamber forum.
    const westVirginia = legislatureForState("US-WV")!;
    expect(westVirginia.unresolvedGaps.join(" ")).toMatch(
      /separate bar for override-budget/,
    );
    // And where the instrument's own basis maps to nothing this project names,
    // the fraction is kept and the mapping is disclosed rather than invented.
    const northCarolina = legislatureForState("US-NC")!;
    expect(northCarolina.unresolvedGaps.join(" ")).toMatch(
      /not the same set as anything this schema names/,
    );
  });

  it("picks the override action, not a neighboring one that merely names money", () => {
    // Virginia states one rule for "override-whole-or-item-veto" — the "item"
    // there is half a combined operation, not a money-only bar — and a picker
    // that excluded it selected Virginia's rule for ACCEPTING a governor's
    // recommendation, which is not an override at all. West Virginia names its
    // ordinary rule "override-ordinary-nonappropriation-bill", which a match on
    // "appropriation" excludes outright.
    expect(overrideThresholdFor("US-VA", [2, 3]).readBasis).toBe(
      "members-elected",
    );
    expect(overrideThresholdFor("US-WV", [2, 3]).numerator).toBe(1);
    expect(overrideThresholdFor("US-WV", [2, 3]).denominatorParts).toBe(2);
  });

  it("leaves a generated pack passing the integrity check while holding read law", () => {
    // A game-profile pack carrying a constitution is the goal, not a blend to
    // refuse. The refusal runs the other way only.
    for (const key of ["US-TN", "US-NC", "US-VA", "US-WV"]) {
      expect(() =>
        assertRulePackIntegrity(legislatureForState(key)!),
      ).not.toThrow();
    }
  });
});
