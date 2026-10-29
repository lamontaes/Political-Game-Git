/**
 * Turns the mined journal bank (`data/english/parts/journal.json`) into the
 * journal's words (`src/english/journal-words.ts`), so "My life" is written in sentences real
 * Americans said about their own lives, never hand-written templates.
 *
 * Each mined part names the journal row (`kindPrefix`) and the field it fills
 * (`line`, `otherLine`, `repeatLine`). A relative or a person is one slot to
 * the director (`{{other}}`: "my son", or a name), so the bank's `{relation}`
 * and `{other}` both fill it. The structure (which moments, which record
 * facts, chapter titles that are only record names, the relation and count
 * words) is `data/journal-rows.json`, which holds no sentences. A moment the
 * bank has no sentence for is left out.
 */
import bankJson from "../../../data/english/parts/journal.json" with { type: "json" };
import { admittedParts, directorSlots, type BankPart } from "../bank-parts";
import rowsJson from "../../director/data/journal-rows.json" with { type: "json" };
import type { JournalRows, JournalWords } from "../journal-words";

interface JournalUse {
  journal?: { kindPrefix: string; field: string }[];
}
type MinedPart = BankPart<JournalUse>;
export const JOURNAL_BANK = bankJson as unknown as { parts: MinedPart[] };
export const JOURNAL_ROWS = rowsJson as unknown as JournalRows;

const BACKDROP = "backdrop:";

/** `{relation}` and `{other}` are the director's `{{other}}`; other slots keep their names. */
export function journalSlots(text: string): string {
  return directorSlots(text, (slot) =>
    slot === "relation" ? "{{other}}" : undefined,
  );
}

/** The memoir fields the bank words. */
const MEMOIR = "memoir:";

/**
 * Whether one's own race was won or lost, read from the sentence's own verb:
 * "I won.", "We lost." A sentence that says neither ("It was close.") fits both.
 */
