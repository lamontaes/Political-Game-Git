/**
 * The narrator's lines for election day and election night: the morning, the
 * canvass, the choice to vote, the returns as each place reports, and the
 * call. Each line is an authored piece in `data/english/parts/election-day.json`
 * with the contest's record facts in its slots; a piece whose facts the moment
 * lacks is left out, and a moment no piece fits says nothing.
 */
import electionDayJson from "../../data/english/parts/election-day.json" with { type: "json" };
import type { EntityId } from "../core2/kernel/brands";
import { heldByGrades } from "./english-grades";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type LinePartVariant,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

interface Part {
  key: string;
  text: string;
  uses: { subject: string; role: string; requiresFacts?: string[] }[];
  shippable: boolean;
}
const BANK = electionDayJson as unknown as { parts: Part[] };
const NARRATOR = "narrator:election-day" as EntityId;

/** A fact as a line reads it: its words and the records they come from. */
export interface DayFact {
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
}

/**
 * One narrator's line for a moment of election day or night (`role`), from
 * the facts the moment holds, or null when no piece fits them.
 */
export function electionDayLine(
  role: string,
  facts: Readonly<Record<string, DayFact>>,
  moment: {
    readonly key: string;
    readonly worldSeed: string;
    /** The records the moment stands on (the contest, the filing): every fact cites them. */
    readonly recordIds: readonly string[];
  },
): { text: string; sourceRecordIds: string[] } | null {
  const variants = BANK.parts.flatMap((part): LinePartVariant[] => {
    const use = part.uses.find(
      (row) => row.subject === "election-day" && row.role === role,
    );
    if (!use || !part.shippable || heldByGrades(part.key)) return [];
    return [
      {
        key: part.key,
        kind: "template",
        text: part.text.replace(
          /\{(\w+)\}/g,
          (_all, slot: string) => `{{${slot}}}`,
        ),
        ...(use.requiresFacts?.length
          ? { requiresFacts: use.requiresFacts }
          : {}),
      },
    ];
  });
  if (!variants.length) return null;
  const cited = (fact: DayFact) =>
    [...new Set([...fact.sourceRecordIds, ...moment.recordIds])] as EntityId[];
  const ids = [
    ...new Set([
      ...moment.recordIds,
      ...Object.values(facts).flatMap((fact) => fact.sourceRecordIds),
    ]),
  ] as EntityId[];
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `election-day:${moment.key}:${role}`,
    worldSeed: moment.worldSeed,
    bankVersion: "words-election-day-v1",
    stage: "default",
    sourceRecordIds: ids,
    facts: Object.fromEntries(
      Object.entries(facts).map(([key, fact]) => [
        key,
        { text: fact.text, sourceRecordIds: cited(fact) },
      ]),
    ),
    // The narrator knows what the records hold.
    speaker: { personId: NARRATOR, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: NARRATOR,
      factKey,
      sourceRecordIds: cited(fact),
    })),
  };
  const bank: ComposedLineBank = {
    key: `election-day.${role}`,
    version: "words-election-day-v1",
    surface: "dialogue",
    act: "tell",
    parts: { core: { variants } },
  };
  const result = composeGroundedLine(packet, bank, {});
  if (result.kind !== "rendered") return null;
  const text = result.text.charAt(0).toUpperCase() + result.text.slice(1);
  return { text, sourceRecordIds: [...result.sourceRecordIds] };
}
