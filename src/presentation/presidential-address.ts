import addressBank from "../../data/english/parts/presidential-address.json" with { type: "json" };
import type { EntityId, IsoDate, World } from "../simulation";
import { projectCongress } from "../simulation/living-world/congress";
import {
  macroHistoryStart,
  macroReleasesAt,
} from "../simulation/macro-economy/readers";
import type { MacroReleaseIndicator } from "../simulation/macro-economy/types";
import { macroStartingConditions } from "../simulation/world-setup/conditions";
import { composeFromBank, type EnglishBank } from "./bank-english";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";
import { stableHash as stableDigest } from "../simulation/ids";
import { currentPublicOfficeholders } from "./opening-officeholders";

/**
 * The President's speech that carries the cinematic opening as subtitles
 * (owner's revision, CTO 11:14 p.m., October 8, 2026). It is the inaugural
 * address when the President took office in the year the world starts, and
 * the State of the Union otherwise. The words come from the presidential
 * address bank; the names and figures come from the world's records. The
 * camera cuts to a stop of the opening as the speech addresses it.
 */

export type AddressRegister = "inaugural" | "state-of-the-union";

/** Where the camera is while a stretch of the speech plays. */
export type AddressCut =
  "country" | "representatives" | "state" | "town" | "home" | "you" | "day-one";

/** The national figures a speech may dwell on, in the records' own terms. */
export type AddressFigure = "unemployment" | "inflation" | "growth";

export interface AddressLine {
  readonly text: string;
  /** The bank part, for the owner's grades. */
  readonly part: string;
}

export interface AddressSegment {
  readonly cut: AddressCut;
  readonly lines: readonly AddressLine[];
}

export interface PresidentialAddress {
  readonly register: AddressRegister;
  readonly speakerPersonId: EntityId;
  readonly speakerName: string;
  readonly deliveredOn: IsoDate;
  readonly segments: readonly AddressSegment[];
}

export interface AddressOptions {
  /**
   * The figures the speech dwells on, in order. The story director chooses
   * them from the world's biggest recorded conditions; by default the speech
   * names every figure the records hold.
   */
  readonly dwellOn?: readonly AddressFigure[];
  readonly grades?: PartGradeLedger;
}

const BANK = addressBank as EnglishBank;

const RELEASE_OF: Readonly<Record<AddressFigure, MacroReleaseIndicator>> = {
  unemployment: "unemployment-rate",
  inflation: "consumer-price-inflation-12m",
  growth: "real-output-growth-annualized-quarterly",
};

/** The speech, or null when no President holds office in the records. */
export function composePresidentialAddress(
  world: World,
  options: AddressOptions = {},
): PresidentialAddress | null {
  const grades = options.grades ?? PART_GRADES;
  const offices = currentPublicOfficeholders(world);
  const holder = (key: string) =>
    offices.find((entry) => entry.officeKey === key) ?? null;
  const president = holder("us-president");
  if (!president) return null;
  const vice = holder("us-vice-president");
  const chief = holder("us-chief-justice");
  // An inaugural address when the President took office in the world's
  // starting year; otherwise the State of the Union.
  const register: AddressRegister =
    president.startedAt?.slice(0, 4) === world.currentDate.slice(0, 4)
      ? "inaugural"
      : "state-of-the-union";
  // The bank's 32-bit pick keeps the low bit of the key's characters, so
  // keys that differ only by beat would pick together; a 64-bit digest of
  // the world and the beat makes each beat's pick its own.
  const pick = (move: string) =>
    `address:${move}:${stableDigest(`${world.seed}:${president.personId}:${move}`)}`;
  const say = (move: string, slots: Record<string, string> = {}) => {
    const line = composeFromBank(
      BANK,
      move,
      slots,
      pick(move),
      undefined,
      grades,
    );
    return line
      ? [{ text: line.text, part: `bank:${line.partKey}` }]
      : ([] as AddressLine[]);
  };
  const familyName = (personId: EntityId | undefined) =>
    personId ? (world.people[personId]?.familyName ?? null) : null;

  const vicePerson = vice ? world.people[vice.personId] : undefined;
  const viceFamily = familyName(vice?.personId);
  const vicePresidentAddress =
    vicePerson?.identity?.pronouns === "she-her"
      ? "Madam Vice President"
      : vicePerson?.identity?.pronouns === "he-him"
        ? "Mr. Vice President"
        : viceFamily
          ? `Vice President ${viceFamily}`
          : "";
  const chiefFamily = familyName(chief?.personId) ?? "";

  const figures = nationalFigures(world);
  const dwellOn =
    options.dwellOn ?? (["unemployment", "inflation", "growth"] as const);
  const economy = dwellOn.flatMap((figure) => {
    const value = figures[figure];
    if (value === null) return [];
    // Growth below zero is not growth; the bank has no words for a shrinking
    // economy yet, so the speech does not claim one.
    if (figure === "growth" && value < 0) return [];
    return say(`economy.${figure}`, { [figure]: value.toFixed(1) });
  });

  return {
    register,
    speakerPersonId: president.personId,
    speakerName: president.personName,
    deliveredOn: world.currentDate,
    segments: [
      {
        cut: "country",
        lines: [
          ...say(`salutation.${register}`, {
            vicePresidentAddress,
            vicePresident: viceFamily ?? "",
            chiefJustice: chiefFamily,
          }),
          ...say(`opening.${register}`),
          ...economy,
        ],
      },
      {
        cut: "representatives",
        lines: say("address.congress", { parties: partiesInCongress(world) }),
      },
      { cut: "state", lines: say("address.governors") },
      { cut: "town", lines: say("address.mayors") },
      { cut: "home", lines: say("address.families") },
      { cut: "you", lines: say(`close.${register}`) },
      // Day one begins after the speech; the arrival record says where.
      { cut: "day-one", lines: [] },
    ],
  };
}

/**
 * The national figures the public has been told, newest release first, or
 * the world's starting conditions before anything has been released.
 */
function nationalFigures(
  world: World,
): Readonly<Record<AddressFigure, number | null>> {
  const start =
    macroHistoryStart(world)?.initial ??
    macroStartingConditions(world)?.initial ??
    null;
  const released = (figure: AddressFigure) =>
    macroReleasesAt(world, world.currentDate, RELEASE_OF[figure])
      .filter(
        (release) => release.scope === "national" && release.value !== null,
      )
      .at(-1)?.value ?? null;
  return {
    unemployment: released("unemployment") ?? start?.unemploymentPct ?? null,
    inflation: released("inflation") ?? start?.inflation12mPct ?? null,
    growth: released("growth") ?? start?.realGrowthAnnualPct ?? null,
  };
}

function partiesInCongress(world: World): string {
  const congress = projectCongress(world);
  const parties = new Set(
    congress
      ? [...congress.house.seats, ...congress.senate.seats].flatMap((seat) =>
          seat.occupant.kind === "member" &&
          seat.occupant.member.partyOrganizationId
            ? [seat.occupant.member.partyOrganizationId]
            : [],
        )
      : [],
  );
  return parties.size === 2 ? "both parties" : "every party";
}
