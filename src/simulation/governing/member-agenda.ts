import { makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { measurePosition } from "../legislation";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import { permittedOriginChambers } from "../legislature-rules";
import { nextMeasureDesignation } from "../measure-numbering";
import { municipalGovernmentsWithProcedure } from "../municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "../municipal-public-work";
import {
  placeMunicipalOrdinanceOnAgenda,
  scheduleOrdinaryCouncilReading,
} from "../municipal-ordinance-procedure";
import {
  localFiscalAuthorityFor,
  type LocalFiscalAuthorityGranted,
} from "../local-fiscal-authority";
import { LOCAL_FIX_IT_FIRST_PROPOSITION_KEY } from "../legislation-local-fiscal-families";
import { localFiscalPredicateAuthority } from "../local-fiscal-predicate-authority";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { seatedChamberForPack } from "./chamber-votes";
import { lawInForce } from "./law-in-force";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./officeholder-principles";
import {
  AUTOMATIC_LAW_POSITION_MAPPINGS,
  automaticLawMappingFor,
  compileAutomaticLawDraft,
  introduceAutomaticLawMeasure,
  type AutomaticLawCompileContext,
} from "./automatic-legislation";
import {
  LEGISLATIVE_INTAKE_VERSION,
  measureSessionIsClosed,
  scheduleInstitutionStep,
} from "./legislative-clock";

/**
 * MEMBER AGENDA — a sitting member files supported legislation on questions
 * their own saved principles press hardest. Only explicitly mapped proposals
 * with an operative consumer are eligible for automatic filing.
 */

export const MEMBER_AGENDA_VERSION = "member-agenda/v2";
export const LOCAL_MEMBER_AGENDA_VERSION = "local-member-agenda/v1";
export const LOCAL_MEMBER_AGENDA_INTAKE =
  "government:local-member-agenda-intake" as const;

/** A game scheduling default, not a claim about a place's legislative law. */
const LOCAL_AGENDA_DEFAULT_QUARTERS = 1;

/** PLACEHOLDER: the least summed weight that moves a member to file a bill. */
const FILING_THRESHOLD = 3;

/** Catalog questions with an exact, supported state-law configuration. */
function stateQuestions(world: World): readonly EntityId[] {
  const catalog = world.policyCatalog;
  const supportedKeys = new Set(
    AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
      (mapping) => mapping.governmentLevel === "state",
    ).map((mapping) => mapping.propositionKey),
  );
  return catalog.propositionOrder.filter((propositionId) => {
    const proposition = catalog.propositions[propositionId];
    if (!proposition || !supportedKeys.has(proposition.stableKey)) return false;
    const issue = catalog.issues[proposition.issueId];
    return issue?.levels?.includes("state") ?? false;
  });
}

/** A bill still moving in this jurisdiction that answers the question. */
function pendingBillOn(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
): boolean {
  return (world.history.legislativeMeasures ?? []).some(
    (measure) =>
      measure.jurisdictionId === jurisdictionId &&
      (measure.propositionAnswers ?? []).some(
        (row) => row.propositionId === propositionId,
      ) &&
      !measurePosition(world, measure.id).terminal &&
      !measureSessionIsClosed(world, measure.id).closed,
  );
}

function agendaBatchKey(intakeKey: string): string {
  return (
    LEGISLATIVE_INTAKE_VERSION +
    ":" +
    intakeKey +
    ":agenda"
  );
}

function alreadyFiledForIntake(world: World, batchKey: string): boolean {
  const prefix = batchKey + ":";
  return (world.history.legislativeMeasures ?? []).some(
    (measure) =>
      measure.stableKey === batchKey || measure.stableKey.startsWith(prefix),
  );
}

/**
 * At one real legislative intake, each eligible seated sponsor may file one
 * distinct supported proposal. The number of bills follows saved member
 * positions and open supported opportunities; this does not promise a bill or
 * enactment in each jurisdiction or season.
 */
