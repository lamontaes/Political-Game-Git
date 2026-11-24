/**
 * The justice engine's chains, read back from the records for a proof run or
 * a developer screen: for each case, the act, who knew, the complaint, the
 * investigation's reasons, the charge, the verdict, the sentence, the seat
 * vacated, the fine on the journal, and what other engines read of it (the
 * news story the event became, and the scandal voters read from it).
 * Reads only; writes nothing.
 */
import { CORRUPTION_MODULE_ID, type CrimeRecord } from "./modules/corruption";
import {
  JUSTICE_MODULE_ID,
  type CaseRow,
  type CountedCaseRow,
  type CountedSentenceRow,
  type ComplaintRow,
  type CustodyRow,
  type InvestigationRow,
  type SentenceRow,
} from "./modules/justice";
import { NEWS_MODULE_ID } from "./modules/news";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { scandalStoriesOf } from "./modules/voting";
import type { CoreAPI } from "./types";

export interface JusticeChain {
  readonly caseId: string;
  readonly defendantId: string;
  readonly acts: readonly CrimeRecord[];
  readonly complaints: readonly ComplaintRow[];
  readonly investigation: InvestigationRow | undefined;
  readonly case: CaseRow;
  readonly sentence: SentenceRow | undefined;
  readonly custody: CustodyRow | undefined;
  readonly vacancyIds: readonly string[];
  readonly fineJournalIds: readonly string[];
  /** News stories (event ids) the case's events became. */
  readonly storyIds: readonly string[];
  /** The candidacy inputs read the conviction as a public scandal. */
  readonly scandalRead: boolean;
}

const rows = <T>(api: CoreAPI, module: string, name: string): T[] =>
  api.state.modules.has(module)
    ? (api.moduleState(module).table(name).rows() as unknown as T[])
    : [];

export function justiceChains(api: CoreAPI): JusticeChain[] {
  const complaints = rows<ComplaintRow>(api, JUSTICE_MODULE_ID, "complaints");
  const investigations = rows<InvestigationRow>(
    api,
    JUSTICE_MODULE_ID,
    "investigations",
  );
  const sentences = rows<SentenceRow | CountedSentenceRow>(
    api,
    JUSTICE_MODULE_ID,
    "sentences",
  ).filter((row): row is SentenceRow => row.kind === "person");
  const custody = rows<CustodyRow>(api, JUSTICE_MODULE_ID, "custody");
  const vacancies = rows<{ id: string; seatId: string; cause: string }>(
    api,
    OFFICES_MODULE_ID,
    "vacancies",
  );
  const stories = new Set(
    rows<{ id: string }>(api, NEWS_MODULE_ID, "stories").map((s) => s.id),
  );
  const crimes = api.state.modules.has(CORRUPTION_MODULE_ID)
    ? api.moduleState(CORRUPTION_MODULE_ID).table("crimes")
    : undefined;
  // Named defendants' cases; counted cases have no one person's chain.
  return rows<CaseRow | CountedCaseRow>(api, JUSTICE_MODULE_ID, "cases")
    .filter((row): row is CaseRow => row.kind === "person")
    .map((row) => {
      const investigation = investigations.find(
        (i) => i.id === row.investigationId,
      );
      const sentence = sentences.find((s) => s.caseId === row.id);
      const events = [
        "justice.charged",
        "justice.convicted",
        "justice.acquitted",
      ].map((kind) => `${kind}:${row.id}`);
      if (sentence)
        events.push(
          `justice.imprisoned:${sentence.id}`,
          `justice.released:custody:${sentence.id}`,
        );
      return {
        caseId: row.id,
        defendantId: row.defendantId,
        acts: row.crimeIds
          .map((id) => crimes?.get(id) as unknown as CrimeRecord | undefined)
          .filter((c): c is CrimeRecord => !!c),
        complaints: complaints.filter((c) =>
          investigation?.complaintIds.includes(c.id),
        ),
        investigation,
        case: row,
        sentence,
        custody: custody.find((c) => c.sentenceId === sentence?.id),
        vacancyIds: vacancies
          .filter(
            (v) =>
              v.cause === "conviction" &&
              sentence?.seatsVacated.includes(v.seatId),
          )
          .map((v) => v.id),
        fineJournalIds: sentence?.finePaidMinor ? [`fine:${sentence.id}`] : [],
        storyIds: events.filter((id) => stories.has(id)),
        // Voters hold the conviction against them through its news story.
        scandalRead: scandalStoriesOf(
          api,
          row.defendantId,
          api.state.date,
        ).includes(`justice.convicted:${row.id}`),
      };
    });
}
