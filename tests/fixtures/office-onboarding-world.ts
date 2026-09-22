import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createCampaignElectionTransitionRegistry,
  createWorkRelationship,
  drawCanonicalNameForGender,
  makeIsoDate,
  recordFiledProvision,
  SeededRng,
  type EntityId,
  type World,
} from "../../src/simulation";
import { advanceWorld } from "../../src/simulation";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import {
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import { fileForOffice } from "./campaign-fixture";
import { openLegislativeWork } from "../../src/presentation/legislation-world";
import { resolvePlayerCapabilities } from "../../src/presentation/player-capabilities";
import { resolveActiveMemberSeat } from "../../src/presentation/legislative-member-seat";
import { enterSupportedTerm } from "./recorded-legislative-term";

export function newOnboardingLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

export function wonLegislativeSeat(seed: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const life = newOnboardingLife(
      attempt === 0 ? seed : `${seed}:retry-${attempt}`,
    );
    let world = fileForOffice(life.world, life.personId);
    world = spendAnAfternoon(world, life.personId, "fundraising");
    for (let index = 0; index < 3; index += 1) {
      world = advanceWorld(
        world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
      world = spendAnAfternoon(world, life.personId, "outreach");
    }
    for (
      let day = 0;
      day < 60 && projectCampaign(world, life.personId).phase === "active";
      day += 1
    ) {
      world = advanceWorld(
        world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
    }
    // A win records a dated term; the seat is active only once that term begins.
    if (projectCampaign(world, life.personId).phase === "won")
      world = enterSupportedTerm(world, life.personId);
    const membership = resolveActiveMemberSeat(world, life.personId);
    if (membership.kind === "seated") {
      return { world, personId: life.personId, seat: membership.seat };
    }
  }
  throw new Error(`No seed produced a seated member from ${seed}.`);
}

export function openOfficeBill(world: World, personId: EntityId) {
  const capabilities = resolvePlayerCapabilities(world);
  if (
    !capabilities.legislativeScenarioKey ||
    !capabilities.legislativeJurisdictionId
  ) {
    throw new Error("This life has no legislative office bill route.");
  }
  const opened = openLegislativeWork(world, {
    playerPersonId: personId,
    scenarioKey: capabilities.legislativeScenarioKey,
    jurisdictionId: capabilities.legislativeJurisdictionId,
  });
  const measure = opened.world.history.legislativeMeasures?.find(
    (record) => record.id === opened.assignment.measureId,
  );
  if (!measure) throw new Error("Opened bill is missing from the World.");
  const provisionKey = `office-onboarding:${measure.stableKey}:purpose`;
  const already = (opened.world.history.legislativeProvisions ?? []).some(
    (record) => record.stableKey === provisionKey,
  );
  const withText = already
    ? opened.world
    : recordFiledProvision(opened.world, {
        stableKey: provisionKey,
        measureId: measure.id,
        provisionKey: "office-onboarding-purpose",
        sectionNumber: 1,
        heading: "Purpose",
        text: "This Act states the office's working purpose as filed.",
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "everyone the Act reaches",
        },
        applicationScope: {
          jurisdictionId: measure.jurisdictionId,
          segmentKey: null,
        },
      });
  return {
    world: withText,
    assignment: opened.assignment,
  };
}

export function hireOfficeStaff(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
) {
  const membership = resolveActiveMemberSeat(world, personId);
  if (membership.kind !== "seated") throw new Error(membership.reason);
  const stableKey = `office-onboarding:staff:${organizationId}`;
  const rng = new SeededRng(world.seed).fork(stableKey);
  const name = drawCanonicalNameForGender(rng, "unstated");
  let next = applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "quick-generated",
    personId,
    transitions: [
      {
        kind: "context-person",
        input: {
          stableKey,
          givenName: name.givenName,
          familyName: name.familyName,
          birthDate: makeIsoDate(
            `${Number(world.currentDate.slice(0, 4)) - 41}${world.currentDate.slice(4)}`,
          ),
          homeJurisdictionId: membership.seat.governingJurisdictionId,
        },
      },
    ],
  }).world;
  const staffPersonId = characterHistoryContextPersonId(next, stableKey);
  next = createWorkRelationship(next, {
    stableKey: `${stableKey}:job`,
    personId: staffPersonId,
    organizationId,
    startedAt: next.currentDate,
    kind: "employment:legislative-staff",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "L office-onboarding staff hire." },
    initialRole: {
      title: "Legislative aide",
      occupationClassification: null,
      locationJurisdictionId: membership.seat.governingJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: membership.seat.governingJurisdictionId,
      },
    },
  });
  return { world: next, staffPersonId };
}

/** Ordinary seated member with a bill on the office route, plus one real aide. */
export function preparedOfficeOnboardingWorld(seed = "l-onboard-fixture") {
  const member = wonLegislativeSeat(seed);
  const opened = openOfficeBill(member.world, member.personId);
  const hired = hireOfficeStaff(
    opened.world,
    member.personId,
    member.seat.organizationId,
  );
  return {
    world: hired.world,
    personId: member.personId,
    seat: member.seat,
    measureId: opened.assignment.measureId,
    staffPersonId: hired.staffPersonId,
  };
}
