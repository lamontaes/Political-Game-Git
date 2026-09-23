import { afterEach, describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  activeLegislativeTermEvidence,
  addDays,
  bindRuleCapabilityResolver,
  OFFICE_OATH_TAKEN,
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
  legislativeBlueprint,
  legislativeTermDates,
  legislativeTermForRelationship,
  makeIsoDate,
  unadmittedRuleCapabilityResolver,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../simulation";
import { projectCampaign } from "./campaign-projection";
import {
  projectOfficeTransition,
  projectSwearingIn,
  takeOathForHeldOffice,
} from "./office-transition";
import { resolvePlayerCapabilities } from "./player-capabilities";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("a legislative term in a state with no sourced term rule", () => {
  it("uses the sourced rule where there is one and the marked blanket everywhere else", () => {
    const election = makeIsoDate("2026-11-03");
    const ky = legislativeTermDates(
      "us-ky-general-assembly-v1:house",
      election,
    )!;
    expect(ky.basis).toBe("sourced");
    expect([ky.startsAt, ky.endsAt]).toEqual(["2027-01-01", "2029-01-01"]);

    const ilHouse = legislativeTermDates(
      "us-il-general-assembly-v1:house",
      election,
    )!;
    expect(ilHouse.basis).toBe("blanket");
    expect(ilHouse.ruleVersion).toBe(BLANKET_LEGISLATIVE_TERM_RULE_VERSION);
    expect([ilHouse.startsAt, ilHouse.endsAt]).toEqual([
      "2027-01-01",
      "2029-01-01",
    ]);
    expect(
      legislativeTermDates("us-nv-legislature-v1:senate", election)!.endsAt,
    ).toBe("2031-01-01");
    // A known term length from the qualification corpus beats the blanket.
    expect(
      legislativeTermDates("us-ak-legislature-v1:senate", election)!.endsAt,
    ).toBe("2031-01-01");
    // Not a legislative office the game offers: no invented term.
    expect(legislativeTermDates("fixture:no-such-office", election)).toBeNull();
  });

  it("is not seated on election night in Illinois: it waits, shows the transition, and is seated when the term begins", () => {
    const { world, personId } = adultLifeIn("IL", "blanket-term-IL");
    const decided = runToElection(
      fileForOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    expect(projectCampaign(decided, personId).phase).toBe("won");
    const seat = workRelationshipHistoryForPerson(decided, personId).find(
      (relationship) => relationship.kind === "employment:legislative-member",
    )!;
    expect(seat).toBeDefined();
    expect(workStatusAt(decided, seat.id)?.status).toBe("expected");
    const term = legislativeTermForRelationship(decided, seat.id)!;
    expect(term.entry.stableKey).toContain(
      BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
    );
    expect(activeLegislativeTermEvidence(decided, seat.id)).toBeNull();
    expect(projectCampaign(decided, personId).afterword).toMatch(
      /The term begins January 1, \d{4}; until then the office is not theirs\./,
    );
    expect(projectOfficeTransition(decided, personId)?.startsAt).toBe(
      term.startsAt,
    );

    const seated = passUntil(decided, term.startsAt);
    expect(workStatusAt(seated, seat.id)?.status).toBe("active");
    expect(activeLegislativeTermEvidence(seated, seat.id)).not.toBeNull();
    expect(projectOfficeTransition(seated, personId)).toBeNull();
  }, 600_000);
});

describe.each(["ME", "GA", "MT", "IA", "TX", "MO"])(
  "a legislative term in %s, a state the game generates rather than compiles",
  (usps) => {
    it("waits, shows the transition, and is seated with a working office", () => {
      const { world, personId } = adultLifeIn(usps, `blanket-term-${usps}`);
      const decided = runToElection(
        fileForOffice(world, personId),
        personId,
        suppliedWin(personId),
      );
      expect(projectCampaign(decided, personId).phase).toBe("won");
      const seat = workRelationshipHistoryForPerson(decided, personId).find(
        (relationship) => relationship.kind === "employment:legislative-member",
      )!;
      expect(workStatusAt(decided, seat.id)?.status).toBe("expected");
      const transition = projectOfficeTransition(decided, personId)!;
      expect(transition.startsAt.endsWith("-01-01")).toBe(true);

      const seated = passUntil(decided, transition.startsAt);
      expect(workStatusAt(seated, seat.id)?.status).toBe("active");
      expect(activeLegislativeTermEvidence(seated, seat.id)).not.toBeNull();
      const capabilities = resolvePlayerCapabilities(seated);
      expect(capabilities.office).toBe(true);
      expect(capabilities.legislation).toBe(true);
      // The Office screen's workspace is built from this; it threw for Maine.
      expect(
        legislativeBlueprint(capabilities.legislativeScenarioKey!).label,
      ).toMatch(/Legislature|General Assembly/);

      // Before the term there is nothing to swear into.
      expect(projectSwearingIn(decided, personId)).toBeNull();
      expect(() => takeOathForHeldOffice(decided, personId)).toThrow(
        /no office to be sworn into/,
      );
      // From its first day the oath is waiting, and taking it is public.
      const waiting = projectSwearingIn(seated, personId)!;
      expect(waiting.swornInOn).toBeNull();
      expect(waiting.officeTitle).toMatch(/^Member of the /);
      const sworn = takeOathForHeldOffice(seated, personId);
      const oath = sworn.history.events.filter(
        (event) => event.type === OFFICE_OATH_TAKEN,
      );
      expect(oath).toHaveLength(1);
      expect(oath[0]!.visibility).toBe("public");
      expect(takeOathForHeldOffice(sworn, personId)).toBe(sworn);
      expect(projectSwearingIn(sworn, personId)!.swornInOn).toBe(
        seated.currentDate,
      );
      expect(
        projectSwearingIn(
          passUntil(sworn, addDays(sworn.currentDate, 1)),
          personId,
        ),
      ).toBeNull();
    }, 600_000);
  },
);
