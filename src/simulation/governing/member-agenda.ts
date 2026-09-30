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
  municipalActionAuthority,
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
import { agendaCaucus, majorityAgendaChoice } from "./majority-agenda";
import { lawInForce, statuteAnswer } from "./law-in-force";
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
 * their own saved principles press hardest. Mapped proposals carry their World
 * effects; unmapped answers still change the recorded law in force.
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
  lawAnswer: "yes" | "no" | null | "closed",
): "yes" | "no" | null {
  // A constitution settles the question: no statute could change it.
  if (lawAnswer === "closed") return null;
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
      !sessionIsClosed(world, measure.id),
  );
}

/**
 * Whether a measure's session has closed. A measure filed under a rule pack
 * this session cannot read (a town's charter-profile pack, for one) has no
 * readable session, so it counts as still open: a member does not file a
 * second bill on a question a bill is already moving on.
 */
function sessionIsClosed(world: World, measureId: EntityId): boolean {
  try {
    return measureSessionIsClosed(world, measureId).closed;
  } catch {
    return false;
  }
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
 * At one real legislative intake, each majority member brings their best open
 * proposal. Each chamber takes the strongest proposal backed by more than
 * half that caucus and by a chamber majority; this does not promise a bill or
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
  const playerId =
    world.control.kind === "person" ? world.control.personId : null;
  let next = ensureOfficeholderPrinciples(world, allMemberIds);
  const effectKeys = stateEffectQuestionKeys();
  const lawAnswers = new Map<EntityId, "yes" | "no" | null | "closed">();
  const open = new Map<EntityId, boolean>();
  const drafts = new Map<string, ReturnType<typeof compileAutomaticLawDraft>>();
  const leanings = new Map<string, ReturnType<typeof principledLeaning>>();
  const leaningFor = (personId: EntityId, propositionId: EntityId) => {
    const key = `${personId}:${propositionId}`;
    let value = leanings.get(key);
    if (!value) {
      value = principledLeaning(next, personId, propositionId);
      leanings.set(key, value);
    }
    return value;
  };
  const questionOpen = (propositionId: EntityId) => {
    if (!open.has(propositionId))
      open.set(
        propositionId,
        !pendingBillOn(next, input.jurisdictionId, propositionId) &&
          !automaticLawQuestionOnCooldown(next, {
            jurisdictionId: input.jurisdictionId,
            propositionId,
            stableKeyPrefix: `${LEGISLATIVE_INTAKE_VERSION}:`,
          }),
      );
    return open.get(propositionId)!;
  };
  type Proposal = {
    propositionId: EntityId;
    answer: "yes" | "no";
    weight: number;
    score: number;
    principleRecordIds: readonly EntityId[];
    draft: ReturnType<typeof compileAutomaticLawDraft>;
  };
  for (const { chamber, seated } of seatedByChamber) {
    if (!chamber.introductionAllowed || !seated) continue;
    const members = seated.body.members.filter(
      (member) => member.personId !== null,
    );
    const caucus = agendaCaucus(members);
    const proposals = caucus.flatMap((sponsor) => {
      if (sponsor.personId === playerId) return [];
      let best: Proposal | null = null;
      for (const propositionId of questions) {
        if (!questionOpen(propositionId)) continue;
        const leaning = leaningFor(sponsor.personId!, propositionId);
        if (Math.abs(leaning.score) < FILING_THRESHOLD) continue;
        if (best && Math.abs(leaning.score) <= best.weight) continue;
        if (!lawAnswers.has(propositionId))
          lawAnswers.set(
            propositionId,
            statuteAnswer(
              lawInForce(next, input.jurisdictionId, propositionId),
            ),
          );
        const answer = positionBillAnswer(
          leaning.score,
          lawAnswers.get(propositionId)!,
        );
        if (!answer) continue;
        const proposition = next.policyCatalog.propositions[propositionId]!;
        const mapped =
          effectKeys.has(proposition.stableKey) &&
          automaticLawMappingFor(proposition.stableKey, answer)
            ?.governmentLevel === "state";
        const numbering = nextMeasureNumbering(next, {
          jurisdictionId: input.jurisdictionId,
          originChamber: chamber,
          rulePackId: pack.packId,
        });
        const draftKey = `${chamber.chamberKey}:${propositionId}:${answer}`;
        if (mapped && !drafts.has(draftKey))
          drafts.set(
            draftKey,
            compileAutomaticLawDraft({
              world: next,
              jurisdictionId: input.jurisdictionId,
              propositionId,
              answer,
              designation: numbering.designation,
              intakeKey:
                batchKey + ":" + encodeURIComponent(proposition.stableKey),
              governmentLevel: "state",
            }),
          );
        const draft = mapped ? drafts.get(draftKey)! : null;
        if (mapped && !draft) continue;
        const permitted = permittedOriginChambers(
          pack,
          draft?.subjectClass ?? "general-policy",
        );
        if (
          permitted.kind === "known" &&
          !permitted.value.includes(chamber.chamberKey)
        )
          continue;
        best = {
          propositionId,
          answer,
          weight: Math.abs(leaning.score),
          score: leaning.score,
          principleRecordIds: leaning.recordIds,
          draft,
        };
      }
      return best ? [{ sponsor, proposal: best, pressure: best.weight }] : [];
    });
    const selected = majorityAgendaChoice(
      members,
      caucus,
      proposals,
      (member, proposal) => {
        if (member.personId === playerId) return false;
        const score = leaningFor(
          member.personId!,
          proposal.propositionId,
        ).score;
        return (proposal.answer === "yes" ? score : -score) > 0;
      },
    );
    if (!selected) continue;
    const sponsor = selected.sponsor;
    const best = selected.proposal;
    const proposition = next.policyCatalog.propositions[best.propositionId]!;
    const stableKey = (next.history.legislativeMeasures ?? []).some(
      (m) => m.stableKey === batchKey,
    )
      ? `${batchKey}:${encodeURIComponent(proposition.stableKey)}:${sponsor.personId}`
      : batchKey;
    const numbering = nextMeasureNumbering(next, {
      jurisdictionId: input.jurisdictionId,
      originChamber: chamber,
      rulePackId: pack.packId,
    });
    if (best.draft) {
      const introduced = introduceAutomaticLawMeasure(next, {
        jurisdictionId: input.jurisdictionId,
        governmentLevel: "state",
        stableKey,
        propositionId: best.propositionId,
        answer: best.answer,
        intakeKey: batchKey + ":" + encodeURIComponent(proposition.stableKey),
        ...numbering,
        sponsorPersonId: sponsor.personId!,
        originChamberKey: chamber.chamberKey,
        principleRecordIds: best.principleRecordIds,
        principleScore: best.score,
      });
      if (!introduced) continue;
      next = scheduleInstitutionStep(introduced.world, introduced.measureId);
    } else {
      next = introduceMeasure(next, {
        stableKey,
        jurisdictionId: input.jurisdictionId,
        rulePackId: pack.packId,
        ...numbering,
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
        originChamberKey: chamber.chamberKey,
        propositionIds: [best.propositionId],
        propositionAnswers: [
          { propositionId: best.propositionId, answer: best.answer },
        ],
      });
      next = scheduleInstitutionStep(
        next,
        next.history.legislativeMeasures!.at(-1)!.id,
      );
    }
    open.set(best.propositionId, false);
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
      const currentAnswer = statuteAnswer(
        lawInForce(next, grant.jurisdictionId, proposition.id),
      );
      if (currentAnswer === answer || currentAnswer === "closed") continue;
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
  if (!filed)
    next = fileLocalPositionBill(next, {
      governmentKey: input.governmentKey,
      batchKey,
      sponsorIds: sponsors.map((member) => member.personId),
      control: world.control,
    });
  return next;
}

/**
 * A council member who leans hard on a question the town's own law may answer
 * but no local effect writer covers still files a plain position bill: to
 * enact what they support, or to repeal a law in force they oppose. It goes to
 * the council's agenda through the same general-policy route the player's own
 * ordinances take, so mapping coverage never narrows what a council takes up.
 *
 * PLACEHOLDER, pending research question
 * `expand-effect-mapping-so-every-law-changes-the-world`: an enacted local
 * position bill is law in force and changes nothing else in the world yet.
 */
function fileLocalPositionBill(
  world: World,
  input: {
    readonly governmentKey: string;
    readonly batchKey: string;
    readonly sponsorIds: readonly EntityId[];
    readonly control: World["control"];
  },
): World {
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) return world;
  const rules = municipalRulePackFor(government);
  if (!rules.ok) return world;
  const pack = legislativePackForWorkKey(`institution:${rules.pack.packId}`);
  const chamber = pack?.chambers.find(
    (entry) => entry.chamberKey === "council" && entry.introductionAllowed,
  );
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    input.governmentKey,
  );
  if (!pack || !chamber || !jurisdictionId) return world;
  const permitted = permittedOriginChambers(pack, "general-policy");
  if (
    permitted.kind === "known" &&
    !permitted.value.includes(chamber.chamberKey)
  )
    return world;

  const mappedLocally = (propositionKey: string, answer: "yes" | "no") =>
    (["municipality", "county"] as const).some(
      (level) => automaticLawMappingFor(propositionKey, answer, level) !== null,
    );
  const rng = new SeededRng(world.seed).fork(input.batchKey);
  const order = [...input.sponsorIds];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.fork(`order:${i}`).integer(0, i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (const sponsorId of order) {
    const actorWorld = withLocalSponsorControl(world, sponsorId);
    const introduction = municipalActionAuthority(actorWorld, {
      governmentKey: input.governmentKey,
      personId: sponsorId,
      residentPlaceGeoid: null,
      action: "introduce-ordinance",
    });
    if (!introduction.ok) continue;
    let best: {
      propositionId: EntityId;
      answer: "yes" | "no";
      weight: number;
    } | null = null;
    for (const propositionId of world.policyCatalog.propositionOrder) {
      if (!mayAnswerQuestion(world, jurisdictionId, propositionId)) continue;
      const proposition = world.policyCatalog.propositions[propositionId]!;
      const score = principledLeaning(world, sponsorId, propositionId).score;
      if (Math.abs(score) < FILING_THRESHOLD) continue;
      if (best && Math.abs(score) <= best.weight) continue;
      const law = lawInForce(world, jurisdictionId, propositionId);
      // A state's floor law that preempts local action leaves the council
      // nothing to enact: an ordinance on it would change no answer.
      if (law?.preempts && law.level !== "local-ordinance") continue;
      const answer = positionBillAnswer(score, statuteAnswer(law));
      if (!answer || mappedLocally(proposition.stableKey, answer)) continue;
      if (pendingBillOn(world, jurisdictionId, propositionId)) continue;
      if (
        automaticLawQuestionOnCooldown(world, {
          jurisdictionId,
          propositionId,
          stableKeyPrefix: `${LOCAL_MEMBER_AGENDA_VERSION}:`,
        })
      )
        continue;
      best = { propositionId, answer, weight: Math.abs(score) };
    }
    if (!best) continue;
    const proposition = world.policyCatalog.propositions[best.propositionId]!;
    let introduced: World;
    try {
      introduced = introduceMeasure(actorWorld, {
        stableKey: `${input.batchKey}:${sponsorId}:${encodeURIComponent(proposition.stableKey)}`,
        jurisdictionId,
        rulePackId: pack.packId,
        ...nextMeasureNumbering(actorWorld, {
          jurisdictionId,
          originChamber: chamber,
          rulePackId: pack.packId,
        }),
        shortTitle:
          best.answer === "yes"
            ? proposition.name
            : `Repeal: ${proposition.name}`,
        summary:
          best.answer === "yes"
            ? `${proposition.question} This ordinance says yes.`
            : `${proposition.question} This ordinance repeals the law that says yes.`,
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: sponsorId,
        originChamberKey: chamber.chamberKey,
        propositionIds: [best.propositionId],
        propositionAnswers: [
          { propositionId: best.propositionId, answer: best.answer },
        ],
      });
    } catch {
      continue;
    }
    const measure = introduced.history.legislativeMeasures!.at(-1)!;
    const placed = placeMunicipalOrdinanceOnAgenda(introduced, {
      governmentKey: input.governmentKey,
      measureId: measure.id,
    });
    if (!placed.ok) continue;
    const scheduled = scheduleOrdinaryCouncilReading(
      placed.world,
      input.governmentKey,
      measure.id,
    );
    return { ...scheduled, control: input.control };
  }
  return world;
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
