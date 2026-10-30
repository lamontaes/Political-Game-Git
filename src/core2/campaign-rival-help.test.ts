/**
 * A candidate never helps a rival in their own race (pool item
 * campaign-candidates-never-help-a-rival; a played year in Moundridge,
 * Kansas showed a resident filed for the player's council seat walking the
 * player's doors and hosting the player's donor meeting). In a place drawn
 * from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one), two
 * residents file for one contest. Each has every reason to help the other
 * (time spent together, an ask through a group whose cause they share), yet
 * neither is enlisted as the other's volunteer, chosen or seated at the
 * other's donor meeting, or gives the other an endorsement, because the
 * elections engine's ballot shows them standing in the same race
 * (`rivalFiling`). A resident who is not running, asked by the same call
 * with the same reasons, is enlisted.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { decisionLean, decisionTraitWeight } from "./trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  askForEndorsement,
  askToVolunteer,
  campaignFor,
  donorMeetingHost,
  donorMeetingInvitees,
  endorsementsOf,
  holdDonorMeeting,
  hostCircle,
  openCampaigns,
  rivalFiling,
  volunteerReason,
  type CampaignRow,
  type VolunteerAsk,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";
import { PLATFORM_QUESTIONS } from "./campaign-views";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-rival-help:${Date.now()}`)
    .digest("hex");
/** Places drawn, each on its own salt, before the test gives up. */
const DRAWS = 8;
/** Hours two residents spend together so each has a tie to the other. */
const TIME_TOGETHER = 40;

function world(salt: number) {
  const place = drawPlace(runSeed, `campaign-rival-help:${salt}`);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  ) as CoreState;
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const town = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string }
  ).townPlaceId;
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  // Residents of the town old enough to file for any local seat.
  const residents = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  return { core, api, residents, where };
}

/** A standing filing for the person in the contest, or null when the clerk refuses it. */
function file(
  api: CoreAPI,
  personId: string,
  contestId: string,
  position: number,
): FilingRow | null {
  const filed = fileCandidacy(api, {
    personId,
    contestId,
    platform: [`${PLATFORM_QUESTIONS[0]}=${position}`],
  });
  return filed.status !== "refused" &&
    ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    ? filed.filing
    : null;
}

/** The sum `askToVolunteer` settles (reasons plus the trait lean), read without asking. */
function volunteerScore(
  core: CoreState,
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
  ask: VolunteerAsk,
): number {
  return (
    volunteerReason(api, campaign, person, ask) +
    decisionLean(core, person, "campaigns.volunteer", "volunteer", "decline") *
      decisionTraitWeight(core, "campaigns.volunteer")
  );
}

/**
 * Two residents filed for one local contest, the second with every reason to
 * volunteer for the first, and a third resident not running whose reasons
 * say yes to the same ask; or the reason none could be found.
 */
function rivalRace(salt: number) {
  const { core, api, residents, where } = world(salt);
  const meet = (a: PersonState, b: PersonState) =>
    api.meet(a.id, b.id, {
      placeId: a.householdId,
      sourceId: `test:campaign-rival-help:${a.id}:${b.id}`,
      cause: "neighbors",
      hours: TIME_TOGETHER,
    });
  // The player's own race, as in the played year: a local seat.
  let first: { person: PersonState; filing: FilingRow } | null = null;
  for (const person of residents) {
    const open = openContests(api).filter(
      (c: ContestRow) => c.level !== "federal" && c.level !== "state",
    );
    for (const contest of open) {
      const filing = file(api, person.id, contest.id, 1);
      if (filing) {
        first = { person, filing };
        break;
      }
    }
    if (first) break;
  }
  if (!first) return { where, why: "nobody could file for a local seat" };
  core.playerId = first.person.id;
  const mine = campaignFor(api, first.filing.id);
  // Asked through a group that backs the candidate, by the candidate, for a
  // cause the person fully shares.
  const askFor = (candidateId: string): VolunteerAsk => ({
    askerId: candidateId,
    stake: 1,
  });
  const ask = askFor(first.person.id);
  const zero = api.parameter("zero");
  // The rival: someone whose reasons say yes to volunteering for the first
  // candidate, who then files in the same contest.
  let second: { person: PersonState; filing: FilingRow } | null = null;
  for (const person of residents) {
    if (person.id === first.person.id) continue;
    meet(person, first.person);
    if (volunteerScore(core, api, mine, person, ask) <= zero) continue;
    const filing = file(api, person.id, first.filing.contestId, -1);
    if (filing) {
      second = { person, filing };
      break;
    }
  }
  if (!second)
    return {
      where,
      why: "no resident whose reasons say yes could file in the same contest",
    };
  // The helper: a resident not running, asked by the same call.
  let helper: PersonState | null = null;
  for (const person of residents) {
    if (person.id === first.person.id || person.id === second.person.id)
      continue;
    meet(person, first.person);
    meet(person, second.person);
    if (volunteerScore(core, api, mine, person, ask) > zero) {
      helper = person;
      break;
    }
  }
  if (!helper) return { where, why: "no resident not running says yes" };
  return { core, api, where, first, second, helper, askFor, mine };
}

