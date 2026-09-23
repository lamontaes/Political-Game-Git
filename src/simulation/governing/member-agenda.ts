import { measurePosition, introduceMeasure } from "../legislation";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { defaultOriginChamber } from "../legislature-rules";
import { nextMeasureDesignation } from "../measure-numbering";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { seatedChamberForPack } from "./chamber-votes";
import { lawInForce } from "./law-in-force";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./officeholder-principles";
import {
  LEGISLATIVE_INTAKE_VERSION,
  measureSessionIsClosed,
  scheduleInstitutionStep,
} from "./legislative-clock";

/**
 * MEMBER AGENDA — a sitting member files a bill on the question their own
 * principles press hardest (see officeholder-principles.ts).
 *
 * lamontae, 2026-09-23: people need intrinsic reasons for wanting laws, and a
 * party does not decide for its members (D-093). World agendas stay marked
 * placeholders until sourced: the filing threshold is one.
 */

export const MEMBER_AGENDA_VERSION = "member-agenda/v1";

/** PLACEHOLDER: the least summed weight that moves a member to file a bill. */
const FILING_THRESHOLD = 3;

/** The state-level questions in the catalog, in catalog order. */
function stateQuestions(world: World): readonly EntityId[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder.filter((propositionId) => {
    const issue = catalog.issues[catalog.propositions[propositionId]!.issueId];
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

/**
 * A member of the state's seated origin chamber files a bill on the question
 * their principles press hardest, where the law in force does not already say
 * what they want and no bill on it is moving: a bill to enact what they
 * support, or to repeal a law in force they oppose. Opposing something that
 * is not law files nothing; they vote against it when it comes.
 *
 * Refused (World unchanged) where the state has no seated chamber, this
 * intake already ran, or no member leans hard enough on anything open.
 */
export function fileMemberAgendaBill(
  world: World,
  input: { readonly jurisdictionId: EntityId; readonly intakeKey: string },
): World {
  const stableKey = `${LEGISLATIVE_INTAKE_VERSION}:${input.intakeKey}:agenda`;
  if (
    (world.history.legislativeMeasures ?? []).some(
      (measure) => measure.stableKey === stableKey,
    )
  )
    return world;
  const pack = legislativePackForJurisdiction(input.jurisdictionId);
  if (!pack) return world;
  const originChamber = defaultOriginChamber(pack);
  const seated = seatedChamberForPack(
    world,
    pack.packId,
    originChamber.chamberKey,
    originChamber.name,
  );
  const members = (seated?.body.members ?? []).filter(
    (member): member is typeof member & { personId: EntityId } =>
      member.personId !== null &&
      !(
        world.control.kind === "person" &&
        world.control.personId === member.personId
      ),
  );
  if (members.length === 0) return world;
  // Every member who will vote on the bill holds principles, not only the
  // chamber it starts in.
  let next = ensureOfficeholderPrinciples(
    world,
    pack.chambers.flatMap(
      (chamber) =>
        seatedChamberForPack(
          world,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        )
          ?.body.members.map((member) => member.personId)
          .filter((personId): personId is EntityId => personId !== null) ?? [],
    ),
  );
  const questions = stateQuestions(next);
  const rng = new SeededRng(next.seed).fork(stableKey);
  const order = [...members];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.fork(`order:${i}`).integer(0, i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (const member of order) {
    let best: {
      propositionId: EntityId;
      answer: "yes" | "no";
      weight: number;
    } | null = null;
    for (const propositionId of questions) {
      const leaning = principledLeaning(
        next,
        member.personId,
        propositionId,
      ).score;
      if (Math.abs(leaning) < FILING_THRESHOLD) continue;
      const law = lawInForce(next, input.jurisdictionId, propositionId);
      // Support files a bill to enact unless the law already says yes;
      // opposition files only a repeal of a law that says yes.
      const answer: "yes" | "no" | null =
        leaning > 0
          ? law?.answer === "yes"
            ? null
            : "yes"
          : law?.answer === "yes"
            ? "no"
            : null;
      if (!answer) continue;
      if (pendingBillOn(next, input.jurisdictionId, propositionId)) continue;
      if (!best || Math.abs(leaning) > best.weight)
        best = { propositionId, answer, weight: Math.abs(leaning) };
    }
    if (!best) continue;
    const proposition = next.policyCatalog.propositions[best.propositionId]!;
    next = introduceMeasure(next, {
      stableKey,
      jurisdictionId: input.jurisdictionId,
      rulePackId: pack.packId,
      designation: nextMeasureDesignation(next, {
        jurisdictionId: input.jurisdictionId,
        originChamber,
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
      sponsorPersonId: member.personId,
      originChamberKey: originChamber.chamberKey,
      propositionIds: [best.propositionId],
      propositionAnswers: [
        { propositionId: best.propositionId, answer: best.answer },
      ],
    });
    const measure = next.history.legislativeMeasures!.at(-1)!;
    return scheduleInstitutionStep(next, measure.id);
  }
  return next;
}
