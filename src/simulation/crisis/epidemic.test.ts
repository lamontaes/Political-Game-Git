import { beforeAll, describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, ageOnDate } from "../dates";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { storyLeads } from "../press/desk";
import { advanceWorld, assertWorldIntegrity } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { personName } from "../people";
import type { EntityId, World } from "../types";
import { beginHealthEpisode } from "./health";
import { MULTIPLIER_ONE } from "./hazard";
import {
  EPIDEMIC_EVENT_TYPES,
  EPIDEMIC_PASS_KEY,
  EPIDEMIC_VERSION,
  UNRESEARCHED_EPIDEMIC,
  caregiverFor,
  epidemicCases,
  epidemicCaughtEvents,
  epidemicCouncilMeetingDecision,
  epidemicWorkAbsences,
  peopleOutSick,
} from "./epidemic";

const LONG = 900_000;

/** Charlottesville, Virginia; Kentucky is deliberately not the test place. */
const VIRGINIA_TOWN = "5114968";

function open(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: VIRGINIA_TOWN,
      startAge: 30,
      depth: "summarize-earlier-life",
    }),
  ).game!;
}

describe("epidemics among named people", () => {
  it("every rate is a marked placeholder with its research questions", () => {
    expect(UNRESEARCHED_EPIDEMIC.provenance).toBe("unresearched-blanket-rule");
    expect(UNRESEARCHED_EPIDEMIC.researchQuestions).toEqual(
      expect.arrayContaining([
        "epidemic-transmission-by-setting",
        "epidemic-severity-by-age",
        "epidemic-seasonality",
      ]),
    );
    for (const rate of Object.values(UNRESEARCHED_EPIDEMIC.exposureBySetting)) {
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1);
    }
    expect(UNRESEARCHED_EPIDEMIC.seasonalMultiplier).toHaveLength(12);
  });

  describe("a year in a watched town", () => {
    let start: World;
    let later: World;
    let town: EntityId;

    beforeAll(() => {
      const life = open("probe");
      start = life.world;
      town = start.people[life.playerPersonId]!.homeJurisdictionId;
      later = advanceWorld(
        start,
        400,
        createCampaignElectionTransitionRegistry(),
      );
    }, LONG);

    it("a new game schedules the weekly pass once", () => {
      expect(
        start.history.futureDueItems.filter(
          (item) => item.transitionKey === EPIDEMIC_PASS_KEY,
        ),
      ).toHaveLength(1);
      assertWorldIntegrity(later);
    });

    it("the illness moves from named person to named person along real ties", () => {
      const cases = epidemicCases(later);
      const caught = epidemicCaughtEvents(later).filter(
        (event) => event.jurisdictionId === town,
      );
      const passedOn = caught.filter((event) =>
        event.participants.some((p) => p.role === "other:passed-on"),
      );
      expect(passedOn.length).toBeGreaterThan(3);
      const settings = new Set(
        passedOn.flatMap((event) =>
          event.tags
            .filter((tag) => tag.startsWith("epidemic:setting:"))
            .map((tag) => tag.slice("epidemic:setting:".length)),
        ),
      );
      expect(settings.has("household")).toBe(true);
      expect(settings.has("school")).toBe(true);
      const byPerson = new Map(cases.map((found) => [found.personId, found]));
      for (const event of passedOn) {
        const patient = event.participants.find(
          (p) => p.role === "focus:patient",
        )!.personId;
        const source = event.participants.find(
          (p) => p.role === "other:passed-on",
        )!.personId;
        // The source fell ill the week before, and the patient's episode
        // names the source's episode as its cause.
        const patientCase = cases.find(
          (found) =>
            found.personId === patient && found.onsetAt === event.occurredAt,
        )!;
        const sourceCase = cases.find(
          (found) =>
            found.personId === source &&
            found.onsetAt ===
              addDays(event.occurredAt, -UNRESEARCHED_EPIDEMIC.passDays),
        );
        expect(sourceCase).toBeDefined();
        expect(patientCase.episode.causalParentIds).toContain(
          sourceCase!.episode.id,
        );
        expect(patientCase.outbreakKey).toBe(sourceCase!.outbreakKey);
        expect(byPerson.has(source)).toBe(true);
        expect(event.summary).toContain(personName(later.people[patient]!));
      }
    });

    it("every case raises its person's death risk through the ordinary health episode", () => {
      const cases = epidemicCases(later);
      expect(cases.length).toBeGreaterThan(0);
      for (const found of cases) {
        expect(found.episode.hazardMultiplierMicros).toBeGreaterThan(
          MULTIPLIER_ONE,
        );
        expect(found.episode.origin).toEqual({
          kind: "authored",
          note: `${EPIDEMIC_VERSION}:${found.outbreakKey}`,
        });
      }
    });

    it("a principal closes a school for a stated reason, and it passes nothing on while closed", () => {
      const closures = later.history.events.filter(
        (event) => event.type === EPIDEMIC_EVENT_TYPES.schoolClosed,
      );
      expect(closures.length).toBeGreaterThan(0);
      for (const closure of closures) {
        const decider = closure.participants.find(
          (p) => p.role === "agency:decider",
        )!;
        expect(later.people[decider.personId]).toBeDefined();
        expect(closure.summary).toMatch(
          /, the principal, closed .+ because \d+ of its \d+ students and staff were out sick\.$/,
        );
        expect(closure.visibility).toBe("public");
        const schoolTag = closure.tags.find((tag) =>
          tag.startsWith("epidemic:school:"),
        )!;
        const school = schoolTag.slice("epidemic:school:".length);
        const reopened = later.history.events.find(
          (event) =>
            event.type === EPIDEMIC_EVENT_TYPES.schoolReopened &&
            event.tags.includes(schoolTag) &&
            event.occurredAt > closure.occurredAt,
        );
        const until = reopened?.occurredAt ?? "9999-12-31";
        const spreadAtSchool = epidemicCaughtEvents(later).filter(
          (event) =>
            event.occurredAt > closure.occurredAt &&
            event.occurredAt < until &&
            event.tags.includes("epidemic:setting:school") &&
            event.summary.includes(
              later.history.organizationProfiles.find(
                (profile) => profile.organizationId === school,
              )!.name,
            ),
        );
        expect(spreadAtSchool).toEqual([]);
      }
    });

    it("a week with enough new cases becomes public news the local paper picks up", () => {
      const reports = later.history.events.filter(
        (event) => event.type === EPIDEMIC_EVENT_TYPES.outbreakReported,
      );
      expect(reports.length).toBeGreaterThan(0);
      for (const report of reports) {
        expect(report.visibility).toBe("public");
        expect(report.summary).toMatch(
          /^An illness is spreading in .+: \d+ people fell sick this week/,
        );
        const newCases = Number(
          report.tags
            .find((tag) => tag.startsWith("epidemic:new-cases:"))!
            .split(":")[2],
        );
        expect(newCases).toBeGreaterThanOrEqual(
          UNRESEARCHED_EPIDEMIC.newsNewCasesInWeek,
        );
      }
      const ids = new Set(reports.map((report) => report.id));
      expect(
        storyLeads(later).some((lead) =>
          lead.basisEventIds.some((id) => ids.has(id)),
        ),
      ).toBe(true);
    });
  });

  it(
    "days out sick come off the paycheck in a part-time job, not a full-time one",
    () => {
      const life = open("epidemic-paycheck");
      // Town pay flows open on the first payday.
      let world = advanceWorld(
        life.world,
        21,
        createCampaignElectionTransitionRegistry(),
      );
      const paid = (hoursOk: (hours: number) => boolean) =>
        world.history.resourceFlows.find((flow) => {
          if (flow.basisReference.kind !== "work") return false;
          const personId = (flow.recipient as { personId: EntityId }).personId;
          if (personId === life.playerPersonId) return false;
          const job = activeWorkRelationshipsAt(world, personId).find(
            (work) =>
              work.relationship.id ===
              (flow.basisReference as { workRelationshipId: EntityId })
                .workRelationshipId,
          );
          if (!job) return false;
          const { minimumHours, maximumHours } =
            job.role.timeDemand.expectedWeekly;
          return hoursOk((minimumHours + maximumHours) / 2);
        })!;
      const partTime = paid(
        (hours) => hours < UNRESEARCHED_EPIDEMIC.fullTimeWeeklyHours,
      );
      const fullTime = paid(
        (hours) => hours >= UNRESEARCHED_EPIDEMIC.fullTimeWeeklyHours,
      );
      expect(partTime).toBeDefined();
      expect(fullTime).toBeDefined();
      for (const flow of [partTime, fullTime])
        world = beginHealthEpisode(world, {
          stableKey: `test:${flow.id}`,
          personId: (flow.recipient as { personId: EntityId }).personId,
          severity: "acute",
          initialLimitation: "limited",
          origin: { kind: "authored", note: `${EPIDEMIC_VERSION}:test` },
          causalParentIds: [],
        });
      const onset = world.currentDate;
      world = advanceWorld(
        world,
        35,
        createCampaignElectionTransitionRegistry(),
      );
      const covering = (flowId: EntityId) =>
        world.history.resourceTransferOutcomes.filter(
          (outcome) =>
            outcome.resourceFlowId === flowId &&
            outcome.periodEndsAt >= onset &&
            outcome.periodStartsAt <= addDays(onset, 6),
        );
      const cut = covering(partTime.id);
      expect(cut.length).toBeGreaterThan(0);
      expect(
        cut.some(
          (outcome) =>
            outcome.reasonKind === "custom:unpaid-sick-days" &&
            outcome.transferredAmount.minorUnits <
              outcome.attemptedAmount.minorUnits &&
            /, less \d+ unpaid days? out sick\.$/.test(outcome.note ?? ""),
        ),
      ).toBe(true);
      const kept = covering(fullTime.id);
      expect(kept.length).toBeGreaterThan(0);
      for (const outcome of kept) expect(outcome.status).toBe("completed");
    },
    LONG,
  );

  it(
    "the adult with the fewest paid hours stays home with a sick child",
    () => {
      const life = open("epidemic-caregiver");
      let world = life.world;
      const child = (Object.keys(world.people) as EntityId[])
        .sort()
        .find((id) => {
          const age = ageOnDate(world.people[id]!.birthDate, world.currentDate);
          return (
            age >= 5 &&
            age < UNRESEARCHED_EPIDEMIC.careAgeUnder &&
            caregiverFor(world, id) !== null
          );
        })!;
      expect(child).toBeDefined();
      const carer = caregiverFor(world, child)!;
      const adults = householdMembershipsAt(world, child).flatMap(
        (membership) =>
          peopleInHouseholdAt(world, membership.household.id).filter(
            (id) =>
              id !== child &&
              ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
          ),
      );
      expect(adults).toContain(carer);
      const onset = world.currentDate;
      world = beginHealthEpisode(world, {
        stableKey: "test:child",
        personId: child,
        severity: "acute",
        initialLimitation: "limited",
        origin: { kind: "authored", note: `${EPIDEMIC_VERSION}:test` },
        causalParentIds: [],
      });
      const absences = epidemicWorkAbsences(world, onset, addDays(onset, 13));
      expect(absences.get(child)!.sickDays).toBeGreaterThan(0);
      const home = absences.get(carer)!;
      expect(home.caringDays).toBeGreaterThan(0);
      expect(home.missedDays).toBe(home.caringDays);
      expect(home.sickDays).toBe(0);
    },
    LONG,
  );

  it(
    "a council chair cancels a meeting that sickness leaves without a quorum",
    () => {
      const life = open("epidemic-council");
      let world = life.world;
      const town = world.people[life.playerPersonId]!.homeJurisdictionId;
      const members = (Object.keys(world.people) as EntityId[])
        .filter(
          (id) =>
            id !== life.playerPersonId &&
            world.people[id]!.homeJurisdictionId === town,
        )
        .sort()
        .slice(0, 5);
      expect(members).toHaveLength(5);
      const chair = members[0]!;
      const held = epidemicCouncilMeetingDecision(world, {
        stableKey: "test:meeting:1",
        town,
        bodyName: "City Council",
        chairPersonId: chair,
        memberPersonIds: members,
      });
      expect(held.canceled).toBe(false);
      expect(held.world).toBe(world);

      for (const member of members.slice(1, 4))
        world = beginHealthEpisode(world, {
          stableKey: `test:${member}`,
          personId: member,
          severity: "acute",
          initialLimitation: "limited",
          origin: {
            kind: "authored",
            note: `${EPIDEMIC_VERSION}:${town}:test`,
          },
          causalParentIds: [],
        });
      world = advanceWorld(world, 1);
      expect(peopleOutSick(world).size).toBe(3);
      const decided = epidemicCouncilMeetingDecision(world, {
        stableKey: "test:meeting:2",
        town,
        bodyName: "City Council",
        chairPersonId: chair,
        memberPersonIds: members,
      });
      expect(decided.canceled).toBe(true);
      const event = decided.world.history.events.at(-1)!;
      expect(event.type).toBe(EPIDEMIC_EVENT_TYPES.meetingCanceled);
      expect(event.summary).toContain(
        "canceled the meeting of the City Council because only 2 of its 5 members were well enough to attend, short of a quorum.",
      );
      expect(event.participants).toEqual([
        expect.objectContaining({ personId: chair, role: "agency:decider" }),
      ]);
    },
    LONG,
  );
});