describe("a candidate never helps a rival in their own race", () => {
  it("a rival is not enlisted, seated at a donor meeting or endorsing, by filing id; a resident not running is enlisted", () => {
    const tried: string[] = [];
    let race: Exclude<ReturnType<typeof rivalRace>, { why: string }> | null =
      null;
    for (let salt = 0; salt < DRAWS && !race; salt += 1) {
      const drawn = rivalRace(salt);
      if ("why" in drawn) tried.push(`${drawn.where}: ${drawn.why}`);
      else race = drawn;
    }
    expect(race, `no draw held a rival race:\n${tried.join("\n")}`).not.toBe(
      null,
    );
    const { core, api, where, first, second, helper, askFor, mine } = race!;
    const [a, b] = [first.person, second.person];
    const [fa, fb] = [first.filing, second.filing];
    const theirs = campaignFor(api, fb.id);
    console.log(
      `${where}: contest ${fa.contestId}; ${a.id} filed ${fa.id}; ${b.id} filed ${fb.id}; ${helper.id} not running`,
    );

    // The ballot is the one reader: each is the other's rival by filing id.
    expect(rivalFiling(api, mine, b.id)?.id, where).toBe(fb.id);
    expect(rivalFiling(api, theirs, a.id)?.id, where).toBe(fa.id);
    expect(rivalFiling(api, mine, helper.id), where).toBeNull();
    expect(rivalFiling(api, mine, a.id), `${where}: own campaign`).toBeNull();

    // Volunteering: the rival's reasons say yes, and only the race stops it.
    const zero = api.parameter("zero");
    expect(
      volunteerScore(core, api, mine, b, askFor(a.id)),
      `${where}: ${b.id}'s reasons for ${fa.id}`,
    ).toBeGreaterThan(zero);
    expect(
      askToVolunteer(api, fa.id, b.id, askFor(a.id)),
      `${where}: ${b.id} (${fb.id}) volunteers for ${fa.id}`,
    ).toBe(false);
    expect(
      askToVolunteer(api, fb.id, a.id, askFor(b.id)),
      `${where}: ${a.id} (${fa.id}) volunteers for ${fb.id}`,
    ).toBe(false);
    expect(
      askToVolunteer(api, fa.id, helper.id, askFor(a.id)),
      `${where}: ${helper.id} asked for ${fa.id}`,
    ).toBe(true);
    expect(campaignFor(api, fa.id).volunteerIds).toContain(helper.id);
    expect(campaignFor(api, fa.id).volunteerIds).not.toContain(b.id);
    expect(campaignFor(api, fb.id).volunteerIds).not.toContain(a.id);

    // Donor meetings: each knows the other, yet neither hosts, is seated in
    // a host's circle, is invited or holds the other's evening.
    expect(core.people.get(a.id)!.knownIds.has(b.id), where).toBe(true);
    expect(core.people.get(helper.id)!.knownIds.has(b.id), where).toBe(true);
    expect(donorMeetingHost(api, campaignFor(api, fa.id)), where).not.toBe(
      b.id,
    );
    expect(donorMeetingHost(api, campaignFor(api, fb.id)), where).not.toBe(
      a.id,
    );
    expect(hostCircle(api, campaignFor(api, fa.id), helper.id)).not.toContain(
      b.id,
    );
    expect(
      donorMeetingInvitees(api, campaignFor(api, fa.id), helper.id),
    ).not.toContain(b.id);
    expect(
      donorMeetingInvitees(api, campaignFor(api, fb.id), helper.id),
    ).not.toContain(a.id);
    expect(holdDonorMeeting(api, fa.id, b.id), where).toBeNull();
    expect(holdDonorMeeting(api, fb.id, a.id), where).toBeNull();

    // Endorsement: asked, each backs their own run, named by filing id.
    expect(askForEndorsement(api, fa.id, b.id), where).toBe(false);
    expect(askForEndorsement(api, fb.id, a.id), where).toBe(false);
    const answer = (filingId: string, speakerId: string) =>
      endorsementsOf(api, filingId).find(
        (row) => row.speakerId === speakerId && row.organizationId === null,
      );
    expect(answer(fa.id, b.id)).toMatchObject({
      answer: "no",
      reason: "prefers-rival",
      rivalFilingId: fb.id,
    });
    expect(answer(fb.id, a.id)).toMatchObject({
      answer: "no",
      reason: "prefers-rival",
      rivalFilingId: fa.id,
    });
  });
});
