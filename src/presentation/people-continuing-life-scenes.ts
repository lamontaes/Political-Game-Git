import { addDays, personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import { favorEntries } from "../simulation/life-favors";
import { describePersonContext } from "../simulation/person-context";
import { contactProposals } from "../simulation/people-contact";
import { competingCommitmentCases } from "../simulation/people-social-followthrough";
import { studyPeers } from "../simulation/people-study";
import {
  recordSceneBinding,
  sceneAlreadyBound,
} from "../simulation/scene-bindings";

function relationshipLabel(
  world: World,
  playerId: EntityId,
  otherId: EntityId,
): string | null {
  return describePersonContext(world, playerId, otherId)?.relationship ?? null;
}

/**
 * Where the continuing-life scenes come from (MUSE-PEOPLE presentation).
 *
 * One producer per follow-through situation, each binding exactly what the
 * record holds — a later request, a colliding arrangement, a reconnection
 * over a named memory, a repair attempt, an introduction or a weekly
 * rhythm — and each at most once per record. Where the world has none
 * of it, nothing is written. Called with the ordinary contextual refresh,
 * which runs when ordinary days actually pass.
 */

function bindFollowThrough(
  world: World,
  binding: Parameters<typeof recordSceneBinding>[1],
  log: string,
): World {
  return recordSceneBinding(world, binding, log);
}

/**
 * A peer's later request after shared work, and — later — the same ask raised
 * again when it was agreed and not done. The scene answers through the
 * family's own writers, because the bank's writers name their own picnic.
 */
function produceSharedWorkRequestScene(
  world: World,
  personId: EntityId,
): World {
  for (const entry of favorEntries(world, personId)) {
    if (
      !entry.request.tags.includes("followthrough.family:shared-work-request")
    ) {
      continue;
    }
    const raised = world.history.events.some(
      (event) =>
        event.type === "life.followthrough-raised" &&
        event.tags.includes(`followthrough.source:${entry.request.id}`),
    );
    const unanswered = !entry.response;
    const agreedUnperformed =
      entry.status === "agreed" && !entry.outcome && raised;
    if (!unanswered && !agreedUnperformed) continue;
    if (
      sceneAlreadyBound(
        world,
        personId,
        "favor",
        "shared-work-request",
        entry.request.id,
      )
    ) {
      continue;
    }
    const speaker = world.people[entry.counterpartId];
    if (!speaker) continue;
    const facts: Record<string, string> = {
      task: entry.details.task,
      opening: entry.details.opening,
      speakerGiven: speaker.givenName,
      requestEventId: entry.request.id,
      status: unanswered ? "asked" : "agreed",
    };
    if (entry.details.condition) facts.condition = entry.details.condition;
    if (entry.details.minutes !== null) {
      facts.minutes = String(entry.details.minutes);
    }
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "favor",
        variant: "shared-work-request",
        playerPersonId: personId,
        speakerPersonId: speaker.id,
        relationship: relationshipLabel(world, personId, speaker.id),
        place: "By phone",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: unanswered
          ? `Whether to ${entry.details.task}.`
          : `The ${entry.details.task} you said you would do.`,
        sourceEntityIds: [entry.request.id],
        facts,
        knownRecordIds: [entry.request.id],
        target: entry.details.task,
        date: null,
        expiresAt: addDays(world.currentDate, 30),
      },
      `${personName(speaker)} asked about the shared work.`,
    );
  }
  return world;
}

/**
 * An agreed arrangement that collides with something else owed. The scene is
 * the player's to open: ask to change it, or keep carrying both.
 */
