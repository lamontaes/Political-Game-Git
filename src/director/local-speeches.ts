/**
 * A council or board member's floor speech on the measure before their body,
 * and a local candidate's campaign speech (words builder, Nov 12: "a council
 * member's speech ... all through planSpeech"). Both are planned by the one
 * outline planner (speech-outline.ts) from their rows in speech-outlines.json
 * (`floor`, `campaign`), as the President's, a governor's and a mayor's
 * addresses are: the speaker is a full person whose views come from the one
 * stance engine (campaign-stances.ts), the questions are the ones their body
 * decides, and the English engine writes every sentence
 * (data/english/parts/opening-speech.json, subjects `floor-speech` and
 * `campaign-speech`). This file says only who speaks, about what, and to whom.
 */
import { coreAPI } from "../core2/state";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { townSeats } from "../core2/modules/offices";
import { billOf } from "../core2/modules/legislature";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { SPEECH_HEARD } from "../core2/modules/people";
import type { LogRecord } from "../core2/types";
import {
  candidatePlatform,
  contestPositions,
  statementSpeechPrefix,
} from "../core2/modules/campaigns";
import { presidingOfficer } from "../core2/modules/legislature";
import { officeWords } from "../english/said-as";
import { composeBlocks, type OpeningSentence } from "./opening-story";
import {
  fact,
  planSpeech,
  type Block,
  type PlannedPoint,
} from "./speech-outline";
import { localSpeaker } from "./local-address";
import { markWordsStopgap } from "./stopgaps";

export interface LocalSpeech {
  readonly kind: "floor" | "campaign";
  readonly speakerId: PersonId;
  readonly theme: string | null;
  readonly asks: readonly string[];
  readonly points: readonly PlannedPoint[];
  readonly sentences: readonly OpeningSentence[];
  readonly parts: readonly string[];
}

type TownOffice = ReturnType<typeof townSeats>[number]["office"];

function officeOf(core: CoreState, officeId: string): TownOffice | undefined {
  return townSeats(coreAPI(core)).find((row) => row.office.id === officeId)
    ?.office;
}

/** The office as people say it: an executive by its own title, a member's seat by the said-as words ("council member", "commissioner"). */
function officeSaid(office: TownOffice): string {
  return (officeWords(office.kind)?.before ?? office.title).toLocaleLowerCase(
    "en-US",
  );
}

function spoken(
  core: CoreState,
  kind: LocalSpeech["kind"],
  speakerId: PersonId,
  plan: ReturnType<typeof planSpeech>,
  blocks: readonly Block[],
): LocalSpeech | null {
  const speaker = core.people.get(speakerId);
  // A speech with nothing to say is not given.
  if (!speaker || !plan.asks.length) return null;
  const sentences = composeBlocks(core, speaker, [...blocks]);
  if (!sentences?.length) return null;
  return {
    kind,
    speakerId,
    theme: plan.theme,
    asks: plan.asks,
    points: plan.points,
    sentences,
    parts: [...new Set(sentences.map((row) => row.part))].map((part) =>
      sentences
        .filter((row) => row.part === part)
        .map((row) => row.text)
        .join(" "),
    ),
  };
}

/**
 * A member's floor speech on a measure before their body: the measure's one
 * question, their side of it from their own view, addressed to whoever
 * presides (said by the post's title and family name) and ending in the
 * vote. Null when the bill is not before a town's body, its question has no
 * spoken name, or the member holds no view on it.
 */
export function composeFloorSpeech(
  core: CoreState,
  billId: string,
  memberId: PersonId,
): LocalSpeech | null {
  const api = coreAPI(core);
  const bill = billOf(api, billId);
  if (!bill) return null;
  const office = officeOf(core, bill.bodyOfficeId);
  const member = townSeats(api).find(
    (row) =>
      row.office.id === bill.bodyOfficeId && row.holder?.personId === memberId,
  );
  if (!office || !member?.holder) return null;
  const questions = bill.provisions.flatMap((provision) =>
    provision.question
      ? [provision.question]
      : provision.line
        ? [`budget-line:${provision.line}`]
        : [],
  );
  const presidingId = presidingOfficer(api, office.id);
  const presiding =
    presidingId && presidingId !== memberId
      ? core.people.get(presidingId as PersonId)
      : undefined;
  const title = officeWords(`${office.kind}:presiding`)?.before;
  const plan = planSpeech(core, "floor", {
    person: core.people.get(memberId)!,
    jurisdiction: office.jurisdiction,
    serviceStart: member.holder.serviceStart ?? member.holder.startDate,
    local: {
      ...localSpeaker(core, member.holder, office, officeSaid(office)),
      questions,
    },
  });
  const blocks = plan.blocks.map((block) =>
    presiding && title
      ? {
          ...block,
          facts: {
            ...block.facts,
            presiding: fact(
              `${title} ${presiding.familyName}`,
              presidingId!,
              office.id,
            ),
          },
        }
      : block,
  );
  return spoken(core, "floor", memberId, plan, blocks);
}

