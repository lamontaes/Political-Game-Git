import {
  PARTY_QUESTIONS,
  adoptPartyInitiative,
  partyBodyMembers,
  partyEvolutionRecords,
  partyRecords,
  partyUnit,
  partyUnitLeaders,
  personName,
  proposePartyInitiative,
  recordPartyBodyDecision,
  respondToPartyInitiative,
} from "../simulation";
import type {
  EntityId,
  PartyActorAuthority,
  PartyInitiativeKind,
  PartyInitiativeRecord,
  PartyInitiativeResponseKind,
  PartyUnitLevel,
  World,
} from "../simulation";
import { proseDate } from "./prose-dates";

/**
 * WORLD46 adapter for UI: party initiatives the controlled person can see and
 * act on. Pure projection plus commands that each return a new World. Only
 * public facts and the player's own choices are shown; nobody's private
 * reasons are.
 */
export type PartyInitiativeStage = "open" | "adopted";

export type PartyInitiativeAction =
  | {
      readonly kind: "respond";
      readonly response: PartyInitiativeResponseKind;
      readonly label: string;
      readonly authority: PartyActorAuthority;
      readonly actingForOrganizationId: EntityId | null;
    }
  | { readonly kind: "adopt"; readonly label: string };

export interface PartyInitiativeItem {
  readonly id: EntityId;
  readonly title: string;
  readonly stage: PartyInitiativeStage;
  readonly proposedOnLabel: string;
  readonly adoptedOnLabel: string | null;
  readonly proposerName: string;
  readonly actions: readonly PartyInitiativeAction[];
}

const KIND_TITLES: Readonly<
  Record<PartyInitiativeKind, (name: string, subject: string) => string>
> = {
  founding: (name) => `Proposal to form ${name}`,
  split: (name, subject) => `Proposal to leave ${subject} and form ${name}`,
  merger: (_, subject) => `Proposal to merge ${subject}`,
  rename: (name, subject) => `Proposal to rename ${subject} as ${name}`,
  "platform-change": (_, subject) =>
    `Proposal to change the platform of ${subject}`,
  dissolution: (_, subject) => `Proposal to dissolve ${subject}`,
};

function actionsFor(
  world: World,
  initiative: PartyInitiativeRecord,
  personId: EntityId,
  adopted: boolean,
): PartyInitiativeAction[] {
  if (adopted) return [];
  const answered = partyRecords(world).filter(
    (record) =>
      record.kind === "party-initiative-response" &&
      record.initiativeId === initiative.id &&
      record.personId === personId,
  );
  const actions: PartyInitiativeAction[] = [];
  if (initiative.proposerPersonId === personId) {
    actions.push({ kind: "adopt", label: "Put it to a decision" });
    return actions;
  }
  if (answered.length > 0) return actions;
  const subject = initiative.subjectOrganizationIds;
  switch (initiative.initiativeKind) {
    case "founding":
      actions.push(
        {
          kind: "respond",
          response: "consent",
          label: "Join as an organizer",
          authority: "co-organizer",
          actingForOrganizationId: null,
        },
        {
          kind: "respond",
          response: "decline",
          label: "Decline",
          authority: "co-organizer",
          actingForOrganizationId: null,
        },
      );
      break;
    case "split":
      if (
        subject[0] &&
        partyBodyMembers(world, subject[0]).includes(personId)
      ) {
        actions.push(
          {
            kind: "respond",
            response: "elect-to-leave",
            label: "Leave with them",
            authority: "faction-member",
            actingForOrganizationId: null,
          },
          {
            kind: "respond",
            response: "remain",
            label: "Stay",
            authority: "faction-member",
            actingForOrganizationId: null,
          },
        );
      }
      break;
    default:
      for (const organizationId of subject) {
        if (!partyUnitLeaders(world, organizationId).includes(personId))
          continue;
        actions.push(
          {
            kind: "respond",
            response: "accept",
            label: "Accept for the organization",
            authority: "authorized-leader",
            actingForOrganizationId: organizationId,
          },
          {
            kind: "respond",
            response: "reject",
            label: "Reject for the organization",
            authority: "authorized-leader",
            actingForOrganizationId: organizationId,
          },
        );
      }
  }
  return actions;
}

