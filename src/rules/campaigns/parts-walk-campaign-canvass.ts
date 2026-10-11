// STOPGAP RULES3-CAM-009: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/campaign-canvass.ts :: walkCampaignCanvass.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/campaigns-kernels.json.

/** Legacy line 328: action.kind !== "outreach" */
export function walkCampaignCanvassRule1(facts: {
  readonly actionKind: string;
}) {
  return facts.actionKind !== "outreach";
}

/** Legacy line 332: row.id === action.scheduledActivityId */
export function walkCampaignCanvassRule2(facts: {
  readonly rowId: string;
  readonly actionScheduledActivityId: string;
}) {
  return facts.rowId === facts.actionScheduledActivityId;
}

/** Legacy line 334: Math.max(1, activity?.participantPersonIds.length ?? 1) */
export function walkCampaignCanvassRule3(facts: {
  readonly activityParticipantPersonIdsLength: number | undefined;
}) {
  return Math.max(1, facts.activityParticipantPersonIdsLength! ?? 1);
}

/** Legacy line 335: Math.floor((minutes * workers * CANVASS_DOORS_PER_HOUR) / 60) */
export function walkCampaignCanvassRule4(facts: {
  readonly minutes: number;
  readonly workers: number;
  readonly CANVASS_DOORS_PER_HOUR: number;
}) {
  return Math.floor(
    (facts.minutes * facts.workers * facts.CANVASS_DOORS_PER_HOUR) / 60,
  );
}

/** Legacy line 336: doors <= 0 */
export function walkCampaignCanvassRule5(facts: { readonly doors: number }) {
  return facts.doors <= 0;
}

/** Legacy line 339: planned.length === 0 */
export function walkCampaignCanvassRule6(facts: {
  readonly plannedLength: number;
}) {
  return facts.plannedLength === 0;
}

/** Legacy line 344: door.roster && door.householdId === null */
export function walkCampaignCanvassRule7(facts: {
  readonly doorRoster: unknown;
  readonly doorHouseholdId: string | null;
}) {
  return facts.doorRoster && facts.doorHouseholdId! === null;
}

/** Legacy line 358: contestIncumbentPersonId(world, campaign.contestId) ===     campaign.candidatePersonId */
export function walkCampaignCanvassRule8(facts: {
  readonly contestIncumbentPersonIdWorldCampaignContestId: string | null;
  readonly campaignCandidatePersonId: string;
}) {
  return (
    facts.contestIncumbentPersonIdWorldCampaignContestId! ===
    facts.campaignCandidatePersonId
  );
}

/** Legacy line 364: Math.floor((index * minutes) / planned.length) */
export function walkCampaignCanvassRule9(facts: {
  readonly index: number;
  readonly minutes: number;
  readonly plannedLength: number;
}) {
  return Math.floor((facts.index * facts.minutes) / facts.plannedLength);
}

/** Legacy line 367: door.householdId ??       (door.roster         ? rosterHouseholdId(scratch, door.roster.town, door.roster.index)         : null) */
export function walkCampaignCanvassRule10(facts: {
  readonly doorHouseholdId: string | null;
  readonly doorRoster: unknown;
  readonly rosterHouseholdIdScratchDoorRosterTownDoorRosterIndex: string | null;
}) {
  return (
    facts.doorHouseholdId! ??
    (facts.doorRoster
      ? facts.rosterHouseholdIdScratchDoorRosterTownDoorRosterIndex!
      : null)
  );
}

/** Legacy line 371: householdId       ? peopleInHouseholdAt(scratch, householdId)       : [] */
export function walkCampaignCanvassRule11(facts: {
  readonly householdId: string | null;
  readonly peopleInHouseholdAtScratchHouseholdId: unknown[];
}) {
  return facts.householdId! ? facts.peopleInHouseholdAtScratchHouseholdId : [];
}

/** Legacy line 377: personId === campaign.candidatePersonId ||         ageOnDate(scratch.people[personId]!.birthDate, knockedAt.date) <           CANVASS_MINIMUM_AGE ||         !isPersonAliveAt(scratch, personId, {           ...cutoff,           asOfDate: knockedAt.date */
export function walkCampaignCanvassRule12(facts: {
  readonly personId: string;
  readonly campaignCandidatePersonId: string;
  readonly ageOnDateScratchPeoplePersonIdBirthDateKnockedAtDate: number;
  readonly CANVASS_MINIMUM_AGE: number;
  readonly isPersonAliveAtScratchPersonIdCutoffAsOfDateKnockedAtDate: boolean;
  readonly whereaboutsAtScratchPersonIdKnockedAtKind: string;
}) {
  return (
    facts.personId === facts.campaignCandidatePersonId ||
    facts.ageOnDateScratchPeoplePersonIdBirthDateKnockedAtDate <
      facts.CANVASS_MINIMUM_AGE ||
    !facts.isPersonAliveAtScratchPersonIdCutoffAsOfDateKnockedAtDate ||
    facts.whereaboutsAtScratchPersonIdKnockedAtKind !== "home"
  );
}

/** Legacy line 389: !residentComesToTheDoor(           scratch,           personId,           campaign.candidatePersonId,           key,         ) */
export function walkCampaignCanvassRule13(facts: {
  readonly residentComesToTheDoorScratchPersonIdCampaignCandidatePersonIdKey: boolean;
}) {
  return !facts.residentComesToTheDoorScratchPersonIdCampaignCandidatePersonIdKey;
}

/** Legacy line 403: !written && door.roster             ? {                 town: door.roster.town,                 household: door.roster.index,                 member: rosterMemberOf(scratch, door.roster, personId),               }             : null */
export function walkCampaignCanvassRule14(facts: {
  readonly written: boolean;
  readonly doorRoster: unknown;
  readonly townDoorRosterTownHouseholdDoorRosterIndexMemberRosterMember: unknown;
}) {
  return !facts.written && facts.doorRoster
    ? facts.townDoorRosterTownHouseholdDoorRosterIndexMemberRosterMember
    : null;
}

/** Legacy line 411: majorPartyOf(scratch, personId, knockedAt.date) !== null */
export function walkCampaignCanvassRule15(facts: {
  readonly majorPartyOfScratchPersonIdKnockedAtDate: string | null;
}) {
  return facts.majorPartyOfScratchPersonIdKnockedAtDate! !== null;
}