/**
 * A local candidate's campaign (stump) speech for an office: what they run
 * on is the platform engine's pick (campaign-stances.ts `candidatePlatform`:
 * the questions the seat takes up that they hold most strongly and most of
 * the town shares), planned into one theme and asked of the voters. Null
 * when the platform gives nothing to say.
 */
export function composeCampaignSpeech(
  core: CoreState,
  candidateId: PersonId,
  officeId: string,
  party: string | null,
): LocalSpeech | null {
  const api = coreAPI(core);
  const office = officeOf(core, officeId);
  const person = core.people.get(candidateId);
  if (!office || !person) return null;
  const platform = candidatePlatform(
    api,
    candidateId,
    party,
    contestPositions(api, { officeId }),
  ).map((row) => row.question);
  const plan = planSpeech(core, "campaign", {
    person,
    jurisdiction: office.jurisdiction,
    serviceStart: core.date,
    local: {
      ...localSpeaker(core, { party }, office, officeSaid(office)),
      questions: platform,
    },
  });
  return spoken(core, "campaign", candidateId, plan, plan.blocks);
}

/** A speech a scene plays in its speaker's own words, composed from its record. */
export interface HeardSpeech {
  readonly speakerId: PersonId;
  readonly text: string;
  readonly parts: readonly string[];
  readonly sourceRecordIds: readonly string[];
  /** The speech is the scene's opening line itself (a floor speech is what the member rose to say), so the scene's own opening is not said too. */
  readonly opens: boolean;
}

/** The race a candidate is running in on this day: their latest filing still standing, and its contest. */
function standingFiling(
  core: CoreState,
  personId: PersonId,
): { filing: FilingRow; contest: ContestRow } | null {
  if (!core.modules.has(ELECTIONS_MODULE_ID)) return null;
  const state = coreAPI(core).moduleState(ELECTIONS_MODULE_ID);
  const filing = (
    state
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  )
    .filter((row) => row.status !== "withdrawn" && row.filedOn <= core.date)
    .sort(
      (a, b) => b.filedOn.localeCompare(a.filedOn) || a.id.localeCompare(b.id),
    )[P.zero];
  const contest = filing
    ? (state.table("contests").get(filing.contestId) as unknown as
        ContestRow | undefined)
    : undefined;
  return filing && contest ? { filing, contest } : null;
}

/**
 * The speech a record's scene plays, composed by the one planner: the floor before the
 * roll is the member's floor speech, for the one of its two speakers the
 * scene cast (`castIds`); a candidate's speech the player heard
 * (speech.heard) is their campaign speech for the race they are running in.
 * Null where the record is neither or the planner has nothing to say (a
 * state or federal chamber, a race above the town).
 */
export function speechOfRecord(
  core: CoreState,
  record: LogRecord,
  castIds: readonly PersonId[],
): HeardSpeech | null {
  const facts = record.facts ?? {};
  // A candidate's statements on the stump, not a remark at a meeting.
  const campaignSpeech =
    record.kind === SPEECH_HEARD &&
    !!record.personIds[P.zero] &&
    record.id.startsWith(
      statementSpeechPrefix(record.personIds[P.zero]!, record.date),
    );
  const speech =
    record.kind === "floor-debate"
      ? (() => {
          const speakerId = [facts.forId, facts.againstId].find((id) =>
            castIds.includes(id as PersonId),
          ) as PersonId | undefined;
          return speakerId && facts.billId
            ? composeFloorSpeech(core, String(facts.billId), speakerId)
            : null;
        })()
      : campaignSpeech
        ? (() => {
            const speakerId = record.personIds[P.zero] as PersonId;
            const race = standingFiling(core, speakerId);
            return race
              ? composeCampaignSpeech(
                  core,
                  speakerId,
                  race.contest.officeId,
                  race.filing.party ?? null,
                )
              : null;
          })()
        : null;
  if (!speech) {
    // stopgapId: SG-WORDS-floor-speech-state-chambers
    if (record.kind === "floor-debate" || campaignSpeech)
      markWordsStopgap("SG-WORDS-floor-speech-state-chambers");
    return null;
  }
  return {
    speakerId: speech.speakerId,
    text: speech.sentences.map((row) => row.text).join(" "),
    parts: speech.parts,
    sourceRecordIds: [record.id],
    opens: speech.kind === "floor",
  };
}