export function fileMemberAgendaBills(
  world: World,
  input: { readonly jurisdictionId: EntityId; readonly intakeKey: string },
): World {
  const batchKey = agendaBatchKey(input.intakeKey);
  if (alreadyFiledForIntake(world, batchKey)) return world;

  const questions = stateQuestions(world);
  if (questions.length === 0) return world;

  const pack = legislativePackForJurisdiction(input.jurisdictionId);
  if (!pack) return world;

  const seatedByChamber = pack.chambers.map((chamber) => ({
    chamber,
    seated: seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    ),
  }));
  const allMemberIds = seatedByChamber.flatMap(({ seated }) =>
    (seated?.body.members ?? [])
      .map((member) => member.personId)
      .filter((personId): personId is EntityId => personId !== null),
  );
  const sponsors = seatedByChamber.flatMap(({ chamber, seated }) => {
    if (!chamber.introductionAllowed) return [];
    return (seated?.body.members ?? []).flatMap((member) => {
      const personId = member.personId;
      if (
        personId === null ||
        (world.control.kind === "person" &&
          world.control.personId === personId)
      )
        return [];
      return [{ personId, chamber }];
    });
  }).sort((left, right) => left.personId.localeCompare(right.personId));
  if (sponsors.length === 0) return world;

  // Every seated member may vote on a bill, not only the members of its
  // originating chamber, so principles are initialized across the full body.
  let next = ensureOfficeholderPrinciples(world, allMemberIds);

  // Read once per question. The law and docket are unchanged until a sponsor
  // actually files, then the next sponsor sees that recorded measure.
  const lawAnswers = new Map<EntityId, "yes" | "no" | null>();
  const pending = new Map<EntityId, boolean>();
  const filedPropositions = new Set<EntityId>();
  const unavailablePropositions = new Set<EntityId>();

  // Stable sponsor order means an unchanged chamber and unchanged saved
  // principles do not randomly reverse the same mapped question next intake.
  for (const sponsor of sponsors) {
    const candidates: {
      propositionId: EntityId;
      answer: "yes" | "no";
      weight: number;
      score: number;
      principleRecordIds: readonly EntityId[];
    }[] = [];

    for (const propositionId of questions) {
      if (
        filedPropositions.has(propositionId) ||
        unavailablePropositions.has(propositionId)
      )
        continue;

      const proposition = next.policyCatalog.propositions[propositionId]!;
      const leaning = principledLeaning(
        next,
        sponsor.personId,
        propositionId,
      );
      if (Math.abs(leaning.score) < FILING_THRESHOLD) continue;

      const answer = leaning.score > 0 ? "yes" : "no";
      const mapping = automaticLawMappingFor(proposition.stableKey, answer);
      if (!mapping || mapping.governmentLevel !== "state") continue;

      if (!lawAnswers.has(propositionId)) {
        lawAnswers.set(
          propositionId,
          lawInForce(next, input.jurisdictionId, propositionId)?.answer ?? null,
        );
      }
      const lawAnswer = lawAnswers.get(propositionId);
      const alreadyInForce = lawAnswer === answer;
      if (alreadyInForce) continue;

      if (!pending.has(propositionId)) {
        pending.set(
          propositionId,
          pendingBillOn(next, input.jurisdictionId, propositionId),
        );
      }
      if (pending.get(propositionId)) continue;
      candidates.push({
        propositionId,
        answer,
        weight: Math.abs(leaning.score),
        score: leaning.score,
        principleRecordIds: leaning.recordIds,
      });
    }

    candidates.sort((left, right) => right.weight - left.weight);
    for (const candidate of candidates) {
      const proposition =
        next.policyCatalog.propositions[candidate.propositionId]!;
      const mapping = automaticLawMappingFor(
        proposition.stableKey,
        candidate.answer,
      );
      if (!mapping || mapping.governmentLevel !== "state") continue;

      // The first measure keeps the historical stable key. Additional bills
      // are scoped under the same intake key by proposition and sponsor.
      const measureStableKey =
        (next.history.legislativeMeasures ?? []).some(
          (measure) => measure.stableKey === batchKey,
        )
          ? batchKey +
            ":" +
            encodeURIComponent(proposition.stableKey) +
            ":" +
            sponsor.personId
          : batchKey;
      const designation = nextMeasureDesignation(next, {
        jurisdictionId: input.jurisdictionId,
        originChamber: sponsor.chamber,
      });
      const draft = compileAutomaticLawDraft({
        world: next,
        jurisdictionId: input.jurisdictionId,
        propositionId: candidate.propositionId,
        answer: candidate.answer,
        designation,
        intakeKey:
          batchKey +
          ":" +
          encodeURIComponent(proposition.stableKey),
      });
      if (!draft) {
        unavailablePropositions.add(candidate.propositionId);
        continue;
      }

      const permitted = permittedOriginChambers(pack, draft.subjectClass);
      if (
        !sponsor.chamber.introductionAllowed ||
        (permitted.kind === "known" &&
          !permitted.value.includes(sponsor.chamber.chamberKey))
      )
        continue;

      const introduced = introduceAutomaticLawMeasure(next, {
        jurisdictionId: input.jurisdictionId,
        stableKey: measureStableKey,
        propositionId: candidate.propositionId,
        answer: candidate.answer,
        intakeKey:
          batchKey +
          ":" +
          encodeURIComponent(proposition.stableKey),
        designation,
        sponsorPersonId: sponsor.personId,
        originChamberKey: sponsor.chamber.chamberKey,
        principleRecordIds: candidate.principleRecordIds,
        principleScore: candidate.score,
      });
      if (!introduced) {
        unavailablePropositions.add(candidate.propositionId);
        continue;
      }
      next = scheduleInstitutionStep(introduced.world, introduced.measureId);
      filedPropositions.add(candidate.propositionId);
      break;
    }
  }
  return next;
}

