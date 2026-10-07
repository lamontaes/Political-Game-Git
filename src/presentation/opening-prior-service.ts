import {
  STATES,
  nonvotingHouseMemberTitle,
} from "../simulation/state-reference";
import { homeStateUsps, stateExecutiveOffice } from "../simulation";
import { makeIsoDate, recordWorldEvent, SeededRng } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";

/**
 * OW-10: the office an opening officeholder held before the one they hold
 * now. Each option is a real road to that office in the record (presidents
 * and vice presidents since 1953 came from the Senate, a governorship or the
 * House; chief justices from a federal appeals court or the Supreme Court
 * itself), and each is written for the officeholder's own home state, so a
 * senator only exists where the place sends senators. A seeded pick chooses
 * among the real options only.
 */
export const PRIOR_SERVICE_EVENT = "world.prior-office-service" as const;

interface PriorOffice {
  readonly title: string;
  readonly termYears: number;
  readonly terms: readonly number[];
}

function homeOptions(usps: string | null): readonly PriorOffice[] {
  const state = usps ? STATES[usps] : undefined;
  if (!usps || !state) return [];
  const executive = stateExecutiveOffice(usps)?.displayName ?? null;
  const executiveTitle = executive
    ? executive.includes(state.name)
      ? executive
      : `${executive} of ${state.name}`
    : null;
  const options: PriorOffice[] = [];
  if (state.jurisdictionKind === "state") {
    options.push(
      {
        title: `United States Senator from ${state.name}`,
        termYears: 6,
        terms: [1, 2],
      },
      {
        title: `United States Representative from ${state.name}`,
        termYears: 2,
        terms: [2, 3, 4, 5],
      },
    );
  } else {
    const nonvoting = nonvotingHouseMemberTitle(usps);
    if (nonvoting)
      options.push({
        title: `${nonvoting} from ${state.name} in the United States House`,
        termYears: 2,
        terms: [2, 3, 4],
      });
  }
  if (executiveTitle)
    options.push({ title: executiveTitle, termYears: 4, terms: [1, 2] });
  return options;
}

const JUDICIAL_OPTIONS: readonly PriorOffice[] = [
  {
    title: "Judge of the United States Court of Appeals",
    termYears: 1,
    terms: [2, 5, 8, 12],
  },
  {
    title: "Associate Justice of the Supreme Court of the United States",
    termYears: 1,
    terms: [5, 10, 15],
  },
];

/** Records the prior service, ending the day the current office began. */
export function recordPriorOfficeService(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly officeKey: string;
    readonly startedAt: IsoDate;
    readonly tag: string;
  },
): World {
  const options =
    input.officeKey === "us-chief-justice"
      ? JUDICIAL_OPTIONS
      : homeOptions(homeStateUsps(world, input.personId));
  if (options.length === 0) return world;
  const rng = new SeededRng(world.seed).fork(input.stableKey);
  const office = rng.pick(options);
  const years = office.termYears * rng.pick(office.terms);
  const startYear = Number(input.startedAt.slice(0, 4)) - years;
  const began = makeIsoDate(`${startYear}${input.startedAt.slice(4)}`);
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: PRIOR_SERVICE_EVENT,
    occurredAt: began,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.personId],
    participants: [
      { personId: input.personId, role: "focus:subject", detail: office.title },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      input.tag,
      "provenance:fictional-prior-service",
      `ended-at:${input.startedAt}`,
    ],
    summary: `${office.title}, ${startYear} to ${input.startedAt.slice(0, 4)}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