export function projectPartyInitiatives(
  world: World,
  personId: EntityId,
): readonly PartyInitiativeItem[] {
  const evolutions = partyEvolutionRecords(world);
  return partyRecords(world)
    .filter(
      (record): record is PartyInitiativeRecord =>
        record.kind === "party-initiative",
    )
    .flatMap((initiative) => {
      const evolution = evolutions.find(
        (record) => record.initiativeId === initiative.id,
      );
      const involved =
        initiative.proposerPersonId === personId ||
        initiative.subjectOrganizationIds.some(
          (id) =>
            partyBodyMembers(world, id).includes(personId) ||
            partyUnitLeaders(world, id).includes(personId),
        ) ||
        partyRecords(world).some(
          (record) =>
            record.kind === "party-initiative-response" &&
            record.initiativeId === initiative.id &&
            record.personId === personId,
        );
      // Others' open proposals are private until decided; decided ones are public.
      if (!involved && !evolution) return [];
      const subject =
        initiative.subjectOrganizationIds
          .map((id) => partyUnit(world, id)?.name ?? "the organization")
          .join(" and ") || "a new organization";
      const proposer = world.people[initiative.proposerPersonId];
      return [
        {
          id: initiative.id,
          title: KIND_TITLES[initiative.initiativeKind](
            initiative.proposedName ?? "a new organization",
            subject,
          ),
          stage: evolution ? ("adopted" as const) : ("open" as const),
          proposedOnLabel: proseDate(initiative.recordedAt),
          adoptedOnLabel: evolution ? proseDate(evolution.effectiveDate) : null,
          proposerName: proposer ? personName(proposer) : "Someone",
          actions: actionsFor(world, initiative, personId, !!evolution),
        },
      ];
    });
}

/** The controlled person proposes forming a new organization. */
export function proposeNewParty(
  world: World,
  personId: EntityId,
  input: {
    readonly name: string;
    readonly level: PartyUnitLevel;
    readonly jurisdictionId: EntityId | null;
  },
): World {
  return proposePartyInitiative(world, {
    initiativeKind: "founding",
    proposerPersonId: personId,
    subjectOrganizationIds: [],
    proposedName: input.name,
    level: input.level,
    jurisdictionId: input.jurisdictionId,
  }).world;
}

export function takePartyInitiativeAction(
  world: World,
  personId: EntityId,
  initiativeId: EntityId,
  action: PartyInitiativeAction,
): World {
  if (action.kind === "adopt")
    return adoptPartyInitiative(world, initiativeId).world;
  return respondToPartyInitiative(world, {
    initiativeId,
    personId,
    response: action.response,
    authority: action.authority,
    actingForOrganizationId: action.actingForOrganizationId,
  });
}

/** Bodies the controlled person sits on, with the questions they can decide. */
export function projectPartyBodyQuestions(world: World, personId: EntityId) {
  return partyRecords(world)
    .flatMap((record) =>
      record.kind === "party-unit" ? [record.organizationId] : [],
    )
    .concat(
      world.history.organizations
        .filter((organization) =>
          organization.stableKey.includes(":chapter:home:"),
        )
        .map((organization) => organization.id),
    )
    .filter((id, index, all) => all.indexOf(id) === index)
    .filter((id) => partyBodyMembers(world, id).includes(personId))
    .map((organizationId) => ({
      organizationId,
      name: partyUnit(world, organizationId)?.name ?? "Party organization",
      questions: PARTY_QUESTIONS.map((question) => ({
        key: question.key,
        label: question.label,
        options: question.options.map((option) => ({
          key: option.key,
          label: option.label,
        })),
      })),
    }));
}

/** The controlled person takes part in a body decision with their own choice. */
export function decideInPartyBody(
  world: World,
  organizationId: EntityId,
  questionKey: string,
  optionKey: string,
): World {
  return recordPartyBodyDecision(world, {
    organizationId,
    questionKey,
    controlledChoice: optionKey,
  });
}
