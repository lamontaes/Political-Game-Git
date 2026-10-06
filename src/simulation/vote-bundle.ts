import { measureById } from "./legislation";
import { measureProvisions } from "./legislative-politics";
import { publicFaceOfPart, whoCaresAbout } from "./provision-public-face";
import { rulePackById } from "./legislature-rule-packs";
import { chamberByKey, nextFloorStageKey } from "./legislature-rules";
import type {
  EntityId,
  LegislativeAmendmentRecord,
  LegislativeMemberDisposition,
  LegislativeProvisionRecord,
  LegislativeVoteRecord,
  PropositionAnswerRef,
  World,
} from "./types";

/**
 * What was on the table when a question was put.
 *
 * A member votes on a whole bill at one moment; a voter later hears about one
 * line of it. Every "voted against Social Security" ad, every poison pill and
 * every rider lives in the gap between the two, so the record of a vote has to
 * say which bundle of parts the member was voting on, as it stood then, not
 * as the bill finally read (Build 25 step 1, design D-5, approved by lamontae
 * on September 28, 2026).
 *
 * Nothing new is written to a save for this. Sections are append-only and
 * every history record carries one world-wide sequence number, so the bill as
 * it read when a question was put is exactly the sections recorded before the
 * vote and not yet replaced by then. Reading it back from those records gives
 * the same answer in a save written before this module existed, and no second
 * copy can drift from the first. An amendment is the one part that is not in
 * the bill when its own question is put: it carries its offered sections on
 * its own record (`LegislativeAmendmentRecord.proposedSections`), or, for an
 * amendment offered by description before that field existed, the sections it
 * carried in once adopted.
 */

/** The kind of question a recorded vote put. */
export type VoteQuestionKind =
  | "committee-report"
  | "amendment"
  /** A floor stage that is not the chamber's last, such as a second reading. */
  | "stage"
  /** The chamber's last floor stage: passing the bill out of the chamber. */
  | "passage"
  | "concurrence"
  | "veto-override"
  | "constitutional-proposal";

/** One part of what a vote decided. */
export interface VoteBundlePart {
  /**
   * Where the part is recorded: a policy question the bill was filed to
   * answer, a section of the bill's text, or a section an amendment would
   * add or rewrite.
   */
  readonly source: "filed-question" | "section" | "amendment-section";
  /** The section's record, for a section already in the bill. */
  readonly provisionId: EntityId | null;
  readonly provisionKey: string | null;
  readonly heading: string | null;
  /** The catalog question the part answers, and which way; null if none. */
  readonly answers: PropositionAnswerRef | null;
}

export interface VoteBundle {
  readonly voteId: EntityId;
  readonly measureId: EntityId;
  readonly kind: VoteQuestionKind;
  /** The bill's sections as they read when the question was put. */
  readonly sections: readonly LegislativeProvisionRecord[];
  /** The amendment put, for an amendment vote. */
  readonly amendment: LegislativeAmendmentRecord | null;
  /**
   * What a yea was a vote FOR. On a question about the bill, that is the
   * whole bill as it then read; on an amendment, it is the amendment's own
   * sections. A nay is a vote against the same parts.
   */
  readonly parts: readonly VoteBundlePart[];
}

/** The kind of question a vote put, read from its record and its rule pack. */
export function voteQuestionKind(
  world: World,
  vote: LegislativeVoteRecord,
): VoteQuestionKind {
  const purpose: string = vote.purpose;
  if (purpose === "constitutional-proposal") return "constitutional-proposal";
  if (vote.purpose !== "floor-stage") return vote.purpose;
  const measure = measureById(world, vote.measureId);
  if (!measure || vote.forum.kind !== "chamber" || !vote.floorStageKey)
    return "stage";
  try {
    const chamber = chamberByKey(
      rulePackById(measure.rulePackId),
      vote.forum.chamberKey,
    );
    return nextFloorStageKey(chamber, vote.floorStageKey) === null
      ? "passage"
      : "stage";
  } catch {
    // A pack that no longer carries the stage cannot say; an intermediate
    // stage is the reading that claims less.
    return "stage";
  }
}

