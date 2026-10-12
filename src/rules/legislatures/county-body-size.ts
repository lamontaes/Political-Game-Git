import type { CountyGoverningBodyRules } from "../../simulation/nationwide-world/county-governing-body-rules";
interface StateReading {
  readonly seats?: number;
  readonly bands?: readonly {
    readonly atLeast: number;
    readonly seats: number;
  }[];
  readonly exceptions?: Readonly<Record<string, number>>;
  readonly bodyName: string;
  readonly memberTitle: string;
  readonly citation: string;
  readonly url: string;
}

export function stateSeats(
  populations: Readonly<Record<string, number>>,
  reading: StateReading,
  countyGeoid: string | null,
): number | null {
  const named = countyGeoid ? reading.exceptions?.[countyGeoid] : undefined;
  if (named !== undefined) return named;
  if (reading.seats !== undefined) return reading.seats;
  const population = countyGeoid ? populations[countyGeoid] : undefined;
  if (population === undefined || !reading.bands) return null;
  return (
    reading.bands.find((band) => population >= band.atLeast)?.seats ?? null
  );
}

interface MunicipalCode {
  readonly stateFips: string;
  readonly inForceSince: string;
  readonly bodyName: string;
  readonly memberTitle: string;
  readonly chiefTitle: string;
  readonly termYears: number;
  readonly bands: readonly {
    readonly atLeast: number;
    readonly seats: number;
    readonly partyMayNominate: number;
  }[];
  readonly exceptions: Readonly<
    Record<
      string,
      {
        readonly seats: number;
        readonly partyMayNominate: number;
      }
    >
  >;
  readonly citation: string;
  readonly url: string;
}

export function municipioRules(
  populations: Readonly<Record<string, number>>,
  code: MunicipalCode,
  countyGeoid: string | null,
): CountyGoverningBodyRules | null {
  if (!countyGeoid) return null;
  const population = populations[countyGeoid];
  const seats =
    code.exceptions[countyGeoid]?.seats ??
    (population === undefined
      ? null
      : (code.bands.find((band) => population >= band.atLeast)?.seats ?? null));
  if (seats === null) return null;
  return {
    seats,
    basis: "municipal-code",
    bodyName: code.bodyName,
    memberTitle: code.memberTitle,
    chiefTitle: code.chiefTitle,
    structure: null,
    executive: {
      kind: "elected",
      title: code.chiefTitle,
      presidesOverBody: false,
      basis: "municipal-code",
      status: "SOURCED",
    },
    citation: code.citation,
    url: code.url,
    inForceSince: code.inForceSince,
  };
}