/** Compatibility entry point for existing state-season callers. */
export function fileMemberAgendaBill(
  world: World,
  input: { readonly jurisdictionId: EntityId; readonly intakeKey: string },
): World {
  return scheduleLocalMemberAgendaIntakes(
    fileMemberAgendaBills(world, input),
  );
}

function councilMembers(world: World, governmentKey: string) {
  return municipalSeats(world, governmentKey).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
}

function withLocalSponsorControl(world: World, personId: EntityId): World {
  return world.control.kind === "person" && world.control.personId === personId
    ? world
    : { ...world, control: { kind: "person", personId } };
}

function localContext(
  grant: LocalFiscalAuthorityGranted,
): AutomaticLawCompileContext {
  return {
    governmentLevel: grant.authority.level,
    jurisdictionId: grant.jurisdictionId,
    rulePackId: grant.authority.rulePackId,
    scenarioKey: `institution:${grant.authority.rulePackId}`,
    predicateAuthority: localFiscalPredicateAuthority(grant),
  };
}

function nextQuarterStart(after: IsoDate): IsoDate {
  const year = Number(after.slice(0, 4));
  const month = Number(after.slice(5, 7));
  const nextQuarterMonth = (Math.floor((month - 1) / 3) + 1) * 3 + 1;
  const nextYear = nextQuarterMonth > 12 ? year + 1 : year;
  const normalizedMonth = nextQuarterMonth > 12 ? 1 : nextQuarterMonth;
  return makeIsoDate(
    `${nextYear}-${String(normalizedMonth).padStart(2, "0")}-01`,
  );
}

function localIntakeStableKey(governmentKey: string, dueAt: IsoDate): string {
  return `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(governmentKey)}:${dueAt}`;
}

function localGovernmentKeyFromIntake(item: FutureDueItem): string | null {
  const prefix = `${LOCAL_MEMBER_AGENDA_VERSION}:intake:`;
  if (!item.stableKey.startsWith(prefix)) return null;
  const finalColon = item.stableKey.lastIndexOf(":");
  if (finalColon < prefix.length) return null;
  try {
    return decodeURIComponent(item.stableKey.slice(prefix.length, finalColon));
  } catch {
    return null;
  }
}

function localAuthorityForCouncil(
  world: World,
  governmentKey: string,
): LocalFiscalAuthorityGranted | null {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === LOCAL_FIX_IT_FIRST_PROPOSITION_KEY,
  );
  if (!proposition) return null;
  for (const member of councilMembers(world, governmentKey)) {
    const grant = localFiscalAuthorityFor(
      withLocalSponsorControl(world, member.personId),
      governmentKey,
      proposition.stableKey,
    );
    if (grant.ok) return grant;
  }
  return null;
}

/** Schedule each seated, admitted local council on a separate quarterly clock. */
export function scheduleLocalMemberAgendaIntakes(world: World): World {
  let next = world;
  for (const government of municipalGovernmentsWithProcedure()) {
    const grant = localAuthorityForCouncil(next, government.key);
    if (!grant) continue;
    const dueAt = nextQuarterStart(next.currentDate as IsoDate);
    const stableKey = localIntakeStableKey(government.key, dueAt);
    if (next.history.futureDueItems.some((item) => item.stableKey === stableKey))
      continue;
    next = scheduleFutureDueItem(next, {
      stableKey,
      dueAt,
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      entityIds: [grant.jurisdictionId],
      jurisdictionId: grant.jurisdictionId,
      provenance: {
        kind: "authored",
        note: `${LOCAL_MEMBER_AGENDA_VERSION}: quarterly game scheduling default for ${government.key}; it is not a statement of local legislative calendar law.`,
      },
    });
  }
  return next;
}

