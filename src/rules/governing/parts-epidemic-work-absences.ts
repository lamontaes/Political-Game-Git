// STOPGAP RULES3-GOV-024: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/epidemic.ts :: epidemicWorkAbsences.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1306: map.get(personId) ?? new Set<IsoDate>() */
export function epidemicWorkAbsencesRule1(facts: {
  readonly mapGetPersonId: unknown;
  readonly newSetIsoDate: unknown;
}) {
  return facts.mapGetPersonId ?? facts.newSetIsoDate;
}

/** Legacy line 1307: offset < days */
export function epidemicWorkAbsencesRule2(facts: {
  readonly offset: number;
  readonly days: number;
}) {
  return facts.offset < facts.days;
}

/** Legacy line 1307: offset += 1 */
export function epidemicWorkAbsencesRule3(facts: { readonly offset: number }) {
  return facts.offset + 1;
}

/** Legacy line 1309: day >= from && day <= to && isWorkday(day) */
export function epidemicWorkAbsencesRule4(facts: {
  readonly day: string;
  readonly from: string;
  readonly to: string;
  readonly isWorkdayDay: boolean;
}) {
  return facts.day >= facts.from && facts.day <= facts.to && facts.isWorkdayDay;
}

/** Legacy line 1315: found.onsetAt > to || addDays(found.onsetAt, days) < from */
export function epidemicWorkAbsencesRule5(facts: {
  readonly foundOnsetAt: string;
  readonly to: string;
  readonly addDaysFoundOnsetAtDays: string;
  readonly from: string;
}) {
  return (
    facts.foundOnsetAt > facts.to || facts.addDaysFoundOnsetAtDays < facts.from
  );
}

/** Legacy line 1317: !person */
export function epidemicWorkAbsencesRule6(facts: { readonly person: unknown }) {
  return !facts.person;
}

/** Legacy line 1318: found.episode.severity === "serious" */
export function epidemicWorkAbsencesRule7(facts: {
  readonly foundEpisodeSeverity: string;
}) {
  return facts.foundEpisodeSeverity === "serious";
}

/** Legacy line 1321: seriousOwn.get(found.personId) ?? new Map<IsoDate, number>() */
export function epidemicWorkAbsencesRule8(facts: {
  readonly seriousOwnGetFoundPersonId: unknown;
  readonly newMapIsoDateNumber: unknown;
}) {
  return facts.seriousOwnGetFoundPersonId ?? facts.newMapIsoDateNumber;
}

/** Legacy line 1322: offset < days */
export function epidemicWorkAbsencesRule9(facts: {
  readonly offset: number;
  readonly days: number;
}) {
  return facts.offset < facts.days;
}

/** Legacy line 1322: offset += 1 */
export function epidemicWorkAbsencesRule10(facts: { readonly offset: number }) {
  return facts.offset + 1;
}

/** Legacy line 1324: day >= from && day <= to && isWorkday(day) */
export function epidemicWorkAbsencesRule11(facts: {
  readonly day: string;
  readonly from: string;
  readonly to: string;
  readonly isWorkdayDay: boolean;
}) {
  return facts.day >= facts.from && facts.day <= facts.to && facts.isWorkdayDay;
}

/** Legacy line 1328: ageOnDate(person.birthDate, found.onsetAt) < U.careAgeUnder */
export function epidemicWorkAbsencesRule12(facts: {
  readonly ageOnDatePersonBirthDateFoundOnsetAt: number;
  readonly UCareAgeUnder: number;
}) {
  return facts.ageOnDatePersonBirthDateFoundOnsetAt < facts.UCareAgeUnder;
}

/** Legacy line 1338: sick.get(personId) ?? new Set<IsoDate>() */
export function epidemicWorkAbsencesRule13(facts: {
  readonly sickGetPersonId: unknown;
  readonly newSetIsoDate: unknown;
}) {
  return facts.sickGetPersonId ?? facts.newSetIsoDate;
}

/** Legacy line 1339: caring.get(personId) ?? new Set<IsoDate>() */
export function epidemicWorkAbsencesRule14(facts: {
  readonly caringGetPersonId: unknown;
  readonly newSetIsoDate: unknown;
}) {
  return facts.caringGetPersonId ?? facts.newSetIsoDate;
}

/** Legacy line 1341: missed === 0 */
export function epidemicWorkAbsencesRule15(facts: { readonly missed: number }) {
  return facts.missed === 0;
}

/** Legacy line 1347: seriousOwn.get(personId)?.values() ?? [] */
export function epidemicWorkAbsencesRule16(facts: {
  readonly seriousOwnGetPersonIdValues: unknown;
}) {
  return facts.seriousOwnGetPersonIdValues ?? [];
}

/** Legacy line 1348: a - b */
export function epidemicWorkAbsencesRule17(facts: {
  readonly a: number;
  readonly b: number;
}) {
  return facts.a - facts.b;
}

/** Legacy line 1349: seriousCaring.get(personId)?.size ?? 0 */
export function epidemicWorkAbsencesRule18(facts: {
  readonly seriousCaringGetPersonIdSize: number | undefined;
}) {
  return facts.seriousCaringGetPersonIdSize! ?? 0;
}