/**
 * The sections of a measure as it read before the given history sequence:
 * every section recorded by then that no section recorded by then replaced.
 */
export function sectionsBefore(
  world: World,
  measureId: EntityId,
  sequence: number,
): readonly LegislativeProvisionRecord[] {
  const recorded = measureProvisions(world, measureId).filter(
    (record) => record.sequence < sequence,
  );
  const replaced = new Set(
    recorded.flatMap((record) =>
      record.supersedesProvisionId ? [record.supersedesProvisionId] : [],
    ),
  );
  // A section the executive struck with an item veto is out of the bill from
  // the signing on; every vote before the signing still read it.
  for (const veto of world.history.itemVetoes ?? [])
    if (veto.measureId === measureId && veto.dispositionSequence < sequence)
      replaced.add(veto.provisionId);
  return recorded
    .filter((record) => !replaced.has(record.id))
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
}

/**
 * Everything a question about the whole bill decided, as the bill read before
 * `sequence`: the questions it was filed to answer and each section's own
 * answer.
 */
export function billPartsBefore(
  world: World,
  measureId: EntityId,
  sequence: number,
): readonly VoteBundlePart[] {
  const measure = measureById(world, measureId);
  if (!measure) return [];
  const filed: VoteBundlePart[] = (measure.propositionAnswers ?? []).map(
    (row) => ({
      source: "filed-question",
      provisionId: null,
      provisionKey: null,
      heading: null,
      answers: { propositionId: row.propositionId, answer: row.answer },
    }),
  );
  const sections: VoteBundlePart[] = sectionsBefore(
    world,
    measureId,
    sequence,
  ).map((record) => ({
    source: "section",
    provisionId: record.id,
    provisionKey: record.provisionKey,
    heading: record.heading,
    answers: record.answers ?? null,
  }));
  return [...filed, ...sections];
}

function amendmentParts(
  world: World,
  amendment: LegislativeAmendmentRecord,
): readonly VoteBundlePart[] {
  if (amendment.proposedSections) {
    return amendment.proposedSections.map((section) => ({
      source: "amendment-section",
      provisionId: null,
      provisionKey: section.provisionKey,
      heading: section.heading,
      answers: section.answers ?? null,
    }));
  }
  // Offered by description only: what it carried in, if it was adopted. A
  // rejected amendment of that kind left no text, and the record says so by
  // having no parts rather than guessing at them.
  return (world.history.legislativeProvisions ?? [])
    .filter((record) => record.originAmendmentId === amendment.id)
    .map((record) => ({
      source: "amendment-section",
      provisionId: record.id,
      provisionKey: record.provisionKey,
      heading: record.heading,
      answers: record.answers ?? null,
    }));
}

/** What was on the table for one recorded vote. Read-only. */
export function voteBundle(
  world: World,
  vote: LegislativeVoteRecord,
): VoteBundle {
  const kind = voteQuestionKind(world, vote);
  const sections = sectionsBefore(world, vote.measureId, vote.sequence);
  if (kind === "amendment") {
    const amendment =
      (world.history.legislativeAmendments ?? []).find(
        (record) => record.voteId === vote.id,
      ) ?? null;
    return {
      voteId: vote.id,
      measureId: vote.measureId,
      kind,
      sections,
      amendment,
      parts: amendment ? amendmentParts(world, amendment) : [],
    };
  }
  return {
    voteId: vote.id,
    measureId: vote.measureId,
    kind,
    sections,
    amendment: null,
    parts: billPartsBefore(world, vote.measureId, vote.sequence),
  };
}

/** Where one member stood on one catalog question through one vote. */
export interface VotedStance {
  readonly propositionId: EntityId;
  readonly stance: "for" | "against";
  readonly part: VoteBundlePart;
}

/**
 * The catalog questions a member took a side on by casting this disposition
 * on this bundle. Only a yea or a nay takes a side; each part that answers a
 * question is a stance on that question.
 */