function producePromiseRevisionScene(world: World, personId: EntityId): World {
  for (const casing of competingCommitmentCases(world, personId)) {
    if (
      sceneAlreadyBound(
        world,
        personId,
        "favor",
        "promise-revision",
        casing.requestId,
      )
    ) {
      continue;
    }
    const speaker = world.people[casing.counterpartId];
    if (!speaker) continue;
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "favor",
        variant: "promise-revision",
        playerPersonId: personId,
        speakerPersonId: speaker.id,
        relationship: relationshipLabel(world, personId, speaker.id),
        place: "By phone",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to ask ${personName(speaker)} to change the arrangement.`,
        sourceEntityIds: [casing.requestId],
        facts: {
          task: casing.task,
          competing: casing.competing,
          requestEventId: casing.requestId,
          speakerGiven: speaker.givenName,
        },
        knownRecordIds: [casing.requestId],
        target: casing.task,
        date: null,
        expiresAt: addDays(world.currentDate, 14),
      },
      `The arrangement with ${personName(speaker)} collides with something else owed.`,
    );
  }
  return world;
}

/**
 * A revised arrangement come due. Bound from the due record, answerable only
 * while the favour is still agreed and not done.
 */
function producePromiseDueScene(world: World, personId: EntityId): World {
  for (const event of world.history.events) {
    if (
      event.type !== "life.promise-comes-due" ||
      !event.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    const requestId = event.tags
      .find((tag) => tag.startsWith("followthrough.source:"))!
      .slice("followthrough.source:".length);
    const entry = favorEntries(world, personId).find(
      (candidate) => candidate.request.id === requestId,
    );
    if (!entry || entry.outcome || entry.status !== "agreed") continue;
    if (sceneAlreadyBound(world, personId, "favor", "promise-due", event.id)) {
      continue;
    }
    const speakerId = event.involvedEntityIds.find((id) => id !== personId)!;
    const speaker = world.people[speakerId];
    if (!speaker) continue;
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "favor",
        variant: "promise-due",
        playerPersonId: personId,
        speakerPersonId: speakerId,
        relationship: relationshipLabel(world, personId, speakerId),
        place: "By phone",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `The revised arrangement on ${entry.details.task}.`,
        sourceEntityIds: [event.id],
        facts: {
          task: entry.details.task,
          requestEventId: entry.request.id,
          speakerGiven: speaker.givenName,
        },
        knownRecordIds: [entry.request.id],
        target: entry.details.task,
        date: null,
        expiresAt: addDays(world.currentDate, 14),
      },
      `The revised arrangement on ${entry.details.task} came due.`,
    );
  }
  return world;
}

/**
 * A reconnection over a named memory. The proposal the NPC made is answered
 * here rather than in the generic meeting scene, so the scene can say what
 * the meeting is about.
 */
function produceReconnectScene(world: World, personId: EntityId): World {
  for (const marked of world.history.events) {
    if (
      marked.type !== "life.reconnect-raised" ||
      !marked.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    const proposalId = marked.tags
      .find((tag) => tag.startsWith("followthrough.proposal:"))!
      .slice("followthrough.proposal:".length);
    const proposal = contactProposals(world, personId).find(
      (candidate) =>
        candidate.eventId === proposalId &&
        !candidate.answered &&
        candidate.toPersonId === personId,
    );
    if (!proposal) continue;
    if (
      sceneAlreadyBound(world, personId, "favor", "reconnect", proposal.eventId)
    ) {
      continue;
    }
    const speaker = world.people[proposal.fromPersonId];
    if (!speaker) continue;
    const detail = marked.participants.find(
      (entry) => entry.role === "agency:actor",
    )?.detail;
    const memory =
      detail && detail.startsWith("Reached out about: ")
        ? detail.slice("Reached out about: ".length)
        : null;
    // Without the named memory there is no reconnection premise to bind.
    if (!memory) continue;
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "favor",
        variant: "reconnect",
        playerPersonId: personId,
        speakerPersonId: speaker.id,
        relationship: relationshipLabel(world, personId, speaker.id),
        place: "By phone",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to meet ${personName(speaker)} on ${proposal.on}.`,
        sourceEntityIds: [proposal.eventId],
        facts: {
          speakerGiven: speaker.givenName,
          purpose: proposal.purpose,
          memorySummary: memory,
          lastContactOn: marked.occurredAt,
        },
        knownRecordIds: [proposal.eventId],
        target: null,
        date: proposal.on,
        expiresAt: proposal.on,
      },
      `${personName(speaker)} reached out about ${memory}.`,
    );
  }
  return world;
}

/**
 * A repair attempt after a refusal. Bound from the offer with the refusal it
 * answers readable beside it; declined and accepted offers never rebind.
 */
