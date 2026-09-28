import { makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { introduceMeasure, measurePosition } from "../legislation";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import { permittedOriginChambers } from "../legislature-rules";
import { nextMeasureNumbering } from "../measure-numbering";
import {
  legislativeProcedureForPack,
  legislativeRulePackForWorld,
  regularSessionRefusalText,
} from "../legislative-procedure-world";
import { SeededRng } from "../rng";
import {
  municipalGovernmentByKey,
  municipalGovernmentsWithProcedure,
  municipalRulePackFor,
} from "../municipal-government";
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
import { localFiscalGameAuthorityForRulePackId } from "../local-ordinance-game-profile";
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
import { mayAnswerQuestion } from "./question-authority";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./officeholder-principles";
import {
  AUTOMATIC_LAW_POSITION_MAPPINGS,
  automaticLawMappingFor,
  automaticLawQuestionOnCooldown,
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

/**
 * The questions the state's own law may answer (`question-authority.ts`), in
 * catalog order.
 */
function stateQuestions(
  world: World,
  jurisdictionId: EntityId,
): readonly EntityId[] {
  return world.policyCatalog.propositionOrder.filter((propositionId) =>
    mayAnswerQuestion(world, jurisdictionId, propositionId),
  );
}

/** Questions a state bill answers through a registered World effect writer. */
function stateEffectQuestionKeys(): ReadonlySet<string> {
  return new Set<string>(
    AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
      (mapping) => mapping.governmentLevel === "state",
    ).map((mapping) => mapping.propositionKey),
  );
}

/**
 * The direction a position bill may take so that enacting it changes the
 * recorded law in force: support enacts where the law does not already say
 * yes; opposition repeals only a law that says yes. Opposing something that is
 * not law files nothing, because enacting "no" over no law changes nothing a
 * reader of the law record could see.
 */
function positionBillAnswer(
  score: number,
  lawAnswer: "yes" | "no" | null,
): "yes" | "no" | null {
  if (score > 0) return lawAnswer === "yes" ? null : "yes";
  return lawAnswer === "yes" ? "no" : null;
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
  return LEGISLATIVE_INTAKE_VERSION + ":" + intakeKey + ":agenda";
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

  const questions = stateQuestions(world, input.jurisdictionId);
  if (questions.length === 0) return world;

  const pack = legislativePackForJurisdiction(input.jurisdictionId);
  if (!pack) return world;
  // A member files only while the legislature can take a bill.
  if (
    legislativeProcedureForPack(world, pack.packId) &&
    regularSessionRefusalText(
      legislativeRulePackForWorld(world, pack.packId),
      world.currentDate,
    )
  )
    return world;
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
  const sponsors = seatedByChamber
    .flatMap(({ chamber, seated }) => {
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
    })
    .sort((left, right) => left.personId.localeCompare(right.personId));
  if (sponsors.length === 0) return world;

  // Every seated member may vote on a bill, not only the members of its
  // originating chamber, so principles are initialized across the full body.
  let next = ensureOfficeholderPrinciples(world, allMemberIds);

  // Read once per question. The law and docket are unchanged until a sponsor
  // actually files, then the next sponsor sees that recorded measure.
  const effectKeys = stateEffectQuestionKeys();
  const lawAnswers = new Map<EntityId, "yes" | "no" | null>();
  const pending = new Map<EntityId, boolean>();
  const coolingDown = new Map<EntityId, boolean>();
  const filedPropositions = new Set<EntityId>();
  const unavailablePropositions = new Set<EntityId>();
  const filedSponsors = new Set<EntityId>();

  const lawAnswerFor = (propositionId: EntityId) => {
    if (!lawAnswers.has(propositionId)) {
      lawAnswers.set(
        propositionId,
        lawInForce(next, input.jurisdictionId, propositionId)?.answer ?? null,
      );
    }
    return lawAnswers.get(propositionId)!;
  };
  // A question is open when no bill on it is moving and it is outside the
  // cooldown that stops one question being toggled every intake.
  const questionOpen = (propositionId: EntityId) => {
    if (
      filedPropositions.has(propositionId) ||
      unavailablePropositions.has(propositionId)
    )
      return false;
    if (!coolingDown.has(propositionId)) {
      coolingDown.set(
        propositionId,
        automaticLawQuestionOnCooldown(next, {
          jurisdictionId: input.jurisdictionId,
          propositionId,
          stableKeyPrefix: `${LEGISLATIVE_INTAKE_VERSION}:`,
        }),
      );
    }
    if (coolingDown.get(propositionId)) return false;
    if (!pending.has(propositionId)) {
      pending.set(
        propositionId,
        pendingBillOn(next, input.jurisdictionId, propositionId),
      );
    }
    return !pending.get(propositionId);
  };
  // The first measure keeps the historical stable key. Additional bills are
  // scoped under the same intake key by proposition and sponsor.
  const measureStableKeyFor = (propositionKey: string, sponsorId: EntityId) =>
    (next.history.legislativeMeasures ?? []).some(
      (measure) => measure.stableKey === batchKey,
    )
      ? batchKey + ":" + encodeURIComponent(propositionKey) + ":" + sponsorId
      : batchKey;

  // Pass one: bills that move public money through a registered effect
  // writer. Stable sponsor order means an unchanged chamber and unchanged
  // saved principles do not randomly reverse the same question next intake.
  for (const sponsor of sponsors) {
    const candidates: {
      propositionId: EntityId;
      answer: "yes" | "no";
      weight: number;
      score: number;
      principleRecordIds: readonly EntityId[];
    }[] = [];

    for (const propositionId of questions) {
      const proposition = next.policyCatalog.propositions[propositionId]!;
      if (!effectKeys.has(proposition.stableKey)) continue;
      if (!questionOpen(propositionId)) continue;
      const leaning = principledLeaning(next, sponsor.personId, propositionId);
      if (Math.abs(leaning.score) < FILING_THRESHOLD) continue;

      const answer = leaning.score > 0 ? "yes" : "no";
      const mapping = automaticLawMappingFor(proposition.stableKey, answer);
      if (!mapping || mapping.governmentLevel !== "state") continue;
      if (lawAnswerFor(propositionId) === answer) continue;
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
      if (!questionOpen(candidate.propositionId)) continue;
      const proposition =
        next.policyCatalog.propositions[candidate.propositionId]!;
      const measureStableKey = measureStableKeyFor(
        proposition.stableKey,
        sponsor.personId,
      );
      const numbering = nextMeasureNumbering(next, {
        jurisdictionId: input.jurisdictionId,
        originChamber: sponsor.chamber,
        rulePackId: pack.packId,
      });
      const designation = numbering.designation;
      const draft = compileAutomaticLawDraft({
        world: next,
        jurisdictionId: input.jurisdictionId,
        propositionId: candidate.propositionId,
        answer: candidate.answer,
        designation,
        intakeKey: batchKey + ":" + encodeURIComponent(proposition.stableKey),
        governmentLevel: "state",
      });
      if (!draft) {
        unavailablePropositions.add(candidate.propositionId);
        continue;
      }

      const permitted = permittedOriginChambers(pack, draft.subjectClass);
      if (
        permitted.kind === "known" &&
        !permitted.value.includes(sponsor.chamber.chamberKey)
      )
        continue;

      const introduced = introduceAutomaticLawMeasure(next, {
        jurisdictionId: input.jurisdictionId,
        governmentLevel: "state",
        stableKey: measureStableKey,
        propositionId: candidate.propositionId,
        answer: candidate.answer,
        intakeKey: batchKey + ":" + encodeURIComponent(proposition.stableKey),
        designation,
        numberingSession: numbering.numberingSession,
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
      filedSponsors.add(sponsor.personId);
      break;
    }
  }

  // Pass two: position and repeal bills. A question with a registered effect
  // writer at this level is answered only by that writer, so a bill never
  // claims a direction on a program it cannot move. Every other question may
  // be answered by a position bill, and only in a direction that changes the
  // recorded law in force (`positionBillAnswer`): that record is what later
  // members, Congress's own agenda and each voter's issue record read, so the
  // enacted bill changes the world even where no money moves.
  //
  // One position bill per intake, the rate this agenda filed at before the
  // money bills existed, in a seeded member order so the same member does not
  // speak first every session.
  const rng = new SeededRng(next.seed).fork(batchKey);
  const order = sponsors.filter(
    (sponsor) => !filedSponsors.has(sponsor.personId),
  );
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.fork(`order:${i}`).integer(0, i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (const sponsor of order) {
    let best: {
      propositionId: EntityId;
      answer: "yes" | "no";
      weight: number;
    } | null = null;
    for (const propositionId of questions) {
      const proposition = next.policyCatalog.propositions[propositionId]!;
      if (effectKeys.has(proposition.stableKey)) continue;
      const score = principledLeaning(
        next,
        sponsor.personId,
        propositionId,
      ).score;
      if (Math.abs(score) < FILING_THRESHOLD) continue;
      if (best && Math.abs(score) <= best.weight) continue;
      const answer = positionBillAnswer(score, lawAnswerFor(propositionId));
      if (!answer || !questionOpen(propositionId)) continue;
      best = { propositionId, answer, weight: Math.abs(score) };
    }
    if (!best) continue;
    const permitted = permittedOriginChambers(pack, "general-policy");
    if (
      permitted.kind === "known" &&
      !permitted.value.includes(sponsor.chamber.chamberKey)
    )
      continue;
    const proposition = next.policyCatalog.propositions[best.propositionId]!;
    next = introduceMeasure(next, {
      stableKey: measureStableKeyFor(proposition.stableKey, sponsor.personId),
      jurisdictionId: input.jurisdictionId,
      rulePackId: pack.packId,
      ...nextMeasureNumbering(next, {
        jurisdictionId: input.jurisdictionId,
        originChamber: sponsor.chamber,
        rulePackId: pack.packId,
      }),
      shortTitle:
        best.answer === "yes"
          ? proposition.name
          : `Repeal: ${proposition.name}`,
      summary:
        best.answer === "yes"
          ? `${proposition.question} This bill says yes.`
          : `${proposition.question} This bill repeals the law that says yes.`,
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: sponsor.personId,
      originChamberKey: sponsor.chamber.chamberKey,
      propositionIds: [best.propositionId],
      propositionAnswers: [
        { propositionId: best.propositionId, answer: best.answer },
      ],
    });
    const measure = next.history.legislativeMeasures!.at(-1)!;
    next = scheduleInstitutionStep(next, measure.id);
    break;
  }
  return next;
}

/** Compatibility entry point for existing state-season callers. */
export function fileMemberAgendaBill(
  world: World,
  input: { readonly jurisdictionId: EntityId; readonly intakeKey: string },
): World {
  return scheduleLocalMemberAgendaIntakes(fileMemberAgendaBills(world, input));
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
  const eligibleKeys = new Set(
    AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
      (mapping) =>
        mapping.governmentLevel === "municipality" ||
        mapping.governmentLevel === "county",
    ).map((mapping) => mapping.propositionKey),
  );
  const propositions = world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id])
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        entry !== undefined && eligibleKeys.has(entry.stableKey),
    );
  for (const proposition of propositions) {
    for (const member of councilMembers(world, governmentKey)) {
      const grant = localFiscalAuthorityFor(
        withLocalSponsorControl(world, member.personId),
        governmentKey,
        proposition.stableKey,
      );
      if (
        grant.ok &&
        (automaticLawMappingFor(
          proposition.stableKey,
          "yes",
          grant.authority.level,
        ) ||
          automaticLawMappingFor(
            proposition.stableKey,
            "no",
            grant.authority.level,
          ))
      )
        return grant;
    }
  }
  return null;
}

