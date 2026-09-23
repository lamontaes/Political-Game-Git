/**
 * The few very rich people who live in the player's state.
 *
 * A current game gives each of them three records through the ordinary
 * writers, and nothing else:
 *
 * 1. Money of their own. It simply exists as part of their record, opened on
 *    the day they are seated; nobody opens an account in play.
 * 2. A company they own, as a work relationship of kind
 *    `independent:business-owner` with the company as an organization.
 * 3. What that company's line of business wants from government, recorded as
 *    ordinary interests (`recordMogulInterest`). The offer loop in `moguls.ts`
 *    then decides, week by week and for each of them, whether to approach a
 *    candidate.
 *
 * Who is rich in general belongs to the wealth model in Ordinary adult life;
 * when it lands, `veryRichPeopleIn` can be answered from it. This file seats
 * only the top tier, only in the player's current state, and only once per
 * state. Every number and every business-to-policy pairing below is a marked
 * placeholder filed as `very-rich-people-and-their-stakes`.
 */
import { createCharacterHistoryContextPeople } from "./character-history";
import { addDays, makeIsoDate } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { recordMogulInterest, type MogulWantedStance } from "./moguls";
import { drawCanonicalNamedIdentity } from "./people";
import { generatePersonIdentity } from "./person-identity";
import { stateOfJurisdiction } from "./press/outlets";
import { createResourcePosition, makeCurrencyCode, money } from "./resources";
import { pickDistinct, SeededRng } from "./rng";
import { createStableId } from "./ids";
import type { EntityId, IsoDate, World } from "./types";
import { worldOpeningVersionOf } from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";

/** Must match Ordinary adult life's `BUSINESS_OWNER_WORK_KIND`. */
export const BUSINESS_OWNER_WORK_KIND = "independent:business-owner" as const;

const WRITER_KEY = "very-rich-v1";

/**
 * UNRESEARCHED. How many very rich people a state has, how rich, and how old.
 * Filed as `very-rich-people-and-their-stakes`. A researched table replaces
 * this one under a new version, never as a silent edit.
 */
export const UNRESEARCHED_VERY_RICH = {
  version: "very-rich-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  researchQuestionId: "very-rich-people-and-their-stakes",
  /** Seated in each state the player lives in, whatever its size. */
  perState: 3,
  /** Each fortune is drawn between these, in whole dollars. */
  minimumFortuneDollars: 1_000_000_000,
  maximumFortuneDollars: 20_000_000_000,
  youngestAge: 45,
  oldestAge: 85,
  /** Age at which they started the company they own. */
  foundedAtAge: 30,
} as const;

interface LineOfBusiness {
  readonly key: string;
  readonly classification: `enterprise:${string}`;
  readonly companySuffix: string;
  readonly title: string;
  readonly stakes: readonly {
    readonly proposition: string;
    readonly wants: MogulWantedStance;
    readonly because: string;
  }[];
}

/**
 * UNRESEARCHED. The lines of business a fortune is drawn from and what each
 * wants from state government, keyed to the policy catalog. Same research
 * question as `UNRESEARCHED_VERY_RICH`.
 */
export const UNRESEARCHED_LINES_OF_BUSINESS: readonly LineOfBusiness[] = [
  {
    key: "finance",
    classification: "enterprise:finance",
    companySuffix: "Capital",
    title: "Owner and chair",
    stakes: [
      {
        proposition: "business-commerce.cap-consumer-loan-rates",
        wants: "oppose",
        because: "Their lending business would earn less under a rate cap.",
      },
      {
        proposition: "fiscal.graduated-income-tax",
        wants: "oppose",
        because: "They would pay the top rate.",
      },
    ],
  },
  {
    key: "energy",
    classification: "enterprise:energy",
    companySuffix: "Energy",
    title: "Owner and chief executive",
    stakes: [
      {
        proposition: "environment-energy.price-carbon",
        wants: "oppose",
        because: "Their company sells fuel that a carbon price would tax.",
      },
      {
        proposition: "environment-energy.clean-electricity-standard",
        wants: "oppose",
        because: "Their power plants burn fuel the standard would phase out.",
      },
    ],
  },
  {
    key: "technology",
    classification: "enterprise:technology",
    companySuffix: "Technologies",
    title: "Founder and chief executive",
    stakes: [
      {
        proposition: "technology-privacy.consumer-data-privacy-law",
        wants: "oppose",
        because: "Their company earns from the data the law would restrict.",
      },
      {
        proposition: "technology-privacy.age-verification-for-social-media",
        wants: "oppose",
        because: "Checking every user's age would cost their platform users.",
      },
    ],
  },
  {
    key: "real-estate",
    classification: "enterprise:real-estate",
    companySuffix: "Properties",
    title: "Owner and developer",
    stakes: [
      {
        proposition: "housing-land-use.rent-stabilization",
        wants: "oppose",
        because: "Their buildings would earn less under a rent limit.",
      },
      {
        proposition: "housing-land-use.by-right-permitting",
        wants: "support",
        because: "Their projects would be approved faster.",
      },
    ],
  },
  {
    key: "retail",
    classification: "enterprise:retail",
    companySuffix: "Stores",
    title: "Owner and chair",
    stakes: [
      {
        proposition: "labor-workforce.raise-minimum-wage",
        wants: "oppose",
        because: "Their stores employ thousands at the lowest wage.",
      },
      {
        proposition: "labor-workforce.paid-family-leave",
        wants: "oppose",
        because: "Their company would pay for the leave.",
      },
    ],
  },
];