function produceRepairScene(world: World, personId: EntityId): World {
  for (const offer of world.history.events) {
    if (
      offer.type !== "life.repair-offered" ||
      !offer.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    const answered = world.history.events.some(
      (event) =>
        (event.type === "life.repair-accepted" ||
          event.type === "life.repair-declined") &&
        event.tags.includes(`followthrough.answer:${offer.id}`),
    );
    if (answered) continue;
    if (
      sceneAlreadyBound(world, personId, "favor", "repair-attempt", offer.id)
    ) {
      continue;
    }
    const counterpartId = offer.involvedEntityIds.find(
      (id) => id !== personId,
    )!;
    const speaker = world.people[counterpartId];
    if (!speaker) continue;
    // The offer's summary is written in a fixed form — "<name> wants to
    // <offer>, after turning down <refused>." — so the scene can name both.
    const summary = offer.summary;
    const refusedSplit = summary.split(", after turning down ");
    const offerSplit = refusedSplit[0]?.split(" wants to ") ?? [];
    if (refusedSplit.length !== 2 || offerSplit.length !== 2) continue;
    const statement = offer.context.immediateReaction;
    if (!statement) continue;
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "favor",
        variant: "repair-attempt",
        playerPersonId: personId,
        speakerPersonId: counterpartId,
        relationship: relationshipLabel(world, personId, counterpartId),
        place: "By phone",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to let ${personName(speaker)} make amends.`,
        sourceEntityIds: [offer.id],
        facts: {
          speakerGiven: speaker.givenName,
          opening: statement,
          refusedSummary: refusedSplit[1]!,
          offerText: offerSplit[1]!,
          offerId: offer.id,
        },
        knownRecordIds: [offer.id],
        target: null,
        date: null,
        expiresAt: addDays(world.currentDate, 30),
      },
      `${personName(speaker)} wants to make amends.`,
    );
  }
  return world;
}

/**
 * An introduction offer naming a real third person for a real reason. Bound
 * while neither consent nor refusal is on record.
 */
function produceIntroductionScene(world: World, personId: EntityId): World {
  for (const offer of world.history.events) {
    if (
      offer.type !== "life.introduction-offered" ||
      !offer.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    const answered = world.history.events.some(
      (event) =>
        (event.type === "life.introduction-made" ||
          event.type === "life.introduction-declined" ||
          event.type === "life.introduction-offer-declined") &&
        event.tags.includes(`followthrough.answer:${offer.id}`),
    );
    if (answered) continue;
    if (sceneAlreadyBound(world, personId, "favor", "introduction", offer.id)) {
      continue;
    }
    const introducerId = offer.participants.find(
      (entry) => entry.role === "agency:actor",
    )?.personId;
    const thirdId = offer.participants.find(
      (entry) => entry.role === "other:named",
    )?.personId;
    const introducer = introducerId ? world.people[introducerId] : undefined;
    const third = thirdId ? world.people[thirdId] : undefined;
    if (!introducer || !introducerId || !third || !thirdId) continue;
    // The offer's summary is written in a fixed form — "<introducer> offered
    // to introduce <third>, because <reason>." — so the scene can name why.
    const reasonSplit = offer.summary.split(", because ");
    if (reasonSplit.length !== 2 || !reasonSplit[1]!.trim()) continue;
    const statement = offer.context.immediateReaction;
    if (!statement) continue;
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "favor",
        variant: "introduction",
        playerPersonId: personId,
        speakerPersonId: introducerId,
        relationship: relationshipLabel(world, personId, introducerId),
        place: "By phone",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to meet ${personName(third)}.`,
        sourceEntityIds: [offer.id],
        facts: {
          speakerGiven: introducer.givenName,
          opening: statement,
          thirdGiven: third.givenName,
          thirdId,
          reason: reasonSplit[1]!,
          offerId: offer.id,
        },
        knownRecordIds: [offer.id],
        target: null,
        date: null,
        expiresAt: addDays(world.currentDate, 30),
      },
      `${personName(introducer)} offered to introduce ${personName(third)}.`,
    );
  }
  return world;
}

/**
 * A weekly rhythm proposed or running. The offer binds once; each kept point
 * in the rhythm binds its own session scene against the latest marker, so a
 * session is never offered twice and a finished rhythm never reopens.
 */