/**
 * Preserve sourced procedure candidates, then add only exact fiscal game
 * profiles already installed in this saved world. Installed organizations
 * bound the lookup to saved local governments instead of scanning the
 * national unit catalog; the reverse profile lookup rejects townships.
 */
function localMemberAgendaGovernments(world: World) {
  const governments = new Map(
    municipalGovernmentsWithProcedure().map((government) => [
      government.key,
      government,
    ]),
  );
  const organizationPrefixes = [
    "municipal-government:",
    "local-government:",
  ] as const;
  for (const organization of world.history.organizations) {
    const organizationPrefix = organizationPrefixes.find((prefix) =>
      organization.stableKey.startsWith(prefix),
    );
    if (!organizationPrefix) continue;
    const governmentKey = organization.stableKey.slice(
      organizationPrefix.length,
    );
    const government = municipalGovernmentByKey(governmentKey);
    if (!government || government.key !== governmentKey) continue;
    const rules = municipalRulePackFor(government);
    if (!rules.ok || String(rules.evidence) !== "game-profile") continue;
    const scope = localFiscalGameAuthorityForRulePackId(rules.pack.packId);
    if (
      !scope ||
      scope.authority.rulePackId !== rules.pack.packId ||
      scope.authority.governmentUnitId !== governmentKey ||
      (scope.authority.level !== "municipality" &&
        scope.authority.level !== "county") ||
      scope.jurisdictionId !==
        municipalGovernmentJurisdictionId(world, governmentKey)
    )
      continue;
    governments.set(governmentKey, government);
  }
  return [...governments.values()];
}

