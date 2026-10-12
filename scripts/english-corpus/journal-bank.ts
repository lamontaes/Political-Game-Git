/**
 * Turns the mined journal bank (`data/english/parts/journal.json`) into the
 * story director's journal data, so "My life" is written in sentences real
 * Americans said about their own lives instead of hand-written templates.
 *
 * Each mined part names the journal row (`kindPrefix`) and the field it fills
 * (`line`, `otherLine`, `repeatLine`). A relative or a person is one slot to
 * the director (`{{other}}`: "my son", or a name), so the bank's `{relation}`
 * and `{other}` both fill it. Chapter titles stay record names; relation
 * words, count words and the look-back are the director's own data.
 *
 * OPUS-WORDS owns this file until OPUS-PEOPLE folds it into the director.
 */
import bankJson from "../../data/english/parts/journal.json" with { type: "json" };
import { heldByGrades } from "../../src/presentation/english-grades";
import { JOURNAL_DATA, type JournalData } from "../../src/director/journal";

interface JournalUse {
  journal?: { kindPrefix: string; field: string }[];
}
interface MinedPart {
  key: string;
  text: string;
  uses: JournalUse[];
  shippable: boolean;
}
export const JOURNAL_BANK = bankJson as unknown as { parts: MinedPart[] };

const BACKDROP = "backdrop:";

/** `{relation}` and `{other}` are the director's `{{other}}`; other slots keep their names. */
export function journalSlots(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) =>
      `{{${slot === "relation" ? "other" : slot.replace(/_/g, "-")}}}`,
  );
}

export function journalDataFromBank(
  bank: { parts: MinedPart[] } = JOURNAL_BANK,
): JournalData {
  const fields = new Map<string, { key: string; text: string }[]>();
  for (const part of bank.parts) {
    if (!part.shippable || heldByGrades(part.key)) continue;
    for (const use of part.uses)
      for (const target of use.journal ?? []) {
        const id = `${target.kindPrefix}|${target.field}`;
        const rows = fields.get(id) ?? [];
        if (!rows.some((row) => row.key === part.key))
          rows.push({ key: part.key, text: journalSlots(part.text) });
        fields.set(id, rows);
      }
  }
  // A wording that names the record ("I went to work for {employer}.") is
  // said before one that doesn't ("I went to work.").
  const mined = (kindPrefix: string, field: string) => {
    const rows = fields.get(`${kindPrefix}|${field}`);
    const named = rows?.filter((row) => row.text.includes("{{"));
    return named?.length ? named : rows;
  };
  return {
    ...JOURNAL_DATA,
    version: "words-journal-v1",
    // A row no record words yet is left out, as the director leaves out any
    // moment no line covers.
    lines: JOURNAL_DATA.lines.flatMap((row) => {
      const line = mined(row.kindPrefix, "line");
      if (!line) return [];
      const other = mined(row.kindPrefix, "otherLine");
      const repeat = mined(row.kindPrefix, "repeatLine");
      return [
        {
          ...row,
          line,
          ...(row.otherLine ? { otherLine: other ?? [] } : {}),
          ...(row.repeatLine ? { repeatLine: repeat ?? [] } : {}),
        },
      ];
    }),
    backdropLines: (JOURNAL_DATA.backdropLines ?? []).flatMap((row) => {
      const line = mined(`${BACKDROP}${row.kind}`, "line");
      if (!line) return [];
      const stages = row.line.flatMap((variant) => variant.stages ?? []);
      return [
        {
          ...row,
          line: line.map((variant) => ({
            ...variant,
            ...(stages.length ? { stages } : {}),
          })),
        },
      ];
    }),
  };
}

/** Journal rows the hand-written bank words and the mined bank does not. */
export function uncoveredJournal(
  bank: { parts: MinedPart[] } = JOURNAL_BANK,
): string[] {
  const data = journalDataFromBank(bank);
  const gaps: string[] = [];
  for (const row of JOURNAL_DATA.lines) {
    const mined = data.lines.find((line) => line.kindPrefix === row.kindPrefix);
    if (!mined) gaps.push(`${row.kindPrefix}.line`);
    else {
      if (row.otherLine && !mined.otherLine?.length)
        gaps.push(`${row.kindPrefix}.otherLine`);
      if (row.repeatLine && !mined.repeatLine?.length)
        gaps.push(`${row.kindPrefix}.repeatLine`);
    }
  }
  for (const row of JOURNAL_DATA.backdropLines ?? [])
    if (!data.backdropLines?.some((line) => line.kind === row.kind))
      gaps.push(`backdrop:${row.kind}`);
  return gaps;
}
