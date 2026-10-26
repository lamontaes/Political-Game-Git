import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "./kernel/dates";
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
import {
  DEFAULT_HEALTH_DATA,
  createHealthModule,
  healthReport,
  severityImpulse,
} from "./modules/health";
import { openingTemperaments } from "./opening-personality";
import firings from "../../data/research/people/nelp-yougov-firings-2022.json" with { type: "json" };
import forgiveness from "../../data/research/people/fehr-forgiveness-correlates-2010.json" with { type: "json" };
import termination from "../../data/research/people/termination-claims-1998.json" with { type: "json" };
import trajectories from "../../data/research/people/trauma-trajectories-2018.json" with { type: "json" };
import { parameter as p } from "./parameters";
import { coreAPI } from "./state";
import type {
  CoreEventInput,
  CoreModule,
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
  extra: readonly CoreModule[] = [],
) {
  const core = createLifeCore(input, {
    data: withDrives(DEFAULT_DATA, data),
    modules: [createDrivesModule(data), ...extra],
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
    // Traits lean the carer toward the cause inside its urgency (scaled by agency), not as a second chooser term.
    const takeUp = carer.considered.find(
      (row) => row.responseId === "take-up-cause",
    )!;
    expect(takeUp.lean).toBeGreaterThan(p("zero"));
    expect(carer.chosen.reasons.trait).toBe(p("zero"));
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

  it("a closure reaches only the workers it names, with its own sourced impact, and a grudge targets the business", () => {
    const core = createLifeCore(bereavementInput(), {
      data: withDrives(DEFAULT_DATA, DEFAULT_DRIVES_DATA),
      modules: [createDrivesModule(DEFAULT_DRIVES_DATA)],
    });
    const api = coreAPI(core);
    const id = `organization.closed:${office}:${core.date}`;
    // As the core's finance writer records it: no appraised impulse.
    api.emit({
      id,
      date: core.date,
      kind: "organization.closed",
      personIds: [carerId, steadyId],
      placeId: home,
      publicRecord: true,
      source,
      facts: { [`organization:${office}:status`]: "closed" },
    });
    const report = drivesReport(core);
    const decided = report.decisions.filter((row) => row.eventId === id);
    expect(decided.map((row) => row.personId).sort()).toEqual(
      [carerId, steadyId].sort(),
    );
    for (const row of decided) {
      expect(row.attention).toBeGreaterThan(p("zero"));
      expect(row.runnerUp).toBeDefined();
    }
    for (const drive of report.drives.filter((row) =>
      [carerId, steadyId].includes(row.personId),
    )) {
      expect(drive.sourceEventId).toBe(id);
      if (drive.kind === "grudge") expect(drive.targetId).toBe(office);
    }
    expect(core.people.get(friendId)!.drives.size).toBe(p("zero"));
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

  it("emits a drive moment with who, the causing event and the strength", () => {
    const seen: CoreEventInput[] = [];
    bereavedCore(DEFAULT_DRIVES_DATA, bereavementInput(), [
      {
        id: "moment-spy",
        eventKinds: [DEFAULT_DRIVES_DATA.eventKinds.formed],
        onEvent: (_api, event) => void seen.push(event),
      },
    ]);
    const moment = seen.find(
      (event) => event.kind === DEFAULT_DRIVES_DATA.eventKinds.formed,
    )!;
    expect(moment.personIds).toEqual([carerId]);
    const facts = Object.entries(moment.facts ?? {});
    const fact = (name: keyof typeof DEFAULT_DRIVES_DATA.factKeys) =>
      facts.find(([key]) =>
        key.endsWith(`:${DEFAULT_DRIVES_DATA.factKeys[name]}`),
      )?.[1];
    expect(fact("sourceEvent")).toBe(`life.death:${deceasedId}:${startedAt}`);
    expect(fact("response")).toBe("take-up-cause");
    expect(Number(fact("strength"))).toBeGreaterThan(p("zero"));
    expect(Number(fact("strength"))).toBeLessThan(p("one"));
  });

  it("no data row hands anyone a drive without their decision", () => {
    for (const data of [DEFAULT_DATA, withDrives(DEFAULT_DATA)])
      expect(data.situations.filter((row) => row.driveKind)).toEqual([]);
  });

  it("is deterministic: the same inputs give the same drives, acts and reasons", () => {
    const run = () => {
      const core = bereavedCore();
      advanceCore(core, "2021-04-01");
      return JSON.stringify(
        drivesReport(core).drives.map((drive) => ({
          id: drive.id,
          personId: drive.personId,
          acts: drive.acts,
          formations: drive.formations,
        })),
      );
    };
    expect(run()).toBe(run());
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
      if (act.basis === "recorded") {
        // The life module chose it; its saved reason names this drive.
        expect(act.reasonKey?.endsWith(`:${drive.id}`)).toBe(true);
      } else {
        expect(act.reasons!.drive).toBeGreaterThan(p("zero"));
        expect(Number.isFinite(act.score)).toBe(true);
      }
    }
    expect(drive.acts.some((act) => act.basis === "scored")).toBe(true);
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

  it("what a person gave lately to a cause pulls against giving more of the same", () => {
    const core = bereavedCore();
    advanceCore(core, "2021-07-01");
    const shares = drivesReport(core)
      .drives.filter((row) => row.personId === carerId)
      .flatMap((row) => row.acts)
      .filter((act) => act.actionId === "share-cause" && act.basis === "scored")
      .sort((a, b) => a.date.localeCompare(b.date));
    expect(shares.length).toBeGreaterThan(p("one"));
    // The first share had nothing given before it; each later one weighs
    // what was given since, fading with the days between.
    expect(shares[p("zero")]!.reasons!.module).toBe(p("zero"));
    for (const act of shares.slice(p("one")))
      expect(act.reasons!.module!).toBeLessThan(p("zero"));
  });

  it("a donation moves the donor's money to the group through the cash journal", () => {
    const core = bereavedCore();
    const api = coreAPI(core);
    const definition = DEFAULT_DRIVES_DATA.actions.find(
      (row) => row.id === "donate-to-cause",
    )!;
    const donor = core.people.get(carerId)!;
    const group = core.organizations.get(office)!;
    const donorBefore = donor.liquidMinor,
      groupBefore = group.liquidMinor,
      sequenceBefore = core.cashJournal.nextSequence;
    // The gift is a share of the cash above the donor's buffer, scaled by how
    // strongly they hold the cause (at most the full share).
    const spare =
      donor.liquidMinor - donor.livingCostDailyMinor * p("moneyBufferDays");
    // The carer's own decision formed this drive from the death; the gift serves it.
    const drive = drivesReport(core).drives.find(
      (row) => row.personId === carerId,
    )!;
    const donate = createDrivesModule().effectHandlers!.donate!;
    donate(
      api,
      carerId,
      {
        definition,
        targetId: office,
        driveId: drive.id,
        availableHours: p("workHours"),
      },
      core.date,
      p("one"),
      undefined as never,
    );
    const amount = donorBefore - donor.liquidMinor;
    expect(amount).toBeGreaterThan(p("zero"));
    expect(amount).toBeLessThanOrEqual(
      Math.floor(spare * p(definition.effectParameter!)),
    );
    expect(group.liquidMinor).toBe(groupBefore + amount);
    expect(core.cashJournal.nextSequence).toBe(sequenceBefore + p("one"));
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

/**
 * A fixed fixture of perceived losses: a thousand adults whose temperaments
 * come from the opening generator (one fixed seed), each of whom loses a
 * close relative, or each of whom is laid off by the same owner. The town's
 * share is checked against the research; nobody's answer is rolled.
 */
describe("drive responses against the research bands", () => {
  const ownerId = "person:band-owner";
  const firm = "organization:band-firm";
  const subjects = Array.from({ length: 1000 }, (_, index) => ({
    id: `person:band-${index}`,
    birthDate: `${1951 + ((index * 7) % 50)}-0${1 + (index % 9)}-15`,
    gender: index % 2 ? "female" : "male",
    parents: [] as string[],
  }));
  const temperaments = openingTemperaments(subjects, {
    seed: "p10-drives-bands",
    startedAt,
  });
  const resilience = trajectories.trajectories.find(
    (row) => row.id === "resilience",
  )!;

  function fixture(
    extra: readonly PersonInput[],
    familyOf: (index: number) => readonly string[],
    scale?: number,
  ) {
    const people = [
      ...extra,
      ...subjects.map((row, index) =>
        person(row.id, {
          birthDate: row.birthDate,
          familyIds: familyOf(index),
          traits: temperaments.get(row.id)!,
          looks: { gender: row.gender },
        }),
      ),
    ];
    const data =
      scale === undefined
        ? DEFAULT_DATA
        : {
            ...DEFAULT_DATA,
            parameters: {
              ...DEFAULT_DATA.parameters,
              responseBereavementFitScale: {
                ...DEFAULT_DATA.parameters.responseBereavementFitScale!,
                value: scale,
              },
            },
          };
    return createLifeCore(
      {
        seed: "p10-drives-bands",
        startedAt,
        people,
        households: people.map((row) => ({
          id: row.householdId,
          placeId: row.placeId,
          memberIds: [row.id],
          source,
        })),
        jobs: [],
        organizations: [
          {
            id: firm,
            placeId: home,
            name: "Recorded fixture firm",
            kind: "firm",
            liquidMinor: p("minorPerDollar") * p("percent"),
            source,
          },
        ],
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
      },
      {
        data: withDrives(data, DEFAULT_DRIVES_DATA),
        modules: [createDrivesModule(DEFAULT_DRIVES_DATA)],
      },
    );
  }

  /** Every adult loses the same close relative, whose other relative they have living. */
  function bereaved(scale?: number) {
    const core = fixture(
      [person(deceasedId, { birthDate: "1940-01-01" })],
      (index) => [deceasedId, subjects[(index + 1) % subjects.length]!.id],
      scale,
    );
    const api = coreAPI(core);
    api.updatePerson(deceasedId, { alive: false });
    api.emit({
      ...death(core, DEFAULT_DRIVES_DATA),
      witnessIds: subjects.map((row) => row.id),
    });
    return core;
  }

  /** Every adult is let go by the same living owner of the same firm. */
  function laidOff() {
    const core = fixture(
      [person(ownerId, { birthDate: "1965-01-01" })],
      (index) => [subjects[(index + 1) % subjects.length]!.id],
    );
    const api = coreAPI(core);
    const severity = severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity);
    for (const row of subjects)
      api.emit({
        id: `event:work.job-lost:${core.date}:job:${row.id}`,
        date: core.date,
        kind: "work.job-lost",
        personIds: [row.id],
        placeId: home,
        publicRecord: false,
        topic: firm,
        ...severity,
        source,
        facts: { decidedBy: ownerId, organizationId: firm },
      });
    return core;
  }

  /** The percent of one rule's responses that were this response. */
  const share = (core: CoreState, rule: string, response: string) => {
    const counts = drivesReport(core).responsesByRule;
    const mine = Object.entries(counts).filter(([key]) =>
      key.startsWith(`${rule}:`),
    );
    const total = mine.reduce((sum, [, count]) => sum + count, p("zero"));
    return (100 * (counts[`${rule}:${response}`] ?? p("zero"))) / total;
  };

  it("the share of the bereaved who carry on is inside the trajectory meta-analysis's interval", () => {
    const core = bereaved();
    const carryOn = share(core, "bereavement", "carry-on");
    expect(carryOn).toBeGreaterThanOrEqual(resilience.low);
    expect(carryOn).toBeLessThanOrEqual(resilience.high);
    // Every decision names its event and the traits and ties that weighed it.
    const rows = drivesReport(core).decisions.filter(
      (row) => row.ruleId === "bereavement",
    );
    expect(rows).toHaveLength(subjects.length);
    for (const row of rows) {
      expect(row.eventId).toBe(`life.death:${deceasedId}:${core.date}`);
      expect(row.role).toBe("family");
      expect(row.traitTerms.length).toBeGreaterThan(p("zero"));
    }
  });

  it("the bereavement scale is what moves the bereaved off carrying on", () => {
    expect(
      share(bereaved(p("one")), "bereavement", "carry-on"),
    ).toBeGreaterThan(resilience.high);
  });

  it("a layoff's grudge is held by some, against the owner, at the rate laid-off workers act on one", () => {
    const core = laidOff();
    const grudge = share(core, "job-loss", "hold-grudge");
    expect(grudge).toBeGreaterThanOrEqual(termination.bandPercent.low);
    expect(grudge).toBeLessThanOrEqual(termination.bandPercent.high);
    const ceiling = firings.ofThoseFired.find(
      (row) => row.id === "no-reason-or-unfair-reason",
    )!.percent;
    expect(grudge).toBeLessThan(ceiling);
    const grudges = drivesReport(core).drives.filter(
      (row) => row.kind === "grudge",
    );
    expect(grudges.length).toBeGreaterThan(p("zero"));
    for (const drive of grudges) {
      expect(drive.targetId).toBe(ownerId);
      expect(drive.sourceEventId).toBe(
        `event:work.job-lost:${core.date}:job:${drive.personId}`,
      );
    }
  });

  it("low agreeableness leans toward the grudge and high toward carrying on, as the forgiveness meta-analysis has it", () => {
    expect(
      forgiveness.dispositional.find((row) => row.id === "agreeableness")!
        .weightedMeanR,
    ).toBeGreaterThan(p("zero"));
    const core = laidOff();
    const rows = drivesReport(core).decisions.filter(
      (row) => row.ruleId === "job-loss",
    );
    // The conflict trait is agreeableness compliance reversed.
    const conflict = (personId: string) =>
      core.people.get(personId)!.traits["people-mind-v1:conflict"] ?? p("zero");
    const sorted = [...rows].sort(
      (a, b) => conflict(a.personId) - conflict(b.personId),
    );
    const third = Math.floor(sorted.length / 3);
    const rate = (part: typeof rows, response: string) =>
      part.filter((row) => row.chosen.responseId === response).length /
      part.length;
    const agreeable = sorted.slice(p("zero"), third);
    const disagreeable = sorted.slice(sorted.length - third);
    expect(rate(disagreeable, "hold-grudge")).toBeGreaterThan(
      rate(agreeable, "hold-grudge"),
    );
    expect(rate(agreeable, "carry-on")).toBeGreaterThan(
      rate(disagreeable, "carry-on"),
    );
  });
});