export function stancesFromVote(
  bundle: VoteBundle,
  disposition: LegislativeMemberDisposition,
): readonly VotedStance[] {
  if (disposition !== "yea" && disposition !== "nay") return [];
  const backed = disposition === "yea";
  return bundle.parts.flatMap((part) =>
    part.answers
      ? [
          {
            propositionId: part.answers.propositionId,
            stance:
              (part.answers.answer === "yes") === backed ? "for" : "against",
            part,
          },
        ]
      : [],
  );
}

/** A vote part read for one member and the electorate of the bill's place. */
export interface VoteReadingPart {
  readonly part: VoteBundlePart;
  readonly publicFace: ReturnType<typeof publicFaceOfPart>;
  readonly whoCares: ReturnType<typeof whoCaresAbout> | null;
  /** Null when this part names no catalog question or the member took no side. */
  readonly stance: "for" | "against" | null;
}

/**
 * Read a saved roll call as its public parts, local views and one member's
 * stance. This is a pure reconstruction from the vote bundle and existing
 * belief records; it creates no new history.
 */
export function voteReadingsOf(
  world: World,
  voteId: EntityId,
  personId: EntityId,
): readonly VoteReadingPart[] {
  const vote = (world.history.legislativeVotes ?? []).find(
    (row) => row.id === voteId,
  );
  if (!vote) return [];
  const disposition = vote.dispositions.find(
    (row) => row.personId === personId,
  )?.disposition;
  if (!disposition) return [];
  const bundle = voteBundle(world, vote);
  const measure = measureById(world, vote.measureId);
  const stanceByPart = new Map(
    stancesFromVote(bundle, disposition).map(({ part, stance }) => [
      part,
      stance,
    ]),
  );
  return bundle.parts.map((part) => {
    const publicFace = publicFaceOfPart(world, part);
    return {
      part,
      publicFace,
      whoCares:
        publicFace.propositionId && measure
          ? whoCaresAbout(
              world,
              publicFace.propositionId,
              measure.jurisdictionId,
              vote.takenAt,
            )
          : null,
      stance: stanceByPart.get(part) ?? null,
    };
  });
}

/**
 * Measures that carry at least one section answering a catalog question,
 * indexed once per provisions array. Almost no measure does, so the callers
 * on hot paths (law in force, a member's reasons) skip the section read for
 * every other measure.
 */
const answeringMeasures = new WeakMap<
  readonly LegislativeProvisionRecord[],
  ReadonlySet<EntityId>
>();

function measuresWithAnsweringSections(world: World): ReadonlySet<EntityId> {
  const provisions = world.history.legislativeProvisions;
  if (!provisions || provisions.length === 0) return new Set();
  let found = answeringMeasures.get(provisions);
  if (!found) {
    found = new Set(
      provisions.flatMap((record) =>
        record.answers ? [record.measureId] : [],
      ),
    );
    answeringMeasures.set(provisions, found);
  }
  return found;
}

/**
 * Every catalog question the bill answered as it read before `sequence`, one
 * answer per question. A section's answer governs over the answer the bill
 * was filed with, and a later section over an earlier one, because the text
 * is what becomes law. Omit `sequence` for the bill as it now reads.
 *
 * The voting record and the law in force count a filed answer only on a
 * question the bill also names; a member deciding a vote reads every filed
 * answer, as it did before sections carried answers (`filed: "all"`).
 */
export function measureAnswersAt(
  world: World,
  measureId: EntityId,
  sequence: number = world.history.nextSequence,
  filed: "named" | "all" = "named",
): readonly PropositionAnswerRef[] {
  const measure = measureById(world, measureId);
  if (!measure) return [];
  const byQuestion = new Map<EntityId, PropositionAnswerRef>();
  for (const row of measure.propositionAnswers ?? []) {
    if (
      filed === "named" &&
      !(measure.propositionIds ?? []).includes(row.propositionId)
    )
      continue;
    byQuestion.set(row.propositionId, {
      propositionId: row.propositionId,
      answer: row.answer,
    });
  }
  if (measuresWithAnsweringSections(world).has(measureId)) {
    for (const section of sectionsBefore(world, measureId, sequence)) {
      if (section.answers)
        byQuestion.set(section.answers.propositionId, { ...section.answers });
    }
  }
  return [...byQuestion.values()];
}
