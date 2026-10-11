// STOPGAP RULES3-GOV-042: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/office-consequence.ts :: playerOfficeScope.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 505: office.holderPersonId === personId */
export function playerOfficeScopeRule1(facts: {
  readonly officeHolderPersonId: string;
  readonly personId: string;
}) {
  return facts.officeHolderPersonId === facts.personId;
}

/** Legacy line 511: office.programOffice?.kind === "municipal"           ? jurisdictionLevel === "county"             ? "county"             : "town"           : office.programOffice?.kind === "federal-executive"             ? "federal-executive"             : "state-ex */
export function playerOfficeScopeRule2(facts: {
  readonly officeProgramOfficeKind: string | undefined;
  readonly jurisdictionLevel: string | null;
}) {
  return facts.officeProgramOfficeKind! === "municipal"
    ? facts.jurisdictionLevel! === "county"
      ? "county"
      : "town"
    : facts.officeProgramOfficeKind! === "federal-executive"
      ? "federal-executive"
      : "state-executive";
}

/** Legacy line 526: president?.personId === personId */
export function playerOfficeScopeRule3(facts: {
  readonly presidentPersonId: string | undefined;
  readonly personId: string;
}) {
  return facts.presidentPersonId! === facts.personId;
}

/** Legacy line 534: congress ? [congress.house, congress.senate] : [] */
export function playerOfficeScopeRule4(facts: {
  readonly congress: unknown;
  readonly congressHouseCongressSenate: unknown[];
}) {
  return facts.congress ? facts.congressHouseCongressSenate : [];
}

/** Legacy line 537: seat.occupant.kind === "member" &&         seat.occupant.member.personId === personId */
export function playerOfficeScopeRule5(facts: {
  readonly seatOccupantKind: string;
  readonly seatOccupantMemberPersonId: string;
  readonly personId: string;
}) {
  return (
    facts.seatOccupantKind === "member" &&
    facts.seatOccupantMemberPersonId === facts.personId
  );
}

/** Legacy line 541: candidate.seatKey === seat.seatKey */
export function playerOfficeScopeRule6(facts: {
  readonly candidateSeatKey: string;
  readonly seatSeatKey: string;
}) {
  return facts.candidateSeatKey === facts.seatSeatKey;
}

/** Legacy line 545: known ? congressSeatTitle(known) : seat.seatKey */
export function playerOfficeScopeRule7(facts: {
  readonly known: unknown;
  readonly congressSeatTitleKnown: string;
  readonly seatSeatKey: string;
}) {
  return facts.known ? facts.congressSeatTitleKnown : facts.seatSeatKey;
}

/** Legacy line 553: !title || !officeKey */
export function playerOfficeScopeRule8(facts: {
  readonly title: string;
  readonly officeKey: string;
}) {
  return !facts.title || !facts.officeKey;
}

/** Legacy line 555: OFFICE_EMPLOYMENT_KINDS.includes(entry.relationship.kind) ||       entry.relationship.kind.startsWith("office:") */
export function playerOfficeScopeRule9(facts: {
  readonly OFFICE_EMPLOYMENT_KINDSIncludesEntryRelationshipKind: boolean;
  readonly entryRelationshipKindStartsWithOffice: boolean;
}) {
  return (
    facts.OFFICE_EMPLOYMENT_KINDSIncludesEntryRelationshipKind ||
    facts.entryRelationshipKindStartsWithOffice
  );
}

/** Legacy line 565: !level */
export function playerOfficeScopeRule10(facts: {
  readonly level: string | null;
}) {
  return !facts.level!;
}
