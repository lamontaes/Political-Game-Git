import { addDays, makeIsoDate } from "../dates";
import { addYears } from "../legislation-drafting";
import { fiscalYearContaining } from "../public-budgets/fiscal";
import { introduceMeasure } from "../legislation";
import {
  currentMeasureProvisions,
  recordFiledProvision,
} from "../legislative-politics";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { defaultOriginChamber } from "../legislature-rules";
import { nextMeasureNumbering } from "../measure-numbering";
import { BUDGET_PROGRAMS, publicBudgetFor } from "../public-budgets/store";
import { seatedChamberForPack } from "./chamber-votes";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import type { EntityId, IsoDate, World } from "../types";

export const CURRENT_SERVICES_BUDGET_VERSION = "current-services-budget/v1";

/** The existing annual program identities, never legislation-family guesses. */
export function budgetProgramProvisionKey(
  program: string,
  fiscalYear: number,
): string {
  return `budget-${fiscalYear}-${program.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:amount-provided`;
}

/** Copy the actual currently adopted annual lines, not monthly outturn or cash. */
export function adoptedCurrentServicesLines(
  world: World,
  jurisdictionId: EntityId,
) {
  const government = publicBudgetFor(world, jurisdictionId);
  if (!government || government.level !== "state") return null;
  const adopted = [...government.years]
    .reverse()
    .find(
      (year) =>
        year.adoptedOn <= world.currentDate &&
        year.startsOn <= world.currentDate &&
        year.endsOn >= world.currentDate,
    );
  if (!adopted || adopted.appropriations.length !== BUDGET_PROGRAMS.length)
    return null;
  const lines = BUDGET_PROGRAMS.map((program, index) => ({
    program,
    provisionKey: budgetProgramProvisionKey(program, adopted.fiscalYear),
    annualMinorUnits: adopted.appropriations[index]! * 100,
  }));
  if (
    lines.some(
      (line) =>
        !Number.isSafeInteger(line.annualMinorUnits) ||
        line.annualMinorUnits < 0,
    )
  )
    return null;
  return { government, adopted, lines };
}

/** The first year's saved dates survive; a biennium adds its next fiscal year. */
export function currentServicesBudgetFiscalWindow(
  world: World,
  jurisdictionId: EntityId,
) {
  const source = adoptedCurrentServicesLines(world, jurisdictionId);
  if (!source || !source.government.budgetCycle) return null;
  return {
    startsOn: source.adopted.startsOn,
    endsOn:
      source.government.budgetCycle === "biennial"
        ? fiscalYearContaining(
            addDays(source.adopted.endsOn, 1),
            source.government.fiscalYearStart,
          ).endsOn
        : source.adopted.endsOn,
  };
}

/** Match the existing matter key and the saved intake outcome, not just its holder. */
export function budgetRequestMatchesIntake(
  world: World,
  input: {
    readonly matterId: EntityId;
    readonly officeKey: string;
    readonly termId: string;
    readonly intakeKey: string;
  },
): boolean {
  const matter = world.history.events.find(
    (event) => event.id === input.matterId,
  );
  return (
    matter?.type === "governing.matter-opened" &&
    matter.stableKey ===
      `state-governing/v1:${input.officeKey}:${input.termId}:budget:session-budget:${input.intakeKey}` &&
    world.history.events.some(
      (event) =>
        event.type === "governing.outcome" &&
        event.jurisdictionId === matter.jurisdictionId &&
        event.recordedAt <= world.currentDate &&
        event.tags.includes("matter-family:budget") &&
        event.tags.includes(`office:${input.officeKey}`) &&
        event.tags.includes(`matter:${matter.id}`) &&
        event.tags.includes(`budget-intake:${input.intakeKey}`),
    )
  );
}

/**
 * A source-backed executive request uses the existing introduction/provision
 * writers. The caller supplies its declared fiscal window; no date or amount
 * is drawn here. Institution scheduling remains with the existing caller.
 */
