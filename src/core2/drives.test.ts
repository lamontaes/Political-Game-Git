import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../simulation/dates";
import { DEFAULT_DATA } from "./data";
import { advanceCore, createLifeCore } from "./life";
import {
  DEFAULT_DRIVES_DATA,
  createDrivesModule,
  currentStrength,
  drivesReport,
  withDrives,
  type DrivesData,
} from "./modules/drives";
import { createHealthModule, healthReport } from "./modules/health";
import { parameter as p } from "./parameters";
import { coreAPI } from "./state";
import type {
  CoreEventInput,
  CoreInput,
  CoreState,
  PersonInput,
  PublicOrganization,
  Source,
} from "./types";

const startedAt = "2021-01-01";
const home = "place:drives-fixture-home";
const county = "county:drives-fixture-home";
const office = "organization:drives-fixture-office";
const deceasedId = "person:deceased";
const carerId = "person:carer";
const steadyId = "person:steady";
const friendId = "person:friend";
const staffId = "person:office-staff";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Controlled small drives-contract input, not observed people or a historical institution.",
  estimatedFrom:
    "Authored identities and traits; the death's impulse is the sourced Holmes-Rahe share through the tagged parameter table.",
};
const trait = (id: string) => `personality-v1:${id}`;

function person(id: string, overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1975-01-01",
    placeId: home,
    countyId: county,
    householdId: `household:${id}`,
    tier: "daily",
    traits: {},
    liquidMinor: p("minorPerDollar") * p("percent") * p("percent"),
    livingCostDailyMinor: p("minorPerDollar"),
    familyIds: [],
    knownIds: [],
    source,
    ...overrides,
  };
}