/** Schedule each seated, admitted local council on a separate quarterly clock. */
export function scheduleLocalMemberAgendaIntakes(world: World): World {
  let next = world;
  for (const government of localMemberAgendaGovernments(next)) {
    const grant = localAuthorityForCouncil(next, government.key);
    if (!grant) continue;
    const dueAt = nextQuarterStart(next.currentDate as IsoDate);
    const stableKey = localIntakeStableKey(government.key, dueAt);
    if (
      next.history.futureDueItems.some((item) => item.stableKey === stableKey)
    )
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
  const batchKey = `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(input.governmentKey)}:${input.intakeKey}`;
  if (alreadyFiledForIntake(world, batchKey)) return world;

  const members = councilMembers(world, input.governmentKey);
  if (members.length === 0) return world;
  const playerId =
    world.control.kind === "person" ? world.control.personId : null;
  const sponsors = members.filter((member) => member.personId !== playerId);
  if (sponsors.length === 0) return world;

  let next = ensureOfficeholderPrinciples(
    world,
    members.map((member) => member.personId),
  );
  const eligibleKeys = new Set(
    AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
      (mapping) =>
        mapping.governmentLevel === "municipality" ||
        mapping.governmentLevel === "county",
    ).map((mapping) => mapping.propositionKey),
  );
  const propositions = next.policyCatalog.propositionOrder
    .map((id) => next.policyCatalog.propositions[id])
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        entry !== undefined && eligibleKeys.has(entry.stableKey),
    );
  if (propositions.length === 0) return next;

  let filed = false;
  for (const sponsor of sponsors) {
    for (const proposition of propositions) {
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
      if (
        automaticLawQuestionOnCooldown(next, {
          jurisdictionId: grant.jurisdictionId,
          propositionId: proposition.id,
          stableKeyPrefix: `${LOCAL_MEMBER_AGENDA_VERSION}:`,
        })
      )
        continue;

      const pack = legislativePackForWorkKey(context.scenarioKey);
      const chamber = pack?.chambers.find(
        (entry) => entry.chamberKey === "council" && entry.introductionAllowed,
      );
      if (!pack || !chamber || pack.packId !== grant.authority.rulePackId)
        continue;
      const numbering = nextMeasureNumbering(next, {
        jurisdictionId: grant.jurisdictionId,
        originChamber: chamber,
        rulePackId: pack.packId,
      });
      const designation = numbering.designation;
      const stableKey = `${batchKey}:${sponsor.personId}:${encodeURIComponent(proposition.stableKey)}`;
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
        numberingSession: numbering.numberingSession,
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
      filed = true;
      break;
    }
    if (filed) break;
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
  const government = localMemberAgendaGovernments(world).find(
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
    context:
      "The local council reached its quarterly game-profile agenda date.",
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
