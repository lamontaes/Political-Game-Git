/**
 * Turns the mined journal bank (`data/english/parts/journal.json`) into the
 * story director's journal data, so "My life" is written in sentences real
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
import { heldByGrades } from "../../english/english-grades";
import rowsJson from "../data/journal-rows.json" with { type: "json" };
import type { JournalData, JournalRows } from "../journal";

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
export const JOURNAL_ROWS = rowsJson as unknown as JournalRows;

const BACKDROP = "backdrop:";

/** `{relation}` and `{other}` are the director's `{{other}}`; other slots keep their names. */
export function journalSlots(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    (_all, slot: string) =>
      `{{${slot === "relation" ? "other" : slot.replace(/_/g, "-")}}}`,
  );
}

/** The memoir fields the bank words (owner, Oct 14: the journal reads like a memoir). */
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

/** A mined sentence in the first person plural, told when the event names a group. */
const plural = (text: string) => /^We\b/.test(text);

/**
 * The journal's words. Play says only shipped parts. A grading page
 * (`heldFirst`) says the held ones wherever one fits a field, so the owner
 * reads each in a real journal; a field no held part fits keeps its shipped
 * parts.
 */
export function journalDataFromBank(
  bank: { parts: MinedPart[] } = JOURNAL_BANK,
  rows: JournalRows = JOURNAL_ROWS,
  heldFirst = false,
): JournalData {
  const collect = (shipped: boolean) => {
    const found = new Map<string, { key: string; text: string }[]>();
    for (const part of bank.parts) {
      if (part.shippable !== shipped || heldByGrades(part.key)) continue;
      for (const use of part.uses)
        for (const target of use.journal ?? []) {
          const id = `${target.kindPrefix}|${target.field}`;
          const list = found.get(id) ?? [];
          if (!list.some((row) => row.key === part.key))
            list.push({ key: part.key, text: journalSlots(part.text) });
          found.set(id, list);
        }
    }
    return found;
  };
  const fields = collect(true);
  if (heldFirst) for (const [id, list] of collect(false)) fields.set(id, list);
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
      const line = row.stageWords
        ? worded?.map((variant) => {
            const stage = Object.entries(row.stageWords!).find(([, words]) =>
              new RegExp(words, "i").test(variant.text),
            )?.[0];
            return stage ? { ...variant, stages: [stage] } : variant;
          })
        : worded;
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
        : mined(from, "otherLine");
      const ownLine = row.hasOwnLine
        ? (fields.get(`${from}|ownLine`) ?? []).map((variant) => {
            const stages = resultStages(variant.text);
            return stages ? { ...variant, stages } : variant;
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
