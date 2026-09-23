/**
 * The pressure layer: the contract.
 *
 * The owner's rule (2026-09-22): large social change is never scripted. A
 * flight from a state, unrest in a city, a civil war and, very rarely, a
 * revolution come from pressure that builds in a place over time from causes
 * the world can read, fades when nothing feeds it, and sets things off when
 * it runs high. The plan is in Drive as "Big events should come from pressure
 * that builds, not from a script" (source copy
 * /mnt/project-files/research/PRESSURE-LAYER-PLAN-2026-09-22.md).
 *
 * What is built here is the first layer: a quarterly reading for each state
 * that carries pressure, for each kind, with every contribution recorded
 * beside the cause that made it; and the yearly flow of people between states
 * that the pressure to leave and the pull to arrive decide.
 *
 * Every number marked BLANKET is a placeholder chosen so the mechanism is
 * visible, never a researched value. Filed with ChatGPT as
 * `state-to-state-moves-what-pushes-and-pulls`,
 * `unrest-what-builds-it-and-what-calms-it` and
 * `civil-war-and-revolution-preconditions`.
 */

import type { EntityId, IsoDate } from "../types";

export const PRESSURE_CONTRACT_VERSION = "pressure-layer/v1" as const;

/** A public yearly event naming the largest movement between states. */
export const STATE_FLOWS_EVENT = "migration.state-flows";

/**
 * Kinds of pressure. `leave` and `arrive` drive movement between states; the
 * rest are recorded so later layers (unrest, a generation's memory) read
 * them, and nothing feeds them yet.
 */
export type PressureKind = "leave" | "arrive" | "anger" | "fear" | "hope";
export const PRESSURE_KINDS: readonly PressureKind[] = [
  "leave",
  "arrive",
  "anger",
  "fear",
  "hope",
];

/** One cause's push on one kind of pressure in one state in one quarter. */
export interface PressureContribution {
  readonly causeKey: string;
  readonly kind: PressureKind;
  readonly amount: number;
  /** The record that is the cause: an episode, a tax policy. */
  readonly sourceId: EntityId;
}

/** One state's pressures at the end of one quarter. */
export interface PressureReading {
  readonly key: string;
  readonly ordinal: number;
  readonly stateKey: string;
  readonly jurisdictionId: EntityId;
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly levels: Readonly<Record<PressureKind, number>>;
  readonly contributions: readonly PressureContribution[];
}

/** Where a state's movers went in one year, and how many of its people moved. */
export interface StateFlowRecord {
  readonly key: string;
  /**
   * The calendar year the flow year closed in. Four 91-day quarters drift
   * against the calendar, so two flow years can close in one calendar year;
   * `flowYear` is the identity.
   */
  readonly year: number;
  /** Which year of stepping this is: 1 for the first four quarters. */
  readonly flowYear: number;
  readonly fromStateKey: string;
  /** Share of the state's people leaving for another state that year. */
  readonly outflowSharePct: number;
  /** The largest destinations, each with its share of this state's movers. */
  readonly destinations: readonly {
    readonly stateKey: string;
    readonly sharePct: number;
  }[];
}

/**
 * Optional on the world: a save written before this layer has none.
 *
 * Only readings that carry something are kept: a state with every level at
 * zero and no contribution in a quarter has no reading for it, and reads as
 * zero. Flows are kept only for a year in which some state carried pressure,
 * because with none every state sends the same share and there is nothing to
 * record. A long save grows with what happened, not with the calendar.
 */
export interface PressureStore {
  readonly contractVersion: typeof PRESSURE_CONTRACT_VERSION;
  /** Quarters stepped so far, recorded or not. */
  readonly quartersStepped: number;
  readonly lastPeriodEnd: IsoDate | null;
  readonly readings: readonly PressureReading[];
  readonly flows: readonly StateFlowRecord[];
}

export type PressureSeamStatus = "built" | "not-built";

export interface PressureSeam {
  readonly key: string;
  readonly connects: string;
  readonly status: PressureSeamStatus;
  readonly rule: string;
  readonly where: string;
}

/**
 * Every cause and effect, built or not, with the rule the code follows
 * meanwhile. A future lane reads this to find where to plug in.
 */