export function recordCurrentServicesBudgetDraft(
  world: World,
  input: {
    readonly jurisdictionId: EntityId;
    readonly governorPersonId: EntityId;
    readonly requestEventId: EntityId;
    readonly intakeKey: string;
    readonly fiscalWindow: {
      readonly startsOn: IsoDate;
      readonly endsOn: IsoDate;
    };
  },
): { readonly world: World; readonly measureId: EntityId } | null {
  const request = world.history.events.find(
    (event) => event.id === input.requestEventId,
  );
  const matterId = request?.tags
    .find((tag) => tag.startsWith("matter:"))
    ?.slice("matter:".length);
  const matter = world.history.events.find((event) => event.id === matterId);
  const officeKey = request?.tags
    .find((tag) => tag.startsWith("office:"))
    ?.slice("office:".length);
  const holder = currentStateExecutiveHolders(world).find(
    (holder) =>
      holder.officeKey === officeKey &&
      holder.personId === input.governorPersonId,
  );
  if (
    !request ||
    request.type !== "governing.matter-decided" ||
    !request.tags.includes("matter-family:budget") ||
    !request.tags.includes("choice:budget:hold-flat") ||
    request.jurisdictionId !== input.jurisdictionId ||
    request.recordedAt > world.currentDate ||
    !holder ||
    !matterId ||
    !budgetRequestMatchesIntake(world, {
      matterId: matter!.id,
      officeKey: holder.officeKey,
      termId: holder.termId,
      intakeKey: input.intakeKey,
    }) ||
    !matter?.participants.some(
      (participant) =>
        participant.role === "agency:officeholder" &&
        participant.personId === input.governorPersonId,
    )
  )
    return null;
  const source = adoptedCurrentServicesLines(world, input.jurisdictionId);
  const pack = legislativePackForJurisdiction(input.jurisdictionId);
  if (
    !source ||
    !pack ||
    input.fiscalWindow.startsOn > input.fiscalWindow.endsOn ||
    input.fiscalWindow.endsOn < world.currentDate
  )
    return null;
  makeIsoDate(input.fiscalWindow.startsOn);
  makeIsoDate(input.fiscalWindow.endsOn);
  const periods = [];
  for (
    let start = input.fiscalWindow.startsOn;
    start <= input.fiscalWindow.endsOn;
  ) {
    const period = fiscalYearContaining(
      start,
      source.government.fiscalYearStart,
    );
    if (period.startsOn !== start || period.endsOn > input.fiscalWindow.endsOn)
      return null;
    periods.push(period);
    start = addDays(period.endsOn, 1);
  }
  if (!periods.length || periods.at(-1)!.endsOn !== input.fiscalWindow.endsOn)
    return null;
  if (
    (source.government.budgetCycle === "annual" && periods.length !== 1) ||
    (source.government.budgetCycle === "biennial" && periods.length !== 2) ||
    source.government.budgetCycle === null
  )
    return null;
  const mostRecent = [...source.government.years]
    .filter((year) => year.adoptedOn <= world.currentDate)
    .sort(
      (left, right) =>
        right.adoptedOn.localeCompare(left.adoptedOn) ||
        right.fiscalYear - left.fiscalYear,
    )[0];
  const yearlyLines = periods.map((period, index) => {
    const ownAdoption = source.government.years.find(
      (year) =>
        year.fiscalYear === period.fiscalYear &&
        year.adoptedOn <= world.currentDate,
    );
    // CTO 4:51: only an absent SECOND year carries the latest adoption flat.
    const adopted = ownAdoption ?? (index === 1 ? mostRecent : undefined);
    if (!adopted || adopted.appropriations.length !== BUDGET_PROGRAMS.length)
      return null;
    const lines = BUDGET_PROGRAMS.map((program, index) => ({
      program,
      provisionKey: budgetProgramProvisionKey(program, period.fiscalYear),
      annualMinorUnits: adopted.appropriations[index]! * 100,
    }));
    if (
      lines.some(
        (line) =>
          !Number.isSafeInteger(line.annualMinorUnits) ||
          line.annualMinorUnits < 0,
      )
    )
      return null;
    return {
      period,
      adopted,
      lines,
      flatCurrentServices: ownAdoption === undefined,
    };
  });
  if (yearlyLines.some((year) => year === null)) return null;
  const chamber = defaultOriginChamber(pack);
  if (
    !seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )?.body.members.some((member) => member.personId !== null)
  )
    return null;
  const numbering = nextMeasureNumbering(world, {
    jurisdictionId: input.jurisdictionId,
    rulePackId: pack.packId,
    originChamber: chamber,
  });
  const stableKey = `${CURRENT_SERVICES_BUDGET_VERSION}:${input.jurisdictionId}:${numbering.numberingSession.key}${source.government.budgetCycle === "annual" ? `:fiscal-${periods[0]!.fiscalYear}` : ""}`;
  const existing = world.history.legislativeMeasures?.find(
    (measure) => measure.stableKey === stableKey,
  );
  if (existing)
    return existing.sourceDocumentKey === request.id
      ? { world, measureId: existing.id }
      : null;
  let next = introduceMeasure(world, {
    stableKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: pack.packId,
    ...numbering,
    originChamberKey: chamber.chamberKey,
    origin: "executive-request",
    sponsorPersonId: input.governorPersonId,
    sourceDocumentKey: request.id,
    shortTitle: "General Appropriations Act",
    subjectClass: "appropriation",
    summary: `The governor's recorded request carries ${source.government.name}'s adopted annual program spending forward without an increase or cut.`,
    propositionIds: [],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  let sectionNumber = 0;
  for (const year of yearlyLines) {
    const { period, adopted, lines, flatCurrentServices } = year!;
    next = recordFiledProvision(next, {
      stableKey: `${stableKey}:availability:${period.fiscalYear}`,
      measureId,
      provisionKey: `budget-availability:${period.fiscalYear}`,
      sectionNumber: ++sectionNumber,
      heading: `Fiscal ${period.fiscalYear} availability`,
      text: `The amounts in fiscal ${period.fiscalYear} are available from ${period.startsOn} through ${period.endsOn}.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: source.government.name,
      },
      applicationScope: {
        jurisdictionId: input.jurisdictionId,
        segmentKey: null,
      },
    });
    for (const line of lines) {
      next = recordFiledProvision(next, {
        stableKey: `${stableKey}:${line.provisionKey}`,
        measureId,
        provisionKey: line.provisionKey,
        sectionNumber: ++sectionNumber,
        heading: `Fiscal ${period.fiscalYear}: ${line.program}`,
        text: `There is appropriated for ${line.program} in fiscal ${period.fiscalYear} USD ${(line.annualMinorUnits / 100).toFixed(2)}. ${flatCurrentServices ? "No adopted line exists for this second fiscal year; flat current services carries the most recent adopted line unchanged." : "This line carries this fiscal year's own adopted amount without an increase or decrease."} The source budget was adopted on ${adopted.adoptedOn} for ${adopted.startsOn} through ${adopted.endsOn}, with recorded basis ${adopted.basis}.`,
        beneficiary: {
          kind: "general-application",
          appliesToLabel: source.government.name,
        },
        applicationScope: {
          jurisdictionId: input.jurisdictionId,
          segmentKey: null,
        },
        fiscalExposureMinorUnits: line.annualMinorUnits,
        fiscalExposureLabel: `USD ${(line.annualMinorUnits / 100).toFixed(2)} for fiscal ${period.fiscalYear}`,
        fiscalPeriod: "annual",
        ...(line.annualMinorUnits > 0
          ? {
              operativeEffect: {
                kind: "public-program-appropriation" as const,
              },
            }
          : {}),
      });
    }
  }
  return { world: next, measureId };
}

/** Final amended yearly clauses, never one year's rate multiplied across years. */
export function currentServicesBudgetAuthority(
  world: World,
  measureId: EntityId,
) {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (
    !measure?.stableKey.startsWith(`${CURRENT_SERVICES_BUDGET_VERSION}:`) ||
    measure.origin !== "executive-request"
  )
    return null;
  const provisions = currentMeasureProvisions(world, measureId);
  const periods = provisions
    .flatMap((provision) => {
      const key = /^budget-availability:(\d{4})$/.exec(provision.provisionKey);
      if (!key) return [];
      const fiscalYear = Number(key[1]);
      const match = new RegExp(
        `^The amounts in fiscal ${fiscalYear} are available from (\\d{4}-\\d{2}-\\d{2}) through (\\d{4}-\\d{2}-\\d{2})\\.$`,
      ).exec(provision.text);
      if (!match) return [];
      const startsOn = makeIsoDate(match[1]!);
      const endsOn = makeIsoDate(match[2]!);
      if (
        Number(endsOn.slice(0, 4)) !== fiscalYear ||
        addDays(addYears(startsOn, 1), -1) !== endsOn
      )
        return [];
      return [{ fiscalYear, startsOn, endsOn }];
    })
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn));
  if (
    !periods.length ||
    periods.some(
      (period, index) =>
        index > 0 && period.startsOn <= periods[index - 1]!.endsOn,
    )
  )
    return null;
  const lines = periods.flatMap((period) =>
    BUDGET_PROGRAMS.flatMap((program) => {
      const provision = provisions.find(
        (row) =>
          row.provisionKey ===
          budgetProgramProvisionKey(program, period.fiscalYear),
      );
      if (
        !provision ||
        provision.fiscalPeriod !== "annual" ||
        provision.operativeEffect?.kind !== "public-program-appropriation" ||
        !provision.fiscalExposureMinorUnits ||
        provision.fiscalExposureMinorUnits <= 0
      )
        return [];
      return [
        {
          ...period,
          program,
          amountMinorUnits: provision.fiscalExposureMinorUnits,
          provisionId: provision.id,
        },
      ];
    }),
  );
  return { periods, lines };
}
