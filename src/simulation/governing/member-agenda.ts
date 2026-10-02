import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import {
  MEMBER_AGENDA_LEVEL_SETTINGS,
  COUNCIL_MEMBER_AGENDA_SETTINGS,
  LOCAL_MEMBER_AGENDA_VERSION,
} from "./member-agenda-settings";
export {
  MEMBER_AGENDA_LEVEL_SETTINGS,
  COUNCIL_MEMBER_AGENDA_SETTINGS,
  LOCAL_MEMBER_AGENDA_VERSION,
} from "./member-agenda-settings";
import { addDays } from "../dates";
import { STATUTE_EFFECTIVE_DEFAULT_DAYS } from "../enacted-rule-changes";
import { outranks } from "../law-hierarchy";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import { recordWorldEvent } from "../world";
import { COSPONSOR_EVENT } from "./congress-chambers";
import type {
  LegislativeSubjectClass,
  LegislativeMeasureRecord,
} from "../types";
import type { SeatedMember } from "../legislation-scenarios";
import { scheduleFutureDueItem } from "../future-transitions";
import { introduceMeasure, measurePosition } from "../legislation";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import {
  permittedOriginChambers,
  type LegislativeRulePack,
} from "../legislature-rules";
import { nextMeasureNumbering } from "../measure-numbering";
import { memberFilingCap } from "./member-filing-caps";
import {
  legislativeProcedureForPack,
  legislativeRulePackForWorld,
  regularSessionRefusalText,
} from "../legislative-procedure-world";
import { personName } from "../people";
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
import { lawInForce, ownLawLevel, statuteAnswer } from "./law-in-force";
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
export const LOCAL_MEMBER_AGENDA_INTAKE =
  "government:local-member-agenda-intake" as const;

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

/** Actual council inputs supplied by the existing sitting/meeting callers. */
export interface CouncilMemberAgendaInput {
  readonly pack: LegislativeRulePack;
  readonly members: readonly { readonly personId: EntityId }[];
  readonly questions: readonly EntityId[];
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly playerPersonId: EntityId | null;
  readonly title: (questionName: string, year: string) => string;
  readonly measureKey: (
    numbering: ReturnType<typeof nextMeasureNumbering>,
  ) => string;
}

/** Preserve pending enactments and the council's defeated-question cooldown. */
function councilQuestionClosed(
  world: World,
  council: CouncilMemberAgendaInput,
  propositionId: EntityId,
): boolean {
  const since = addDays(
    world.currentDate,
    -COUNCIL_MEMBER_AGENDA_SETTINGS.refileAfterDays,
  );
  const measures = council.measures.filter((measure) =>
    (measure.propositionIds ?? []).includes(propositionId),
  );
  const ids = new Set(measures.map((measure) => measure.id));
  return (
    measures.some(
      (measure) =>
        !measurePosition(world, measure.id).terminal ||
        (measurePosition(world, measure.id).phase === "failed" &&
          (world.history.legislativeVotes ?? []).some(
            (vote) =>
              vote.measureId === measure.id &&
              vote.outcome !== "passed" &&
              vote.takenAt >= since,
          )),
    ) ||
    (world.history.legislativeEnactments ?? []).some(
      (enactment) =>
        ids.has(enactment.measureId) &&
        (enactment.effectiveAt ??
          addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS)) >
          world.currentDate,
    )
  );
}