function produceRecurringScene(world: World, personId: EntityId): World {
  for (const offer of world.history.events) {
    if (
      offer.type !== "life.collaboration-offered" ||
      !offer.involvedEntityIds.includes(personId) ||
      !offer.tags.includes("followthrough.collaboration:study-recurring")
    ) {
      continue;
    }
    const counterpartId = offer.involvedEntityIds.find(
      (id) => id !== personId,
    )!;
    const peer = world.people[counterpartId];
    if (!peer) continue;
    const answer = world.history.events.find(
      (event) =>
        (event.type === "life.collaboration-agreed" ||
          event.type === "life.collaboration-declined") &&
        event.tags.includes(`followthrough.answer:${offer.id}`),
    );
    if (!answer) {
      if (
        sceneAlreadyBound(world, personId, "study-plan", "recurring", offer.id)
      ) {
        continue;
      }
      const program =
        studyPeers(world, personId).find(
          (candidate) => candidate.personId === counterpartId,
        )?.programName ?? null;
      const facts: Record<string, string> = {
        peerGiven: peer.givenName,
        offerId: offer.id,
        opening: offer.context.immediateReaction ?? "",
      };
      if (program) facts.programName = program;
      return bindFollowThrough(
        world,
        {
          version: 1,
          family: "study-plan",
          variant: "recurring",
          playerPersonId: personId,
          speakerPersonId: counterpartId,
          relationship: relationshipLabel(world, personId, counterpartId),
          place: "After a class",
          jurisdictionId: world.people[personId]!.homeJurisdictionId,
          request: `Whether to meet every week for the coursework.`,
          sourceEntityIds: [offer.id],
          facts,
          knownRecordIds: [offer.id],
          target: null,
          date: null,
          expiresAt: addDays(world.currentDate, 30),
        },
        `${personName(peer)} proposed meeting every week.`,
      );
    }
    if (answer.type !== "life.collaboration-agreed") continue;
    const sourceTag = `followthrough.source:${answer.id}`;
    const finished = world.history.events.some(
      (event) =>
        (event.type === "life.collaboration-ended" ||
          event.type === "life.collaboration-established") &&
        event.tags.includes(sourceTag),
    );
    if (finished) continue;
    const sessions = world.history.events.filter(
      (event) =>
        event.type === "life.collaboration-session-kept" &&
        event.tags.includes(sourceTag),
    );
    if (sessions.length >= 3) continue;
    const markers = [answer, ...sessions].sort((left, right) =>
      left.occurredAt === right.occurredAt
        ? left.sequence - right.sequence
        : left.occurredAt < right.occurredAt
          ? -1
          : 1,
    );
    const latest = markers.at(-1)!;
    if (latest.occurredAt > addDays(world.currentDate, -6)) continue;
    if (
      sceneAlreadyBound(world, personId, "study-plan", "recurring", latest.id)
    ) {
      continue;
    }
    const program =
      studyPeers(world, personId).find(
        (candidate) => candidate.personId === counterpartId,
      )?.programName ?? null;
    const facts: Record<string, string> = {
      peerGiven: peer.givenName,
      agreedId: answer.id,
      sessionNumber: String(sessions.length + 1),
    };
    if (program) facts.programName = program;
    return bindFollowThrough(
      world,
      {
        version: 1,
        family: "study-plan",
        variant: "recurring",
        playerPersonId: personId,
        speakerPersonId: counterpartId,
        relationship: relationshipLabel(world, personId, counterpartId),
        place: "After a class",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to keep meeting every week for the coursework.`,
        sourceEntityIds: [latest.id],
        facts,
        knownRecordIds: [answer.id],
        target: null,
        date: null,
        expiresAt: addDays(world.currentDate, 14),
      },
      `The weekly session with ${personName(peer)} is due.`,
    );
  }
  return world;
}

export function produceContinuingLifeScenes(
  world: World,
  personId: EntityId,
): World {
  const next = world;
  for (const produce of [
    produceSharedWorkRequestScene,
    producePromiseRevisionScene,
    producePromiseDueScene,
    produceReconnectScene,
    produceRepairScene,
    produceIntroductionScene,
    produceRecurringScene,
  ]) {
    const bound = produce(next, personId);
    if (bound !== next) return bound;
  }
  return next;
}