/** Two siblings lose the same parent; only their recorded traits differ. */
function bereavementInput(): CoreInput {
  const siblings = [carerId, steadyId];
  const people = [
    person(deceasedId, { birthDate: "1940-01-01", familyIds: siblings }),
    person(carerId, {
      familyIds: [deceasedId, steadyId],
      knownIds: [friendId],
      traits: {
        [trait("concern-for-distress")]: p("traitScale"),
        [trait("facet-zealous")]: p("traitScale"),
        [trait("facet-informal")]: p("traitScale"),
        [trait("facet-thrill-seeking")]: p("traitScale"),
      },
    }),
    person(steadyId, {
      familyIds: [deceasedId, carerId],
      traits: {
        [trait("facet-contented")]: p("traitScale"),
        [trait("facet-light-hearted")]: p("traitScale"),
        [trait("facet-calm")]: p("traitScale"),
        [trait("facet-shy")]: p("traitScale"),
      },
    }),
    person(friendId, {
      knownIds: [carerId],
      traits: {
        [trait("facet-open-minded")]: p("traitScale"),
        [trait("facet-tender-hearted")]: p("traitScale"),
      },
    }),
    person(staffId, { tier: "husk", jobId: "job:office-staff" }),
  ];
  const officeRecord: PublicOrganization = {
    id: office,
    placeId: home,
    name: "Recorded fixture public office",
    kind: "fixture-public-office",
    source,
    affordances: ["public-meeting-place", "known-office"],
    staff: [
      {
        personId: staffId,
        jobId: "job:office-staff",
        title: "Recorded constituent-services worker",
        source,
      },
    ],
  };
  return {
    seed: "p10-drives-contract",
    startedAt,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: [
      {
        id: "job:office-staff",
        personId: staffId,
        organizationId: office,
        title: "Recorded constituent-services worker",
        wageDailyMinor: p("minorPerDollar"),
        hoursDaily: p("workHours"),
        source,
      },
    ],
    organizations: [
      {
        id: office,
        placeId: home,
        name: officeRecord.name,
        kind: officeRecord.kind,
        liquidMinor: p("minorPerDollar") * p("percent"),
        source,
      },
    ],
    publicOrganizations: [officeRecord],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function death(core: CoreState, data = DEFAULT_DRIVES_DATA): CoreEventInput {
  const share = p("srrsDeathOfCloseFamilyMember") / p("srrsMaximumUnits");
  const id = `life.death:${deceasedId}:${core.date}`;
  return {
    id,
    date: core.date,
    kind: data.eventRules.find((row) => row.id === "bereavement")!.eventKind,
    personIds: [deceasedId],
    witnessIds: [carerId, steadyId],
    placeId: home,
    topic: "health:cancer",
    desiredChange: "care-and-cure:cancer",
    stressImpulse: share * p("lifeEventStressScale"),
    moodImpulse: -share * p("lifeEventMoodScale"),
    source,
  };
}

function bereavedCore(
  data: DrivesData = DEFAULT_DRIVES_DATA,
  input: CoreInput = bereavementInput(),
) {
  const core = createLifeCore(input, {
    data: withDrives(DEFAULT_DATA, data),
    modules: [createDrivesModule(data)],
  });
  const api = coreAPI(core);
  api.updatePerson(deceasedId, { alive: false });
  api.emit(death(core, data));
  return core;
}

describe("P10 drives and causes", () => {
  it("two siblings hear the same death and decide differently from their own traits", () => {
    const core = bereavedCore();
    const report = drivesReport(core);
    const carer = report.decisions.find((row) => row.personId === carerId)!;
    const steady = report.decisions.find((row) => row.personId === steadyId)!;
    expect(carer.eventId).toBe(steady.eventId);
    expect(carer.role).toBe("family");
    expect(steady.role).toBe("family");
    expect(carer.chosen.responseId).not.toBe(steady.chosen.responseId);
    expect(carer.chosen.responseId).toBe("take-up-cause");
    expect(steady.chosen.responseId).toBe("carry-on");
    expect(carer.attention).toBeGreaterThan(steady.attention);
    expect(carer.chosen.reasons.trait).toBeGreaterThan(p("zero"));
    expect(carer.runnerUp).toBeDefined();
    expect(carer.chosen.score).toBeGreaterThanOrEqual(carer.runnerUp!.score);
    const drive = core.people.get(carerId)!.drives.get(carer.driveId!)!;
    expect(drive).toMatchObject({
      kind: "cause",
      topic: "health:cancer",
      sourceEventId: carer.eventId,
    });
    expect(drive.strength).toBeCloseTo(carer.strengthAdded);
    expect(core.people.get(steadyId)!.drives.size).toBe(p("zero"));
    expect(
      core.people.get(carerId)!.goals.get(`drive:${drive.id}`),
    ).toMatchObject({ kind: "change-condition", sourceDriveId: drive.id });
  });

  it("control: siblings with identical traits make the identical decision", () => {
    const base = bereavementInput();
    const carer = base.people.find((row) => row.id === carerId)!;
    const core = bereavedCore(DEFAULT_DRIVES_DATA, {
      ...base,
      people: base.people.map((row) =>
        row.id === steadyId
          ? { ...row, traits: carer.traits, knownIds: carer.knownIds }
          : row,
      ),
    });
    const decisions = drivesReport(core).decisions;
    const one = decisions.find((row) => row.personId === carerId)!;
    const two = decisions.find((row) => row.personId === steadyId)!;
    expect(two.chosen.responseId).toBe(one.chosen.responseId);
    expect(two.attention).toBeCloseTo(one.attention);
    expect(two.strengthAdded).toBeCloseTo(one.strengthAdded);
  });

  it("swapping one trait changes the decision: concern for distress tips a neutral sibling", () => {
    const base = bereavementInput();
    const withTraits = (traits: Record<string, number>) =>
      drivesReport(
        bereavedCore(DEFAULT_DRIVES_DATA, {
          ...base,
          people: base.people.map((row) =>
            row.id === steadyId ? { ...row, traits } : row,
          ),
        }),
      ).decisions.find((row) => row.personId === steadyId)!;
    const shared = {
      [trait("facet-zealous")]: p("traitScale"),
      [trait("facet-informal")]: p("traitScale"),
    };
    const without = withTraits(shared);
    const withConcern = withTraits({
      ...shared,
      [trait("concern-for-distress")]: p("traitScale"),
    });
    expect(withConcern.attention).toBeGreaterThan(without.attention);
    const urgency = (row: typeof without) =>
      row.considered.find((entry) => entry.responseId === "take-up-cause")!
        .urgency;
    expect(urgency(withConcern)).toBeGreaterThan(urgency(without));
  });

  it("a young child with the activist's traits carries on: agency rises smoothly with age", () => {
    const base = bereavementInput();
    const carer = base.people.find((row) => row.id === carerId)!;
    const core = bereavedCore(DEFAULT_DRIVES_DATA, {
      ...base,
      people: base.people.map((row) =>
        row.id === steadyId
          ? { ...row, traits: carer.traits, birthDate: "2013-01-01" }
          : row,
      ),
    });
    const decisions = drivesReport(core).decisions;
    const adult = decisions.find((row) => row.personId === carerId)!;
    const child = decisions.find((row) => row.personId === steadyId)!;
    expect(adult.chosen.responseId).toBe("take-up-cause");
    expect(child.chosen.responseId).toBe("carry-on");
    expect(child.agency).toBeLessThan(adult.agency);
    expect(child.agency).toBeGreaterThan(p("zero"));
    expect(core.people.get(steadyId)!.drives.size).toBe(p("zero"));
  });

  it("replaces the undecided situation shortcut so nobody is assigned a cause", () => {
    expect(
      withDrives(DEFAULT_DATA).situations.some((row) =>
        DEFAULT_DRIVES_DATA.replacedSituationIds.includes(row.id),
      ),
    ).toBe(false);
    expect(
      DEFAULT_DATA.situations.some((row) =>
        DEFAULT_DRIVES_DATA.replacedSituationIds.includes(row.id),
      ),
    ).toBe(true);
  });

  it("a drive fades by its half-life when nothing renews it", () => {
    const core = bereavedCore();
    const api = coreAPI(core);
    const drive = drivesReport(core).drives.find(
      (row) => row.personId === carerId,
    )!;
    const start = currentStrength(api, drive);
    const later = addDays(makeIsoDate(core.date), drive.halfLifeDays);
    expect(currentStrength(api, drive, later)).toBeCloseTo(start / p("two"));
  });

  it("the cause becomes acts over months, each with its decision reasons", () => {
    const core = bereavedCore();
    advanceCore(core, "2021-07-01");
    const drive = drivesReport(core).drives.find(
      (row) => row.personId === carerId,
    )!;
    const kinds = new Set(drive.acts.map((row) => row.actionId));
    expect(kinds.has("share-cause")).toBe(true);
    expect(drive.acts.length).toBeGreaterThan(p("one"));
    for (const act of drive.acts) {
      expect(act.reasons.drive).toBeGreaterThan(p("zero"));
      expect(Number.isFinite(act.score)).toBe(true);
    }
    const months = new Set(
      drive.acts.map((row) =>
        row.date.slice(p("zero"), p("isoMonthCharacters")),
      ),
    );
    expect(months.size).toBeGreaterThan(p("one"));
    // The friend was told; whether a second drive formed is the friend's own decision.
    const heard = drivesReport(core).decisions.filter(
      (row) => row.personId === friendId,
    );
    expect(heard.length).toBeGreaterThan(p("zero"));
    expect(heard.every((row) => row.ruleId === "cause-shared")).toBe(true);
  });

  it("a new drive kind and response arrive as data rows only", () => {
    const data: DrivesData = {
      ...DEFAULT_DRIVES_DATA,
      driveKinds: [
        ...DEFAULT_DRIVES_DATA.driveKinds,
        {
          id: "remembrance",
          goalKind: "connect",
          halfLifeParameter: "driveCallingHalfLifeDays",
          shareable: true,
        },
      ],
      responses: [
        ...DEFAULT_DRIVES_DATA.responses.filter(
          (row) => row.id !== "take-up-cause",
        ),
        {
          ...DEFAULT_DRIVES_DATA.responses.find(
            (row) => row.id === "take-up-cause",
          )!,
          id: "keep-their-memory",
          driveKind: "remembrance",
          goalKinds: ["respond:keep-their-memory"],
        },
      ],
      eventRules: DEFAULT_DRIVES_DATA.eventRules.map((row) =>
        row.id === "bereavement"
          ? { ...row, responses: ["keep-their-memory", "carry-on"] }
          : row,
      ),
    };
    const core = bereavedCore(data);
    const carer = drivesReport(core).decisions.find(
      (row) => row.personId === carerId,
    )!;
    expect(carer.chosen.responseId).toBe("keep-their-memory");
    expect(core.people.get(carerId)!.drives.get(carer.driveId!)!.kind).toBe(
      "remembrance",
    );
  });
});

describe("P10 health producer", () => {
  it("records serious illness then death from the no-dice mortality rule, heard by family", () => {
    const elders: PersonInput[] = [];
    const children: PersonInput[] = [];
    for (
      let index = p("zero");
      index < p("percent") / p("two");
      index += p("one")
    ) {
      const elder = `person:elder-${index}`;
      const child = `person:child-${index}`;
      elders.push(
        person(elder, {
          birthDate: "1925-03-01",
          tier: "weekly",
          familyIds: [child],
        }),
      );
      children.push(
        person(child, {
          birthDate: "1960-03-01",
          tier: "weekly",
          familyIds: [elder],
          traits: { [trait("concern-for-distress")]: p("traitScale") },
        }),
      );
    }
    const people = [...elders, ...children];
    const core = createLifeCore(
      {
        seed: "p10-health-contract",
        startedAt,
        people,
        households: people.map((row) => ({
          id: row.householdId,
          placeId: row.placeId,
          memberIds: [row.id],
          source,
        })),
        jobs: [],
        organizations: [],
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
      },
      {
        data: withDrives(DEFAULT_DATA),
        modules: [createHealthModule(), createDrivesModule()],
      },
    );
    advanceCore(core, "2022-01-01");
    const health = healthReport(core);
    expect(health.onsets).toBeGreaterThan(p("zero"));
    expect(health.deaths).toBeGreaterThan(p("zero"));
    for (const row of health.cases.filter((entry) => entry.deathEventId)) {
      expect(row.deathDate! > row.onsetDate).toBe(true);
      expect(core.people.get(row.personId)!.alive).toBe(false);
    }
    const heard = drivesReport(core).decisions.filter(
      (row) => row.eventKind === "life.death",
    );
    expect(heard.length).toBeGreaterThan(p("zero"));
    expect(heard.every((row) => row.role === "family")).toBe(true);
  });
});