function stateKey(stateId: EntityId): string {
  return `${WRITER_KEY}:${stateId}`;
}

function personKey(stateId: EntityId, index: number): string {
  return `${stateKey(stateId)}:person:${index}`;
}

function personIdFor(world: World, stateId: EntityId, index: number): EntityId {
  return createStableId(
    "person",
    `${world.id}:life-context-v1:${personKey(stateId, index)}`,
  );
}

/**
 * The very rich people seated in a state, living or not, in seating order.
 * Empty until the state has been seated.
 */
export function veryRichPeopleIn(
  world: World,
  stateJurisdictionId: EntityId,
): readonly EntityId[] {
  const people: EntityId[] = [];
  for (let index = 0; index < UNRESEARCHED_VERY_RICH.perState; index += 1) {
    const id = personIdFor(world, stateJurisdictionId, index);
    if (world.people[id]) people.push(id);
  }
  return people;
}

function yearsBefore(date: IsoDate, years: number, rng: SeededRng): IsoDate {
  const year = Number(date.slice(0, 4)) - years;
  const month = String(rng.integer(1, 13)).padStart(2, "0");
  const day = String(rng.integer(1, 29)).padStart(2, "0");
  return makeIsoDate(`${year}-${month}-${day}`);
}

/**
 * Seats the top tier in one state, once. Idempotent: a state that already has
 * its very rich people is returned unchanged.
 */
export function seatVeryRichPeople(
  world: World,
  stateJurisdictionId: EntityId,
): World {
  const state = world.jurisdictions[stateJurisdictionId];
  if (!state || !state.kind.startsWith("state")) return world;
  if (veryRichPeopleIn(world, stateJurisdictionId).length > 0) return world;
  const rules = UNRESEARCHED_VERY_RICH;
  const rng = new SeededRng(world.seed).fork(stateKey(stateJurisdictionId));
  const lines = pickDistinct(
    rng.fork("lines"),
    UNRESEARCHED_LINES_OF_BUSINESS,
    rules.perState,
  );
  const provenance = { kind: "generated" as const, generatorKey: WRITER_KEY };
  const today = world.currentDate;

  const plans = lines.map((line, index) => {
    const personRng = rng.fork(`person:${index}`);
    const age = personRng.integer(rules.youngestAge, rules.oldestAge + 1);
    return {
      index,
      line,
      personRng,
      age,
      fortuneDollars: personRng.integer(
        rules.minimumFortuneDollars / 1_000_000,
        rules.maximumFortuneDollars / 1_000_000 + 1,
      ),
    };
  });

  let next = createCharacterHistoryContextPeople(
    world,
    plans.map((plan) => ({
      stableKey: personKey(stateJurisdictionId, plan.index),
      ...drawCanonicalNamedIdentity(
        plan.personRng.fork("name"),
        generatePersonIdentity(plan.personRng.fork("identity")),
      ),
      birthDate: yearsBefore(today, plan.age, plan.personRng.fork("birth")),
      homeJurisdictionId: stateJurisdictionId,
    })),
  );

  const currency = makeCurrencyCode("USD");
  for (const plan of plans) {
    const personId = personIdFor(next, stateJurisdictionId, plan.index);
    const person = next.people[personId];
    if (!person) continue;
    const key = personKey(stateJurisdictionId, plan.index);
    const founded = addDays(
      person.birthDate,
      Math.round(rules.foundedAtAge * 365.25),
    );
    const companyKey = `${key}:company`;
    next = createOrganization(next, {
      stableKey: companyKey,
      formedAt: founded,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: `${person.familyName} ${plan.line.companySuffix}`,
        classification: plan.line.classification,
        locationJurisdictionId: stateJurisdictionId,
      },
    });
    const companyId = next.history.organizations.find(
      (organization) => organization.stableKey === companyKey,
    )!.id;
    next = createWorkRelationship(next, {
      stableKey: `${key}:ownership`,
      personId,
      organizationId: companyId,
      startedAt: founded,
      kind: BUSINESS_OWNER_WORK_KIND,
      compensation: "paid",
      authority: "directs-others",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance,
      initialRole: {
        title: plan.line.title,
        occupationClassification: null,
        locationJurisdictionId: stateJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 60 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: stateJurisdictionId,
        },
      },
    });
    next = createResourcePosition(next, {
      stableKey: `${key}:money`,
      owner: { kind: "person", personId },
      openedAt: today,
      openingBalance: money(plan.fortuneDollars * 1_000_000 * 100, currency),
      provenance,
    });
    for (const stake of plan.line.stakes) {
      const proposition = Object.values(next.policyCatalog.propositions).find(
        (row) => row.stableKey.endsWith(stake.proposition),
      );
      if (!proposition) continue;
      next = recordMogulInterest(next, {
        personId,
        propositionId: proposition.id,
        wants: stake.wants,
        because: stake.because,
      });
    }
  }
  return next;
}

/**
 * The player's current state has its very rich people. Current openings only:
 * a legacy save keeps exactly the world it always built. Runs in the weekly
 * sweep, so a save from before this existed, or a player who has moved, is
 * seated on the next pass.
 */
export function ensureVeryRichInPlayerState(world: World): World {
  if (world.control.kind !== "person") return world;
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  const player = world.people[world.control.personId];
  if (!player) return world;
  const state = stateOfJurisdiction(world, player.homeJurisdictionId);
  return state ? seatVeryRichPeople(world, state) : world;
}
