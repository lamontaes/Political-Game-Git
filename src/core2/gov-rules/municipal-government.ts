/**
 * The compiled municipal governments the town rule readers consult, and which
 * Census government unit each one is. Ported from the old engine's
 * `municipal-government.ts` and `rule-capability-resolver.ts`.
 *
 * `municipal-governments.json` holds, for each compiled government in the old
 * engine's `municipal-governments.generated.ts` (same order), only its key,
 * place, publisher id and the parts of its primary reading (enacted text
 * first, else the research transcription) the readers use: form, body size,
 * how the chief official is chosen, the mayor's title and position, and the
 * seat terms. `src/core2/gov-rules.test.ts` checks it against that corpus and
 * rewrites it when run with `GOV_RULES_WRITE=1`.
 */
import corpus from "./municipal-governments.json" with { type: "json" };
import {
  governmentUnitsForPlace,
  type GovernmentUnitIdentity,
} from "../reference/government-units";

/** The parts of a government's primary reading the town readers use. */
export interface MunicipalReading {
  readonly form: string | null;
  /** The collective body as the charter names it ("Anchorage Assembly"). */
  readonly bodyName: string | null;
  readonly bodySize: number | null;
  /** How the body's seats are chosen, where the charter says. */
  readonly composition: {
    readonly pattern: string;
    readonly districtSeats: number | null;
    readonly wardSeats: number | null;
  } | null;
  readonly executiveSelection: string | null;
  readonly mayor: {
    readonly title: string | null;
    readonly structuralPosition: string | null;
  } | null;
  readonly terms: readonly {
    readonly seatClass: string;
    readonly years: number | null;
  }[];
}

export interface MunicipalGovernment {
  readonly key: string;
  readonly placeGeoid: string | null;
  /** The Census listing's publisher id the record declares, if any. */
  readonly publisherId: string | null;
  readonly reading: MunicipalReading;
}

const GOVERNMENTS = corpus.governments as readonly MunicipalGovernment[];

export function municipalGovernments(): readonly MunicipalGovernment[] {
  return GOVERNMENTS;
}

/** The reading a rule rests on: enacted text first, else the research pass. */
export function primaryReading(
  government: MunicipalGovernment,
): MunicipalReading {
  return government.reading;
}

let byPublisherId: ReadonlyMap<string, MunicipalGovernment> | null = null;

/** The compiled municipal government whose identity names this Census unit. */
export function municipalGovernmentForUnit(
  unit: GovernmentUnitIdentity,
): MunicipalGovernment | null {
  if (!byPublisherId) {
    const map = new Map<string, MunicipalGovernment>();
    for (const government of GOVERNMENTS) {
      const pid = government.publisherId;
      if (pid) {
        map.set(pid, government);
        continue;
      }
      // Without a declared identity link, a record reaches a unit only through
      // the Census place it names, and only where that place has exactly one
      // municipal government. Names are never matched.
      const units = government.placeGeoid
        ? governmentUnitsForPlace(government.placeGeoid).filter(
            (candidate) => candidate.unitType === "municipality",
          )
        : [];
      if (units.length === 1 && !map.has(units[0]!.publisherId)) {
        map.set(units[0]!.publisherId, government);
      }
    }
    byPublisherId = map;
  }
  return byPublisherId.get(unit.publisherId) ?? null;
}
