// STOPGAP RULES3-GOV-021: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: sampleEpidemicWeek.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 984: -U.immunityDays */
export function sampleEpidemicWeekRule1(facts: {
  readonly UImmunityDays: number;
}) {
  return -facts.UImmunityDays;
}

/** Legacy line 987: !person || person.birthDate > date */
export function sampleEpidemicWeekRule2(facts: {
  readonly person: unknown;
  readonly personBirthDate: string;
  readonly date: string;
}) {
  return !facts.person || facts.personBirthDate > facts.date;
}

/** Legacy line 988: !isLocalPlace(person.homeJurisdictionId) */
export function sampleEpidemicWeekRule3(facts: {
  readonly isLocalPlacePersonHomeJurisdictionId: boolean;
}) {
  return !facts.isLocalPlacePersonHomeJurisdictionId;
}

/** Legacy line 990: last && last.onsetAt >= immuneFrom */
export function sampleEpidemicWeekRule4(facts: {
  readonly last: unknown;
  readonly lastOnsetAt: string;
  readonly immuneFrom: string;
}) {
  return facts.last && facts.lastOnsetAt >= facts.immuneFrom;
}

/** Legacy line 995: found.onsetAt >= addDays(date, -U.passDays) &&       found.onsetAt < date &&       isPersonAliveAt(world, found.personId, cutoff) */
export function sampleEpidemicWeekRule5(facts: {
  readonly foundOnsetAt: string;
  readonly addDaysDateUPassDays: string;
  readonly date: string;
  readonly isPersonAliveAtWorldFoundPersonIdCutoff: boolean;
}) {
  return (
    facts.foundOnsetAt >= facts.addDaysDateUPassDays &&
    facts.foundOnsetAt < facts.date &&
    facts.isPersonAliveAtWorldFoundPersonIdCutoff
  );
}

/** Legacy line 995: -U.passDays */
export function sampleEpidemicWeekRule6(facts: { readonly UPassDays: number }) {
  return -facts.UPassDays;
}

/** Legacy line 1011: !susceptible(contact.personId) */
export function sampleEpidemicWeekRule7(facts: {
  readonly susceptibleContactPersonId: boolean;
}) {
  return !facts.susceptibleContactPersonId;
}

/** Legacy line 1014: !found */
export function sampleEpidemicWeekRule8(facts: { readonly found: unknown }) {
  return !facts.found;
}

/** Legacy line 1021: found.total += weight */
export function sampleEpidemicWeekRule9(facts: {
  readonly foundTotal: number;
  readonly weight: number;
}) {
  return facts.foundTotal + facts.weight;
}

/** Legacy line 1022: weight > found.strongest.weight */
export function sampleEpidemicWeekRule10(facts: {
  readonly weight: number;
  readonly foundStrongestWeight: number;
}) {
  return facts.weight > facts.foundStrongestWeight;
}

/** Legacy line 1029: exposure.total * susceptibility(world, personId, alreadyIll) <       U.catchAt */
export function sampleEpidemicWeekRule11(facts: {
  readonly exposureTotal: number;
  readonly susceptibilityWorldPersonIdAlreadyIll: number;
  readonly UCatchAt: number;
}) {
  return (
    facts.exposureTotal * facts.susceptibilityWorldPersonIdAlreadyIll <
    facts.UCatchAt
  );
}

/** Legacy line 1042: U.outsideExposurePerContact * epidemicSeasonOn(date) */
export function sampleEpidemicWeekRule12(facts: {
  readonly UOutsideExposurePerContact: number;
  readonly epidemicSeasonOnDate: number;
}) {
  return facts.UOutsideExposurePerContact * facts.epidemicSeasonOnDate;
}

/** Legacy line 1052: !susceptible(personId) */
export function sampleEpidemicWeekRule13(facts: {
  readonly susceptiblePersonId: boolean;
}) {
  return !facts.susceptiblePersonId;
}

/** Legacy line 1054: contact.setting !== "household" */
export function sampleEpidemicWeekRule14(facts: {
  readonly contactSetting: string;
}) {
  return facts.contactSetting !== "household";
}

/** Legacy line 1057: outside * seen * susceptibility(world, personId, alreadyIll) */
export function sampleEpidemicWeekRule15(facts: {
  readonly outside: number;
  readonly seen: number;
  readonly susceptibilityWorldPersonIdAlreadyIll: number;
}) {
  return (
    facts.outside * facts.seen * facts.susceptibilityWorldPersonIdAlreadyIll
  );
}

/** Legacy line 1058: level < U.catchAt */
export function sampleEpidemicWeekRule16(facts: {
  readonly level: number;
  readonly UCatchAt: number;
}) {
  return facts.level < facts.UCatchAt;
}

/** Legacy line 1059: !best || level > best.level */
export function sampleEpidemicWeekRule17(facts: {
  readonly best: unknown;
  readonly level: number;
  readonly bestLevel: number;
}) {
  return !facts.best || facts.level > facts.bestLevel;
}

/** Legacy line 1061: !best */
export function sampleEpidemicWeekRule18(facts: { readonly best: unknown }) {
  return !facts.best;
}