/** One exact mapped local fiscal proposal per admitted council and intake. */
export function fileLocalMemberAgendaBill(
  world: World,
  input: { readonly governmentKey: string; readonly intakeKey: string },
): World {
  const batchKey =
    `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(input.governmentKey)}:${input.intakeKey}`;
  if (alreadyFiledForIntake(world, batchKey)) return world;

  const members = councilMembers(world, input.governmentKey);
  if (members.length === 0) return world;
  const playerId = world.control.kind === "person" ? world.control.personId : null;
  const sponsors = members.filter((member) => member.personId !== playerId);
  if (sponsors.length === 0) return world;

  let next = ensureOfficeholderPrinciples(
    world,
    members.map((member) => member.personId),
  );
  const proposition = Object.values(next.policyCatalog.propositions).find(
    (entry) => entry.stableKey === LOCAL_FIX_IT_FIRST_PROPOSITION_KEY,
  );
  if (!proposition) return next;

  for (const sponsor of sponsors) {
    const leaning = principledLeaning(next, sponsor.personId, proposition.id);
    if (Math.abs(leaning.score) < FILING_THRESHOLD) continue;
    const answer = leaning.score > 0 ? "yes" : "no";
    const actorWorld = withLocalSponsorControl(next, sponsor.personId);
    const grantResult = localFiscalAuthorityFor(
      actorWorld,
      input.governmentKey,
      proposition.stableKey,
    );
    if (!grantResult.ok) continue;
    const grant = grantResult;
    const mapping = automaticLawMappingFor(
      proposition.stableKey,
      answer,
      grant.authority.level,
    );
    if (!mapping) continue;
    const context = localContext(grant);
    const currentAnswer =
      lawInForce(next, grant.jurisdictionId, proposition.id)?.answer ?? null;
    if (currentAnswer === answer) continue;
    if (pendingBillOn(next, grant.jurisdictionId, proposition.id)) continue;

    const pack = legislativePackForWorkKey(context.scenarioKey);
    const chamber = pack?.chambers.find(
      (entry) => entry.chamberKey === "council" && entry.introductionAllowed,
    );
    if (!pack || !chamber || pack.packId !== grant.authority.rulePackId)
      continue;
    const designation = nextMeasureDesignation(next, {
      jurisdictionId: grant.jurisdictionId,
      originChamber: chamber,
    });
    const stableKey = `${batchKey}:${sponsor.personId}`;
    const draft = compileAutomaticLawDraft({
      world: actorWorld,
      jurisdictionId: grant.jurisdictionId,
      propositionId: proposition.id,
      answer,
      designation,
      intakeKey: batchKey,
      context,
    });
    if (!draft) continue;
    const permitted = permittedOriginChambers(pack, draft.subjectClass);
    if (
      permitted.kind === "known" &&
      !permitted.value.includes(chamber.chamberKey)
    )
      continue;

    const introduced = introduceAutomaticLawMeasure(actorWorld, {
      jurisdictionId: grant.jurisdictionId,
      context,
      propositionId: proposition.id,
      answer,
      intakeKey: batchKey,
      stableKey,
      designation,
      sponsorPersonId: sponsor.personId,
      originChamberKey: chamber.chamberKey,
      principleRecordIds: leaning.recordIds,
      principleScore: leaning.score,
    });
    if (!introduced) continue;
    const placed = placeMunicipalOrdinanceOnAgenda(introduced.world, {
      governmentKey: input.governmentKey,
      measureId: introduced.measureId,
    });
    if (!placed.ok) continue;
    const scheduled = scheduleOrdinaryCouncilReading(
      placed.world,
      input.governmentKey,
      introduced.measureId,
    );
    next = { ...scheduled, control: world.control };
    break;
  }
  return next;
}

export function localMemberAgendaIntakeHandler(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  const governmentKey = localGovernmentKeyFromIntake(item);
  if (!governmentKey) {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "The local agenda record has no valid government key.",
      outcomeEventId: null,
    };
  }
  const government = municipalGovernmentsWithProcedure().find(
    (entry) => entry.key === governmentKey,
  );
  const currentJurisdictionId = government
    ? municipalGovernmentJurisdictionId(world, governmentKey)
    : null;
  if (!government || currentJurisdictionId !== item.jurisdictionId) {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "The local government is no longer available for this agenda.",
      outcomeEventId: null,
    };
  }
  let next = fileLocalMemberAgendaBill(world, {
    governmentKey,
    intakeKey: item.dueAt,
  });
  next = scheduleLocalMemberAgendaIntakeAfter(next, governmentKey, item.dueAt);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "The local council reached its quarterly game-profile agenda date.",
    outcomeEventId: null,
  };
}

function scheduleLocalMemberAgendaIntakeAfter(
  world: World,
  governmentKey: string,
  after: IsoDate,
): World {
  const grant = localAuthorityForCouncil(world, governmentKey);
  if (!grant) return world;
  const quarters = LOCAL_AGENDA_DEFAULT_QUARTERS;
  let dueAt = after;
  for (let index = 0; index < quarters; index += 1)
    dueAt = nextQuarterStart(dueAt);
  const stableKey = localIntakeStableKey(governmentKey, dueAt);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
    entityIds: [grant.jurisdictionId],
    jurisdictionId: grant.jurisdictionId,
    provenance: {
      kind: "authored",
      note: `${LOCAL_MEMBER_AGENDA_VERSION}: quarterly game scheduling default for ${governmentKey}; it is not a statement of local legislative calendar law.`,
    },
  });
}

export const LOCAL_MEMBER_AGENDA_HANDLERS = [
  [LOCAL_MEMBER_AGENDA_INTAKE, localMemberAgendaIntakeHandler],
] as const;
