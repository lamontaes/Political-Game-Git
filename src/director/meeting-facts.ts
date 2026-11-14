/**
 * What two people who are just meeting, or just becoming friends, share, read
 * from the records the world already keeps: the employer both work for and
 * the job the newcomer started (the jobs engine), the school they were both
 * at in one school year and the school their children share (the school
 * engine), the party both belong to (the parties engine) and the town one
 * lives in when it is not the other's. The first meeting and the invitation
 * between friends both read it; each fact is cited to the records it came
 * from, and the bank's lines name only the facts present.
 *
 * Nothing here is invented: a fact with no record behind it is left out, and
 * the lines that need it never play. (No record keeps a church or a club, so
 * none is named; SG-WORDS-meeting-no-club-records.)
 */
import { ageOnDate } from "../core2/kernel/dates";
import {
  PARTIES_MODULE_ID,
  partiesHere,
  partyTie,
} from "../core2/modules/elections";
import { attendedSchool, sharedHistory } from "../core2/past";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { withArticle } from "../english/journal-words";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { organizationName, spoken } from "./words";

export interface MeetingFact {
  text: string;
  sourceRecordIds: string[];
}

/** The situation types that read these facts. */
export const MEETING_TYPES: readonly string[] = [
  "first-meeting",
  "becoming-friends",
];

/** A party the rolls name only as a ballot line, not a party people belong to. */
const NOT_A_PARTY = /^(blank|others?)$/i;

/** A party as people name it: "the Democratic Party". */
function partySaid(name: string): string {
  return /party$/i.test(name) ? name : `${name} Party`;
}

/** The children of a person's household, alive, other than the two in the scene. */
function childrenOf(
  core: Readonly<CoreState>,
  personId: PersonId,
  leave: readonly PersonId[],
) {
  const home = core.people.get(personId)?.householdId;
  return (core.households.get(home ?? "")?.memberIds ?? [])
    .map((id) => core.people.get(id as PersonId))
    .filter(
      (row) =>
        row?.alive &&
        row.id !== personId &&
        !leave.includes(row.id) &&
        ageOnDate(row.birthDate, core.date) <
          rulesFile.familyStakes.youngChildAge.value,
    )
    .sort(
      (a, b) =>
        b!.birthDate.localeCompare(a!.birthDate) || a!.id.localeCompare(b!.id),
    ) as NonNullable<ReturnType<CoreState["people"]["get"]>>[];
}

/**
 * The facts the records give a scene between `askerId` and `askedId`, for a
 * first meeting (the cause is the job the asker started) or a tie that grew.
 * Empty for any other type.
 */
export function meetingFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, MeetingFact> {
  const facts: Record<string, MeetingFact> = {};
  if (!MEETING_TYPES.includes(typeKey)) return facts;
  const asker = core.people.get(askerId);
  const asked = core.people.get(askedId);
  if (!asker || !asked) return facts;
  const flag = (key: string, ids: string[], text = "yes") => {
    facts[key] = { text, sourceRecordIds: ids };
  };

  // Work: the employer both are at now, and, for a first meeting, the job the
  // newcomer started (the cause) and whether the two have the same job.
  const history = sharedHistory(core, askerId, askedId);
  const shared = history.find((row) => row.kind === "coworker" && !row.endedOn);
  const org = shared ? core.organizations.get(shared.recordId) : undefined;
  if (shared && org)
    flag("employer", [shared.recordId, causeId], organizationName(org));
  const started =
    typeKey === "first-meeting" ? core.jobs.get(causeId) : undefined;
  const askerJob =
    started && started.personId === askerId
      ? started
      : asker.jobId
        ? core.jobs.get(asker.jobId)
        : undefined;
  const askedJob = asked.jobId ? core.jobs.get(asked.jobId) : undefined;
  if (shared && askerJob && typeKey === "first-meeting")
    flag(
      "position",
      [askerJob.id, shared.recordId],
      withArticle(askerJob.title),
    );
  if (
    shared &&
    askerJob &&
    askedJob &&
    askerJob.title.toLowerCase() === askedJob.title.toLowerCase()
  )
    flag("same-job", [askerJob.id, askedJob.id]);

  // School: both in one school's year, from the school engine's attended rows.
  const schoolmates = history.find((row) => row.kind === "schoolmate");
  const schoolOrg = schoolmates
    ? core.organizations.get(schoolmates.recordId)
    : undefined;
  if (schoolmates && schoolOrg) {
    flag("schoolmate", [schoolmates.recordId]);
    flag("school", [schoolmates.recordId], organizationName(schoolOrg));
  }

  // Their children at one school in one school year: the asker's youngest at
  // that school, and a child in the asked's household there too.
  if (asker.householdId !== asked.householdId) {
    const theirs = childrenOf(core, askerId, [askedId]);
    const yours = childrenOf(core, askedId, [askerId]);
    for (const child of theirs) {
      const at = attendedSchool(core, child.id);
      if (!at) continue;
      const match = yours.find((row) => {
        const there = attendedSchool(core, row.id);
        return there?.schoolId === at.schoolId && there.year === at.year;
      });
      const school = core.organizations.get(at.schoolId);
      if (!match || !school) continue;
      flag("kids-school", [at.schoolId, child.id, match.id]);
      flag("child", [child.id, at.schoolId], child.givenName);
      if (!schoolmates) flag("school", [at.schoolId], organizationName(school));
      break;
    }
  }

  // The party both belong to, from the parties engine's ties and rolls.
  if (core.modules.has(PARTIES_MODULE_ID)) {
    const api = coreAPI(core as CoreState);
    const one = partyTie(api, askerId);
    const other = partyTie(api, askedId);
    if (one?.partyId && one.tie === "party" && one.partyId === other?.partyId) {
      const party = partiesHere(api).find((row) => row.id === one.partyId);
      if (party && !NOT_A_PARTY.test(party.name))
        flag("party", [party.id, one.id, other.id], partySaid(party.name));
    }
  }

  // Where they live, when the asker's town is not the one the scene is in.
  if (asker.placeId !== asked.placeId) {
    const town = corePlaceByJurisdictionId(asker.placeId as never);
    if (town) flag("hometown", [asker.placeId], spoken(town));
  }
  return facts;
}