export const PRESSURE_SEAMS: readonly PressureSeam[] = [
  {
    key: "cause-disasters",
    connects: "A declared flood or severe storm in a state.",
    status: "built",
    rule: "BLANKET: each hazard episode declared in the quarter adds pressure to leave that state, scaled by its magnitude, and fear.",
    where: "src/simulation/pressure/causes.ts",
  },
  {
    key: "cause-enacted-taxes",
    connects: "A state tax the game itself enacts or changes.",
    status: "built",
    rule: "BLANKET: a new or higher state tax taking effect in the quarter adds pressure to leave, scaled by the rate change; a lower one adds pull to arrive.",
    where: "src/simulation/pressure/causes.ts",
  },
  {
    key: "cause-local-crime",
    connects: "Crime reported to police in a town in the state.",
    status: "built",
    rule: "BLANKET: each reported offense in the quarter beyond the town's ordinary police log adds fear to its state, double for assault and robbery. Pressure to leave a town over crime is the town push in migration, not here. Unreported offenses add nothing.",
    where: "src/simulation/pressure/causes.ts",
  },
  {
    key: "cause-starting-taxes",
    connects:
      "Each state's real tax level at the start (Texas has no income tax, California's is high).",
    status: "not-built",
    rule: "No state starts with any tax pressure. The world holds no starting tax level for any state; research is filed.",
    where: "src/simulation/pressure/causes.ts",
  },
  {
    key: "cause-state-economy",
    connects: "Jobs in one state compared with the nation.",
    status: "built",
    rule: "BLANKET: when the economy records a state's own month, each percentage point its unemployment sits above the nation's adds 0.02 to the pressure to leave, and each point below adds 0.02 to the pull to arrive. The economy records a place separately only after a disaster or public spending there, so most states read as the nation. On the town side, each point of the player's town's unemployment above the nation's adds 5 percent to the chance a free household leaves. Wages are not recorded.",
    where:
      "src/simulation/pressure/causes.ts BLANKET_UNEMPLOYMENT_GAP_PRESSURE",
  },
  {
    key: "cause-job-loss",
    connects: "Somebody who lost a job and has not found another.",
    status: "built",
    rule: "BLANKET: in the year after a job ends with no other job, a person is three times as likely to leave town, reason work:job-lost.",
    where: "src/simulation/migration/review.ts BLANKET_JOB_LOSS_MULTIPLIER",
  },
  {
    key: "cause-crime",
    connects: "Crime in the player's town driving people away.",
    status: "built",
    rule: "BLANKET: each reported assault or robbery in town beyond the police log's usual quarter adds 5 percent to the chance a free household leaves. Every town has the same usual log, so only an unusually bad quarter pushes. Crime is not compared between states.",
    where:
      "src/simulation/migration/review.ts BLANKET_TOWN_CRIME_PUSH_PER_EXCESS_REPORT",
  },
  {
    key: "cause-family",
    connects: "Moving to be near family.",
    status: "built",
    rule: "BLANKET: a leaving person weighs a state where a living relative lives three times as heavily; if they go there, the reason is family:near-kin. Following a partner, caring for a parent and a new family forming are not read.",
    where: "src/simulation/migration/review.ts BLANKET_FAMILY_PULL",
  },
  {
    key: "cause-schools",
    connects: "Families moving for better schools.",
    status: "not-built",
    rule: "Not read. The world records schools and enrollments but nothing about how good a school is.",
    where: "src/simulation/school-names.ts",
  },
  {
    key: "cause-housing-supply",
    connects:
      "Housing shortages and prices pushing people out, cheap housing drawing them in.",
    status: "not-built",
    rule: "Not read. The economy's housing balance is national only; a local one is never compiled.",
    where: "src/simulation/macro-economy/types.ts MacroHousingCondition",
  },
  {
    key: "cause-politics-fit",
    connects: "People moving toward places whose politics match theirs.",
    status: "not-built",
    rule: "Not read. Research is filed on whether this is real and how strong it is.",
    where: "src/simulation/pressure/causes.ts",
  },
  {
    key: "cause-life-stage",
    connects: "Retirement, college, a first job and old age moving people.",
    status: "not-built",
    rule: "Not read. Every adult in town has the same chance of leaving at any age.",
    where: "src/simulation/migration/review.ts",
  },
  {
    key: "cause-military",
    connects: "Military service moving people and their families.",
    status: "not-built",
    rule: "Not read by the migration review. A service member's reassignment has its own life route.",
    where: "src/simulation/character-history.ts composePcsRelocationPlan",
  },
  {
    key: "cause-cost-of-living",
    connects: "Housing and living costs in one state compared with another.",
    status: "not-built",
    rule: "Not read. The price and rent tables exist only as files the browser fetches, not in the simulation.",
    where: "public/data/economic-context/v1",
  },
  {
    key: "cause-climate",
    connects: "Heat, sea level and a warming trend pushing people inland.",
    status: "not-built",
    rule: "Not read. The world has no climate trend and no coastline; only disaster rates by state and month.",
    where: "src/simulation/crisis/hazard-producer.ts",
  },
  {
    key: "cause-opinion-of-laws",
    connects: "A law people love or hate pulling or pushing them.",
    status: "not-built",
    rule: "Not read. Enacted laws are recorded, but nothing records how people feel about one.",
    where: "src/simulation/legislation.ts",
  },
  {
    key: "cause-failed-disaster-handling",
    connects: "A governor or President failing a disaster the state suffered.",
    status: "built",
    rule: "BLANKET: each disaster decision judged a failure adds anger in the struck state, scaled by the disaster's magnitude.",
    where: "src/simulation/pressure/anger.ts",
  },
  {
    key: "cause-unemployment-rise",
    connects: "People losing work.",
    status: "built",
    rule: "BLANKET: a rise in the published national unemployment rate over the quarter adds anger in every state alike, because unemployment is recorded nationally.",
    where: "src/simulation/pressure/anger.ts",
  },
  {
    key: "cause-displacement",
    connects: "People driven from their homes.",
    status: "not-built",
    rule: "Not read by anger or fear. Displacement is being built by the migration lane.",
    where: "src/simulation/migration/",
  },
  {
    key: "cause-polarization",
    connects: "People pulling apart politically.",
    status: "not-built",
    rule: "Not read. Nothing in the world measures how divided a place is.",
    where: "src/simulation/pressure/anger.ts",
  },
  {
    key: "fade",
    connects: "Pressure passing when nothing keeps feeding it.",
    status: "built",
    rule: "BLANKET: every pressure loses 25 percent of its level every quarter.",
    where: "src/simulation/pressure/step.ts BLANKET_FADE_PER_QUARTER",
  },
  {
    key: "state-flows",
    connects:
      "People moving each year between the states the world holds (50 in an Idaho opening; the District of Columbia and Puerto Rico are not state jurisdictions in it).",
    status: "built",
    rule: "BLANKET: a state loses a base share of its people a year, raised by its pressure to leave. Movers spread over the other states in proportion to each one's pull, which starts equal for all.",
    where: "src/simulation/pressure/flows.ts",
  },
  {
    key: "state-populations",
    connects: "Flows as numbers of people, and populations that change.",
    status: "not-built",
    rule: "Flows are recorded as shares of a state's people, never as head counts, because the simulation holds no state population.",
    where: "src/simulation/pressure/flows.ts",
  },
  {
    key: "town-movers",
    connects:
      "Where a household leaving the player's town goes, and where a newcomer came from.",
    status: "built",
    rule: "The migration review draws a destination and an origin state weighted by the latest readings instead of evenly, and multiplies the chance a free household in town leaves by its own state's push.",
    where: "src/simulation/migration/review.ts",
  },
  {
    key: "settlement-view",
    connects: "A screen that shows where people are moving from and to.",
    status: "not-built",
    rule: "The yearly flows are records and a public event the press can print; no screen shows them yet.",
    where: "src/player/",
  },
  {
    key: "unrest",
    connects: "Anger crossing a line in a state and unrest beginning there.",
    status: "built",
    rule: "BLANKET: anger over its line in a state gives a chance of a public unrest event each quarter, rising with how far over the line it is. Unrest is recorded per state, not per city, because pressure is read per state.",
    where: "src/simulation/pressure/events.ts",
  },
  {
    key: "unrest-spreads",
    connects: "Unrest in one place carrying anger into nearby places.",
    status: "not-built",
    rule: "Unrest adds nothing to any other state. The world holds no record of which states border which.",
    where: "src/simulation/pressure/events.ts",
  },
  {
    key: "political-threats",
    connects:
      "Lasting unrest turning into a threat against a prominent political person there.",
    status: "built",
    rule: "BLANKET: unrest this quarter and in an earlier recent quarter gives a chance of a threat against the state's governor, a member of Congress from it, or a party chapter organizer living there, drawn evenly. The player can be one of them.",
    where: "src/simulation/pressure/events.ts",
  },
  {
    key: "violent-death-of-prominent-people",
    connects:
      "The killing of a prominent political person, office or not, and the reaction.",
    status: "built",
    rule: "BLANKET: an open threat, while anger there stays over its line, gives a chance of an attempt through the existing attempt writer, which can injure or kill and leaves a vacancy by the ordinary rules. The attempt feeds anger and fear back into the target's state.",
    where: "src/simulation/pressure/events.ts",
  },
  {
    key: "international-crises",
    connects:
      "An international development that stays open while strain builds at home becoming a crisis the President must handle.",
    status: "built",
    rule: "BLANKET: an open development's reports, the rise in national unemployment since it was reported and the average anger across states make its friction. Over its line, each quarter gives a chance of one crisis over that development, never a second.",
    where: "src/simulation/pressure/events.ts",
  },
  {
    key: "calming-presence",
    connects: "A respected figure lowering anger in one city.",
    status: "not-built",
    rule: "Nothing lowers a pressure except the quarterly fade.",
    where: "src/simulation/pressure/",
  },
  {
    key: "generational-memory",
    connects:
      "People who lived through high pressure young carrying it into their politics.",
    status: "not-built",
    rule: "Readings are kept per state; nobody's record reads them. The belief pass that would is written and not scheduled in play.",
    where: "src/simulation/living-world/political-reflection.ts",
  },
  {
    key: "civil-war-and-revolution",
    connects:
      "Several pressures held very high across many places for years ending in civil war or revolution.",
    status: "not-built",
    rule: "Never happens. The owner approved revolutions only as an emergent result of that combination (2026-09-22), never a fixed chance.",
    where: "src/simulation/pressure/",
  },
];