function resultStages(text: string): string[] | undefined {
  if (/\b(?:lost|didn't win)\b/i.test(text)) return ["lost"];
  if (/\b(?:won|win|elected)\b/i.test(text)) return ["won"];
  return undefined;
}

/** How a race was decided, as the result record's totals show it. */
export const RACE_MARGINS = ["close", "wide", "middle", "alone"] as const;

/**
 * One's own race, said by result and by margin ("won:close"): a line that
 * claims a close race ("It was very close.") or a wide one ("It wasn't
 * close.") fits only the margin it claims; a line that claims none fits any.
 */
function ownRaceStages(text: string): string[] {
  const results = resultStages(text) ?? ["won", "lost"];
  const margins = /\b(?:wasn't|was not|not) close\b|\blandslide\b/i.test(text)
    ? ["wide"]
    : /\bclose\b/i.test(text)
      ? ["close"]
      : [...RACE_MARGINS];
  return results.flatMap((result) =>
    margins.map((margin) => `${result}:${margin}`),
  );
}

/** A mined sentence in the first person plural, told when the event names a group. */
const plural = (text: string) => /^We\b/.test(text);

/** The journal's words: the parts the owner's grades leave in, by field. */
export function journalDataFromBank(
  bank: { parts: MinedPart[] } = JOURNAL_BANK,
  rows: JournalRows = JOURNAL_ROWS,
): JournalWords {
  const fields = new Map<string, { key: string; text: string }[]>();
  for (const part of admittedParts(bank.parts)) {
    for (const use of part.uses)
      for (const target of use.journal ?? []) {
        const id = `${target.kindPrefix}|${target.field}`;
        const list = fields.get(id) ?? [];
        if (!list.some((row) => row.key === part.key))
          list.push({ key: part.key, text: journalSlots(part.text) });
        fields.set(id, list);
      }
  }
  // A wording that names the record ("I went to work for {employer}.") is
  // said before one that doesn't ("I went to work.").
  const mined = (kindPrefix: string, field: string) => {
    const list = fields.get(`${kindPrefix}|${field}`);
    const named = list?.filter((row) => row.text.includes("{{"));
    return named?.length ? named : list;
  };
  return {
    version: rows.version,
    relationWords: rows.relationWords,
    ...(rows.kinAddress ? { kinAddress: rows.kinAddress } : {}),
    possessive: rows.possessive,
    possessivePronoun: rows.possessivePronoun,
    countWords: rows.countWords,
    manyTimes: rows.manyTimes,
    ...(rows.billForms ? { billForms: rows.billForms } : {}),
    firstTitle: rows.firstTitle,
    ...(rows.lookBacks ? { lookBacks: rows.lookBacks } : {}),
    // A row no record words is left out, as the director leaves out any
    // moment no line covers.
    lines: rows.lines.flatMap((row) => {
      const from = row.wordsFrom ?? row.kindPrefix;
      const all = mined(from, "line");
      // A row with a group line keeps the "we" sentences for it.
      const worded = row.hasGroupLine
        ? all?.filter((v) => !plural(v.text))
        : all;
      // A row worded by an event fact (a vote) marks each variant with the
      // stage its own words say: "I voted for it" is "yes", "against" is "no".
      const staged = (list: typeof worded) =>
        row.stageWords
          ? list?.map((variant) => {
              const stage = Object.entries(row.stageWords!).find(([, words]) =>
                new RegExp(words, "i").test(variant.text),
              )?.[0];
              return stage ? { ...variant, stages: [stage] } : variant;
            })
          : list;
      const line = staged(worded);
      // A row that only counts who an event names (a household move) stays,
      // with no line of its own, so the moves it shares a day with read "we".
      // A setting (a school, a job) stays with no line: it opens a chapter.
      if (
        !line?.length &&
        !row.selfWhenNamed &&
        row.entry !== "setting" &&
        !row.hasOwnLine
      )
        return [];
      // Someone else's race is worded by its result too: "{name} won." only
      // when the record says they won (batch 10: "Heather won." for a loss).
      const other = row.hasOwnLine
        ? mined(from, "otherLine")?.map((variant) => {
            const stages = resultStages(variant.text);
            return stages ? { ...variant, stages } : variant;
          })
        : staged(mined(from, "otherLine"));
      // One's own race is told by how it went and by its margin.
      const ownLine = row.hasOwnLine
        ? (fields.get(`${from}|ownLine`) ?? []).map((variant) => {
            const stages = ownRaceStages(variant.text);
            return { ...variant, stages };
          })
        : undefined;
      const repeat = mined(from, "repeatLine");
      const group = all?.filter((v) => plural(v.text));
      const {
        hasOtherLine,
        hasRepeatLine,
        hasGroupLine,
        hasOwnLine,
        wordsFrom,
        stageWords,
        ...kept
      } = row;
      void stageWords;
      void hasOwnLine;
      void wordsFrom;
      return [
        {
          ...kept,
          line: line ?? [],
          ...(hasOtherLine ? { otherLine: other ?? [] } : {}),
          ...(hasRepeatLine ? { repeatLine: repeat ?? [] } : {}),
          ...(hasGroupLine && group?.length ? { groupLine: group } : {}),
          ...(ownLine?.length ? { ownLine } : {}),
        },
      ];
    }),
    // The memoir's framing and look-back sentences, by field.
    memoir: Object.fromEntries(
      [...fields]
        .filter(([id]) => id.startsWith(`${MEMOIR}|`))
        .map(([id, list]) => [id.slice(MEMOIR.length + 1), list]),
    ),
    backdropLines: (rows.backdropLines ?? []).flatMap((row) => {
      // A backdrop line is said whole: the event holds no record to name.
      const line = fields.get(`${BACKDROP}${row.kind}|line`);
      if (!line) return [];
      return [
        {
          kind: row.kind,
          stageFact: row.stageFact,
          line: line.map((variant) => ({
            ...variant,
            ...(row.stages.length ? { stages: row.stages } : {}),
          })),
        },
      ];
    }),
  };
}

/** Journal rows the structure names and the mined bank does not word. */
export function uncoveredJournal(
  bank: { parts: MinedPart[] } = JOURNAL_BANK,
  rows: JournalRows = JOURNAL_ROWS,
): string[] {
  const data = journalDataFromBank(bank, rows);
  const gaps: string[] = [];
  for (const row of rows.lines) {
    const found = data.lines.find((line) => line.kindPrefix === row.kindPrefix);
    if (!found) gaps.push(`${row.kindPrefix}.line`);
    else {
      if (row.hasOtherLine && !found.otherLine?.length)
        gaps.push(`${row.kindPrefix}.otherLine`);
      if (row.hasRepeatLine && !found.repeatLine?.length)
        gaps.push(`${row.kindPrefix}.repeatLine`);
    }
  }
  for (const row of rows.backdropLines ?? [])
    if (!data.backdropLines?.some((line) => line.kind === row.kind))
      gaps.push(`backdrop:${row.kind}`);
  return gaps;
}