const SMALL_TITLE_WORDS = new Set([
  "a",
  "an",
  "and",
  "of",
  "the",
  "for",
  "in",
  "on",
  "or",
  "to",
]);
function agendaTitle(name: string): string {
  return name
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_TITLE_WORDS.has(word)
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}
function agendaSubject(issueKey: string): LegislativeSubjectClass {
  if (issueKey.startsWith("tax.")) return "revenue";
  if (issueKey === "budget.appropriations") return "appropriation";
  return "general-policy";
}
function agendaEventContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}
function recordAgendaSupport(
  world: World,
  measure: LegislativeMeasureRecord,
  sponsor: SeatedMember,
  members: readonly SeatedMember[],
  issueKey: string,
  propositionId: EntityId,
  answer: "yes" | "no",
  settings:
    | (typeof MEMBER_AGENDA_LEVEL_SETTINGS)[keyof typeof MEMBER_AGENDA_LEVEL_SETTINGS]
    | typeof COUNCIL_MEMBER_AGENDA_SETTINGS,
  reason: {
    readonly score: number;
    readonly principleRecordIds: readonly EntityId[];
  },
): World {
  let next = world;
  const proposition = world.policyCatalog.propositions[propositionId]!;
  if (settings.recordMotive)
    next = recordWorldEvent(next, {
      stableKey: `${measure.stableKey}:motive`,
      type: "legislation.sponsor-motive",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: measure.jurisdictionId,
      involvedEntityIds: [measure.id, sponsor.personId!].sort(),
      participants: [
        {
          personId: sponsor.personId!,
          role: "agency:sponsor",
          detail: `Sponsor of ${measure.designation}`,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        settings.intakeVersion,
        `issue:${issueKey}`,
        `proposition:${proposition.stableKey}`,
        "motive:principle",
        ...(settings.municipalAgenda
          ? [
              `principle-score:${reason.score}`,
              ...reason.principleRecordIds.map(
                (id) => `reason:principle-record:${id}`,
              ),
            ]
          : []),
      ],
      summary:
        answer === "yes"
          ? `${sponsor.name} filed ${measure.designation} because their own principles call for it: ${proposition.question}`
          : `${sponsor.name} filed ${measure.designation} to repeal a law their own principles oppose: ${proposition.question}`,
      context: agendaEventContext(),
    });
  if (!settings.cosponsors) return next;
  const player = next.control.kind === "person" ? next.control.personId : null;
  const joining = members.filter(
    (member) =>
      member.personId &&
      member.personId !== sponsor.personId &&
      member.personId !== player &&
      (answer === "yes" ? 1 : -1) *
        principledLeaning(next, member.personId, propositionId).score >=
        settings.filingThreshold,
  );
  if (joining.length === 0) return next;
  return recordWorldEvent(next, {
    stableKey: `${measure.stableKey}:cosponsors`,
    type: COSPONSOR_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      measure.id,
      ...joining.map((member) => member.personId!),
    ].sort(),
    participants: joining.map((member) => ({
      personId: member.personId!,
      role: "agency:cosponsor",
      detail: `Cosponsor of ${measure.designation}`,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [settings.intakeVersion, `issue:${issueKey}`],
    summary: `${joining.length === 1 ? "One member" : `${joining.length} members`} whose principles lean the same way signed on to ${measure.designation}: ${joining.map((member) => member.name).join(", ")}.`,
    context: agendaEventContext(),
  });
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
  input: {
    readonly jurisdictionId: EntityId;
    readonly intakeKey: string;
    readonly chamberKey?: string;
    /** Exact seated municipal body for the existing plain-position intake. */
    readonly localGovernmentKey?: string;
    /** The mapped local fiscal route runs first, then the plain-position route. */
    readonly localFiscalFirst?: boolean;
    /** Existing councils use the same filer with their actual body settings. */
    readonly council?: CouncilMemberAgendaInput;
  },
): World {
  const localGovernment = input.localGovernmentKey
    ? municipalGovernmentByKey(input.localGovernmentKey)
    : null;
  const localRules = localGovernment
    ? municipalRulePackFor(localGovernment)
    : null;
  if (
    input.localGovernmentKey &&
    (!localRules?.ok ||
      municipalGovernmentJurisdictionId(world, input.localGovernmentKey) !==
        input.jurisdictionId)
  )
    return world;
  const pack =
    input.council?.pack ??
    (localRules?.ok
      ? legislativePackForWorkKey(`institution:${localRules.pack.packId}`)
      : legislativePackForJurisdiction(input.jurisdictionId));
  if (!pack) return world;
  const settings = input.council
    ? COUNCIL_MEMBER_AGENDA_SETTINGS
    : MEMBER_AGENDA_LEVEL_SETTINGS[
        input.localGovernmentKey
          ? input.localFiscalFirst
            ? "localFiscal"
            : "localPosition"
          : pack.packId === US_CONGRESS_PACK_ID
            ? "federal"
            : "state"
      ];
  if (
    settings.actTitles &&
    input.chamberKey &&
    (world.history.legislativeMeasures ?? []).some(
      (measure) =>
        measure.stableKey.startsWith(`${settings.intakeVersion}:`) &&
        measure.stableKey.endsWith(`:${input.intakeKey}:${input.chamberKey}`),
    )
  )
    return world;
  const batchKey = input.localGovernmentKey
    ? `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(input.localGovernmentKey)}:${input.intakeKey}`
    : agendaBatchKey(input.intakeKey);
  if (
    !input.council &&
    !settings.actTitles &&
    alreadyFiledForIntake(world, batchKey)
  )
    return world;

  const mappedLocalKeys = settings.mappedOnly
    ? new Set(
        AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
          (row) =>
            row.governmentLevel === "county" ||
            row.governmentLevel === "municipality",
        ).map((row) => row.propositionKey),
      )
    : null;
  const questions =
    input.council?.questions ??
    (settings.mappedOnly
      ? world.policyCatalog.propositionOrder
      : stateQuestions(world, input.jurisdictionId)
    ).filter((id) => {
      const proposition = world.policyCatalog.propositions[id]!;
      if (mappedLocalKeys && !mappedLocalKeys.has(proposition.stableKey))
        return false;
      return (
        settings.issuePrefix === null ||
        world.policyCatalog.issues[proposition.issueId]?.stableKey.startsWith(
          settings.issuePrefix,
        )
      );
    });
  if (questions.length === 0) return world;

  // A member files only while the legislature can take a bill.
  if (
    !input.council &&
    legislativeProcedureForPack(world, pack.packId) &&
    regularSessionRefusalText(
      legislativeRulePackForWorld(world, pack.packId),
      world.currentDate,
    )
  )
    return world;
  const seatedByChamber = pack.chambers.map((chamber) => ({
    chamber,
    seated: input.council
      ? {
          seats: input.council.members.length,
          body: {
            chamberKey: chamber.chamberKey,
            chamberName: chamber.name,
            members: input.council.members.map((member) => ({
              memberKey: member.personId,
              personId: member.personId,
              name: personName(world.people[member.personId]!),
              partyKey: null,
              caucusLabel: "No party",
            })),
          },
        }
      : input.localGovernmentKey
        ? {
            seats: councilMembers(world, input.localGovernmentKey).length,
            body: {
              chamberKey: chamber.chamberKey,
              chamberName: chamber.name,
              members: councilMembers(world, input.localGovernmentKey).map(
                (seat) => ({
                  memberKey: seat.participationId,
                  personId: seat.personId,
                  name: personName(world.people[seat.personId]!),
                  partyKey: null,
                  caucusLabel: "No party",
                }),
              ),
            },
          }
        : seatedChamberForPack(
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
  const playerId = input.council
    ? input.council.playerPersonId
    : world.control.kind === "person"
      ? world.control.personId
      : null;
  let next = ensureOfficeholderPrinciples(world, allMemberIds);

  const lawAnswers = new Map<EntityId, "yes" | "no" | null | "closed">();
  const laws = new Map<EntityId, ReturnType<typeof lawInForce>>();
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
        input.council
          ? !councilQuestionClosed(next, input.council, propositionId)
          : !pendingBillOn(next, input.jurisdictionId, propositionId),
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
    context: AutomaticLawCompileContext | null;
    mapped: boolean;
    issueKey: string;
    subjectClass: LegislativeSubjectClass;
  };
  for (const { chamber, seated } of seatedByChamber) {
    if (
      !chamber.introductionAllowed ||
      !seated ||
      (input.chamberKey && input.chamberKey !== chamber.chamberKey)
    )
      continue;
    const intakeSuffix = `:${input.intakeKey}:${chamber.chamberKey}`;
    if (
      settings.actTitles &&
      (next.history.legislativeMeasures ?? []).some(
        (measure) =>
          measure.stableKey.startsWith(`${settings.intakeVersion}:`) &&
          measure.stableKey.endsWith(intakeSuffix),
      )
    )
      continue;
    const members = seated.body.members.filter(
      (member) => member.personId !== null,
    );
    const caucus = agendaCaucus(members);
    const proposals = (settings.individualAgenda ? members : caucus).flatMap(
      (sponsor) => {
        if (sponsor.personId === playerId) return [];
        if (
          !input.council &&
          input.localGovernmentKey &&
          !municipalActionAuthority(
            withLocalSponsorControl(next, sponsor.personId!),
            {
              governmentKey: input.localGovernmentKey,
              personId: sponsor.personId!,
              residentPlaceGeoid: null,
              action: "introduce-ordinance",
            },
          ).ok
        )
          return [];
        let best: Proposal | null = null;
        const councilProposals: Proposal[] = [];
        for (const propositionId of questions) {
          if (!questionOpen(propositionId)) continue;
          const leaning = leaningFor(sponsor.personId!, propositionId);
          if (Math.abs(leaning.score) < settings.filingThreshold) continue;
          if (!input.council && best && Math.abs(leaning.score) <= best.weight)
            continue;
          if (!laws.has(propositionId))
            laws.set(
              propositionId,
              lawInForce(next, input.jurisdictionId, propositionId),
            );
          const law = laws.get(propositionId)!;
          if (
            input.council
              ? law &&
                outranks(law.level, ownLawLevel(input.jurisdictionId)) &&
                law.preempts !== false
              : settings.municipalAgenda &&
                law?.preempts &&
                law.level !== "local-ordinance"
          )
            continue;
          if (!lawAnswers.has(propositionId))
            lawAnswers.set(
              propositionId,
              input.council ? (law?.answer ?? null) : statuteAnswer(law),
            );
          let answer = positionBillAnswer(
            leaning.score,
            lawAnswers.get(propositionId)!,
          );
          const proposition = next.policyCatalog.propositions[propositionId]!;
          const fiscalGrant =
            settings.mappedOnly && input.localGovernmentKey
              ? localFiscalAuthorityFor(
                  withLocalSponsorControl(next, sponsor.personId!),
                  input.localGovernmentKey,
                  proposition.stableKey,
                )
              : null;
          if (settings.mappedOnly && !fiscalGrant?.ok) continue;
          const context = fiscalGrant?.ok ? localContext(fiscalGrant) : null;
          if (
            context &&
            (context.jurisdictionId !== input.jurisdictionId ||
              context.rulePackId !== pack.packId)
          )
            continue;
          const numbering = input.council
            ? null
            : nextMeasureNumbering(next, {
                jurisdictionId: input.jurisdictionId,
                originChamber: chamber,
                rulePackId: pack.packId,
              });
          const compileForSponsor = (requestedAnswer: "yes" | "no") =>
            numbering
              ? compileAutomaticLawDraft({
                  world: context
                    ? withLocalSponsorControl(next, sponsor.personId!)
                    : next,
                  sponsorPersonId: sponsor.personId!,
                  jurisdictionId: input.jurisdictionId,
                  propositionId,
                  answer: requestedAnswer,
                  designation: numbering.designation,
                  intakeKey: settings.mappedOnly
                    ? batchKey
                    : batchKey +
                      ":" +
                      encodeURIComponent(
                        next.policyCatalog.propositions[propositionId]!
                          .stableKey,
                      ),
                  governmentLevel: settings.governmentLevel,
                  ...(context ? { context } : {}),
                })
              : null;
          let requestedChange: ReturnType<typeof compileAutomaticLawDraft> =
            null;
          if (
            !input.council &&
            !answer &&
            leaning.score > 0 &&
            lawAnswers.get(propositionId) === "yes"
          ) {
            requestedChange = compileForSponsor("yes");
            if (requestedChange) answer = "yes";
          }
          if (!answer) continue;
          const issueKey = next.policyCatalog.issues[
            proposition.issueId
          ]!.stableKey.slice(settings.issuePrefix?.length ?? 0);
          const subjectClass = settings.actTitles
            ? agendaSubject(issueKey)
            : "general-policy";
          const mapped =
            !input.council &&
            !!automaticLawMappingFor(
              proposition.stableKey,
              answer,
              context?.governmentLevel ?? settings.governmentLevel,
            );
          if (settings.mappedOnly && !mapped) continue;
          if (
            !input.council &&
            (!settings.mappedCooldownOnly || mapped) &&
            automaticLawQuestionOnCooldown(next, {
              jurisdictionId: input.jurisdictionId,
              propositionId,
              stableKeyPrefix: `${settings.intakeVersion}:`,
            })
          )
            continue;
          // Origination follows the subject's formal rule, independent of mapping.
          const allowed = permittedOriginChambers(pack, subjectClass);
          if (
            !input.council &&
            allowed.kind === "known" &&
            !allowed.value.includes(chamber.chamberKey)
          )
            continue;
          const draftKey = `${sponsor.personId}:${chamber.chamberKey}:${propositionId}:${answer}`;
          if (
            mapped &&
            settings.compileBeforeSelection &&
            !drafts.has(draftKey)
          )
            drafts.set(draftKey, requestedChange ?? compileForSponsor(answer));
          const draft =
            mapped && settings.compileBeforeSelection
              ? drafts.get(draftKey)!
              : null;
          // Without numeric references, use the same plain-position route as before.
          if (settings.mappedOnly && !draft) continue;
          const permitted = permittedOriginChambers(
            pack,
            draft?.subjectClass ?? subjectClass,
          );
          if (
            !input.council &&
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
            context,
            mapped,
            issueKey,
            subjectClass,
          };
          if (input.council) councilProposals.push(best);
        }
        return (input.council ? councilProposals : best ? [best] : []).map(
          (proposal) => ({ sponsor, proposal, pressure: proposal.weight }),
        );
      },
    );
    const claimedMembers = new Set<EntityId>();
    const claimedQuestions = new Set<EntityId>();
    const selections = settings.individualAgenda
      ? [...proposals].sort(
          (a, b) =>
            b.pressure - a.pressure ||
            members.indexOf(a.sponsor) - members.indexOf(b.sponsor),
        )
      : (() => {
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
          return selected ? [selected] : [];
        })();
    for (const selected of selections) {
      const sponsor = selected.sponsor;
      const best = selected.proposal;
      if (
        claimedMembers.has(sponsor.personId!) ||
        claimedQuestions.has(best.propositionId)
      )
        continue;
      if (!questionOpen(best.propositionId)) continue;
      const proposition = next.policyCatalog.propositions[best.propositionId]!;
      let stableKey = settings.municipalAgenda
        ? `${batchKey}:${sponsor.personId}:${encodeURIComponent(proposition.stableKey)}`
        : settings.actTitles
          ? `${settings.intakeVersion}:${best.issueKey}${intakeSuffix}`
          : (next.history.legislativeMeasures ?? []).some(
                (m) => m.stableKey === batchKey,
              )
            ? `${batchKey}:${encodeURIComponent(proposition.stableKey)}:${sponsor.personId}`
            : batchKey;
      if (settings.governmentLevel === "federal")
        next = ensureNationalElectionJurisdiction(next);
      const numbering = nextMeasureNumbering(next, {
        jurisdictionId: input.jurisdictionId,
        originChamber: chamber,
        rulePackId: pack.packId,
      });
      if (input.council) stableKey = input.council.measureKey(numbering);
      const beforeIntroduction = next;
      if (!input.council && input.localGovernmentKey)
        next = withLocalSponsorControl(next, sponsor.personId!);
      let measureId: EntityId | null = null;
      if (best.mapped && (!settings.compileBeforeSelection || best.draft)) {
        const introduced = introduceAutomaticLawMeasure(next, {
          jurisdictionId: input.jurisdictionId,
          governmentLevel: settings.governmentLevel,
          stableKey,
          propositionId: best.propositionId,
          answer: best.answer,
          intakeKey: settings.mappedOnly
            ? batchKey
            : settings.actTitles
              ? stableKey
              : batchKey + ":" + encodeURIComponent(proposition.stableKey),
          ...(best.context ? { context: best.context } : {}),
          ...numbering,
          sponsorPersonId: sponsor.personId!,
          originChamberKey: chamber.chamberKey,
          principleRecordIds: best.principleRecordIds,
          principleScore: best.score,
        });
        if (introduced) {
          next = introduced.world;
          measureId = introduced.measureId;
        }
      }
      if (!measureId) {
        next = introduceMeasure(next, {
          stableKey,
          jurisdictionId: input.jurisdictionId,
          rulePackId: pack.packId,
          ...numbering,
          shortTitle: input.council
            ? `${best.answer === "yes" ? "" : "Repeal: "}${input.council.title(proposition.name, world.currentDate.slice(0, 4))}`
            : settings.actTitles
              ? `${agendaTitle(proposition.name)}${best.answer === "yes" ? "" : " Repeal"} Act of ${world.currentDate.slice(0, 4)}`
              : best.answer === "yes"
                ? proposition.name
                : `Repeal: ${proposition.name}`,
          summary: input.council
            ? `Answers "${proposition.question}" with ${best.answer}.`
            : best.answer === "yes"
              ? `${proposition.question} This ${settings.measureNoun} says yes.${best.mapped ? " No numeric terms are requested because a verified current-law reference is unavailable." : ""}`
              : `${proposition.question} This ${settings.measureNoun} repeals the law that says yes.`,
          origin: "member-introduction",
          subjectClass: best.subjectClass,
          sponsorPersonId: sponsor.personId,
          originChamberKey: chamber.chamberKey,
          propositionIds: [best.propositionId],
          propositionAnswers: [
            { propositionId: best.propositionId, answer: best.answer },
          ],
        });
        measureId = next.history.legislativeMeasures!.at(-1)!.id;
      }
      const measure = next.history.legislativeMeasures!.find(
        (row) => row.id === measureId,
      )!;
      // Inspect the actual compiled subject, then admit the pure writer result.
      // A rejected candidate has no saved bill, terms, control or reason side effects.
      const cap = memberFilingCap(
        beforeIntroduction.history.legislativeMeasures ?? [],
        {
          place: pack.jurisdictionKey,
          jurisdictionId: input.jurisdictionId,
          chamberKey: chamber.chamberKey,
          sponsorPersonId: sponsor.personId!,
          subjectClass: measure.subjectClass,
          origin: measure.origin,
          introducedAt: measure.introducedAt,
          numberingSession: numbering.numberingSession,
        },
      );
      if (!cap.allowed) {
        next = beforeIntroduction;
        continue;
      }
      if (cap.notAppliedLimits?.length) {
        const explanationKey = `${batchKey}:limit-not-applied:${sponsor.personId}:${chamber.chamberKey}`;
        if (
          !next.history.events.some(
            (event) => event.stableKey === explanationKey,
          )
        )
          next = recordWorldEvent(next, {
            stableKey: explanationKey,
            type: "legislation.member-filing-limit-not-applied",
            occurredAt: next.currentDate,
            recordedAt: next.currentDate,
            jurisdictionId: input.jurisdictionId,
            involvedEntityIds: [measure.id, sponsor.personId!],
            participants: [
              {
                personId: sponsor.personId!,
                role: "agency:sponsor",
                detail: "limit not applied: exemption unread",
              },
            ],
            personFactConstraints: [],
            visibility: "public",
            tags: [
              settings.intakeVersion,
              "limit-not-applied:exemption-unread",
              ...cap.notAppliedLimits.map((row) => `citation:${row.citation}`),
            ],
            summary: "limit not applied: exemption unread",
            context: {
              ...agendaEventContext(),
              choice: cap.notAppliedLimits.map((row) => row.quote).join("\n"),
            },
          });
      }
      claimedMembers.add(sponsor.personId!);
      claimedQuestions.add(best.propositionId);
      next = recordAgendaSupport(
        next,
        measure,
        sponsor,
        seated.body.members,
        best.issueKey,
        best.propositionId,
        best.answer,
        settings,
        best,
      );
      if (!input.council && input.localGovernmentKey) {
        const placed = placeMunicipalOrdinanceOnAgenda(next, {
          governmentKey: input.localGovernmentKey,
          measureId,
        });
        if (!placed.ok) return world;
        const scheduled = scheduleOrdinaryCouncilReading(
          placed.world,
          input.localGovernmentKey,
          measureId,
        );
        return { ...scheduled, control: world.control };
      }
      if (!input.council) next = scheduleInstitutionStep(next, measureId);
      open.set(best.propositionId, false);
    }
  }
  if (settings.mappedOnly)
    return fileMemberAgendaBills(next, { ...input, localFiscalFirst: false });
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

function nextLocalAgendaDate(governmentKey: string, after: IsoDate): IsoDate | null {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) return null;
  const rules = municipalRulePackFor(government);
  if (!rules.ok) return null;
  return nextSessionCalendarDate(
    rules.pack.session.sittingCalendar ?? LEGISLATIVE_SESSION_CALENDARS.council,
    after,
    "agenda",
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

/** Schedule each seated, admitted council using its shared intake timetable. */
export function scheduleLocalMemberAgendaIntakes(world: World): World {
  let next = world;
  for (const government of localMemberAgendaGovernments(next)) {
    const grant = localAuthorityForCouncil(next, government.key);
    if (!grant) continue;
    const dueAt = nextLocalAgendaDate(government.key, next.currentDate as IsoDate);
    if (!dueAt) continue;
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
        note: `${LOCAL_MEMBER_AGENDA_VERSION}: shared game timetable intake for ${government.key}; it is not a statement of local legislative calendar law.`,
      },
    });
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
  let next = fileMemberAgendaBills(world, {
    jurisdictionId: currentJurisdictionId!,
    localGovernmentKey: governmentKey,
    localFiscalFirst: true,
    intakeKey: item.dueAt,
  });
  next = scheduleLocalMemberAgendaIntakeAfter(next, governmentKey, item.dueAt);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context:
      "The local council reached its shared timetable agenda date.",
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
  const dueAt = nextLocalAgendaDate(governmentKey, after);
  if (!dueAt) return world;
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
      note: `${LOCAL_MEMBER_AGENDA_VERSION}: shared game timetable intake for ${governmentKey}; it is not a statement of local legislative calendar law.`,
    },
  });
}

export function localMemberAgendaHandlers() {
  return [
    [LOCAL_MEMBER_AGENDA_INTAKE, localMemberAgendaIntakeHandler],
  ] as const;
}
