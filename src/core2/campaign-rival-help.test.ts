/**
 * A candidate never helps a rival in their own race (pool item
 * campaign-candidates-never-help-a-rival; a played year showed a resident
 * filed for the player's council seat walking the player's doors and hosting
 * the player's donor meeting). In a place drawn from all 56 on a seed nobody
 * chose (GOLDEN_PATH_SEED pins one), two residents file for one contest,
 * neither of them the player. The second has every reason to help the first
 * (time spent together, an ask for a cause they share, a weighing that would
 * endorse the first were they not running, reasons and a temperament that
 * would bring them to the first's evenings, and the first's campaign chose
 * them to host its donor meeting before they filed), and the first's own
 * reasons would volunteer for the second in turn, yet neither is enlisted as
 * the other's volunteer (asked, or saying yes at home), seated at or invited
 * to the other's donor meeting, or gives the other an endorsement, and the
 * second neither comes to the first's events nor is chosen to host or holds
 * its donor meeting, because the elections engine's ballot shows them
 * standing in the same race (`rivalFiling`). A resident not running, asked by
 * the same call with the same reasons, is enlisted; when that volunteer then
 * files in the same race the filing takes them off the campaign that day,
 * kept with the filing, they no longer come to its events though their
 * reasons would bring them, and the work they shared with the candidate stays
 * on their shared history. A resident whose reasons would run the campaign
 * runs it when asked; once they file, the filing takes them off its staff,
 * and neither another ask, a yes at home nor word of the filing reaching them
 * (the campaign engine's daily weighing of who has heard) puts them back.
 *
 * The group path, in twin worlds built from one draw that differ only in one
 * filing: a town organization backs a candidate on the campaign engine's own
 * turn and sends members to its doors; a member it sent in the twin where
 * nobody else runs is not sent once they file in the race, and the group
 * whose speaker files backs no rival in it.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { decisionLean, decisionTraitWeight } from "./trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  checkEligibility,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  askForEndorsement,
  askToVolunteer,
  campaignFor,
  donorMeetingHost,
  donorMeetingInvitees,
  endorsementWeighing,
  endorsementsOf,
  enlistVolunteer,
  eveningReason,
  holdDonorMeeting,
  hostCircle,
  askToManage,
  managerReason,
  offerReason,
  openCampaigns,
  organizedGroupsIn,
  rivalFiling,
  VOLUNTEER_OFFERED_EVENT,
  volunteerReason,
  whoComes,
  type CampaignRow,
  type EndorsementRow,
  type VolunteerAsk,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { agreementWith, viewsModule } from "./modules/views";
import { sharedHistory } from "./shared-history";
import {
  PLATFORM_QUESTIONS,
  campaignParameter,
  personLean,
} from "./campaign-views";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-rival-help:${Date.now()}`)
    .digest("hex");
/** Places drawn, each on its own salt, before the test gives up. */
const DRAWS = 8;
/**
 * Places the group case draws before it gives up. Few towns hold a group
 * member who could file in the race and has reason to give its campaign their
 * evenings (most draws find only a party's members, who have none), so it
 * searches wider: a draw it passes over costs about two seconds (Checker 4,
 * Nov 1: 0 of 8 on four fresh seeds; one seed needed 32 draws).
 */
const GROUP_DRAWS = 96;
/** Hours two residents spend together so each has a tie to the other. */
const TIME_TOGETHER = 40;
/** Hours a candidate spends telling someone they filed, so word of it has reached them (`offersToHelp` reads the tie's last contact). */
const TOLD_HOURS = 1;
/** A test that builds and runs twin worlds for each draw it tries. */
const TWIN_TIMEOUT = 600_000;

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
  return { core, api, town, residents, where };
}

/** Two residents spend time together, so each has a tie to the other. */
const meet = (api: CoreAPI, a: PersonState, b: PersonState) =>
  api.meet(a.id, b.id, {
    placeId: a.householdId,
    sourceId: `test:campaign-rival-help:${a.id}:${b.id}`,
    cause: "neighbors",
    hours: TIME_TOGETHER,
  });

/** The local contests open for filing today. */
const localContests = (api: CoreAPI): readonly ContestRow[] =>
  openContests(api).filter(
    (c: ContestRow) => c.level !== "federal" && c.level !== "state",
  );

/** Whether the clerk's rules would take the person's filing in the contest today (a read; nothing is filed). */
const canFile = (api: CoreAPI, personId: string, contestId: string) =>
  checkEligibility(api, personId, contestId, null).every((c) => c.met);

/** A standing filing for the person in the contest on one question, or null when the clerk refuses it. */
function file(
  api: CoreAPI,
  personId: string,
  contestId: string,
  position: number,
  question: string = PLATFORM_QUESTIONS[0]!,
): FilingRow | null {
  const filed = fileCandidacy(api, {
    personId,
    contestId,
    platform: [`${question}=${position}`],
  });
  return filed.status !== "refused" &&
    ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    ? filed.filing
    : null;
}

/** A reason plus the trait lean of giving a campaign one's time (`campaigns.volunteer`), the sum the engine settles it by, read without asking. */
const withVolunteerLean = (
  core: CoreState,
  person: Readonly<PersonState>,
  reason: number,
) =>
  reason +
  decisionLean(core, person, "campaigns.volunteer", "volunteer", "decline") *
    decisionTraitWeight(core, "campaigns.volunteer");

/** The sum `askToVolunteer` settles (reasons plus the trait lean), read without asking. */
const volunteerScore = (
  core: CoreState,
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
  ask: VolunteerAsk,
) =>
  withVolunteerLean(core, person, volunteerReason(api, campaign, person, ask));

/** The sum `askToManage` settles, and `offersToHelp` when it weighs someone to run the campaign, read without asking. */
const managerScore = (
  core: CoreState,
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
) => withVolunteerLean(core, person, managerReason(api, campaign, person));

/** The sum `offersToHelp` settles when it weighs someone giving the campaign their evenings unasked, read without asking. */
const offerScore = (
  core: CoreState,
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
) => withVolunteerLean(core, person, offerReason(api, campaign, person));

/** The trait decisions that settle an evening's reasons: coming to a candidate's event (`whoComes`), and lending one's home for their donor meeting (`holdDonorMeeting`). */
const ATTEND = {
  id: "parties.attend",
  yes: "attend",
  no: "stay-home",
} as const;
const HOST = {
  id: "campaigns.volunteer",
  yes: "volunteer",
  no: "decline",
} as const;

/** The sum an evening's decision settles (`eveningReason` plus the trait lean), read without asking. */
function eveningScore(
  core: CoreState,
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
  decision: typeof ATTEND | typeof HOST,
): number {
  return (
    eveningReason(api, campaign, person, 0) +
    decisionLean(core, person, decision.id, decision.yes, decision.no) *
      decisionTraitWeight(core, decision.id)
  );
}

/**
 * Two residents filed for one local contest on the same platform, neither
 * the player: the second with every reason to volunteer for the first and
 * come to the first's events, the host the first's campaign chose and a
 * weighing that endorsed the first before they filed, and whose rival's own
 * reasons say yes to volunteering for them in turn; a third resident not
 * running, able to file in the same contest, whose reasons say yes to the
 * same ask and to coming to the first's events; and a fourth, not running and
 * able to file, whose reasons would run the first's campaign and offer it
 * their evenings unasked; or the reason none could be found.
 */
function rivalRace(salt: number) {
  const { core, api, residents, where } = world(salt);
  // A local seat, as in the played year. Nobody is the player, so every
  // donor-meeting check below reads the race, not the player's own
  // exclusion.
  expect(core.playerId, where).toBeUndefined();
  let first: { person: PersonState; filing: FilingRow } | null = null;
  for (const person of residents) {
    for (const contest of localContests(api)) {
      const filing = file(api, person.id, contest.id, 1);
      if (filing) {
        first = { person, filing };
        break;
      }
    }
    if (first) break;
  }
  if (!first) return { where, why: "nobody could file for a local seat" };
  const mine = campaignFor(api, first.filing.id);
  // Asked by the candidate, for a cause the person fully shares.
  const askFor = (candidateId: string): VolunteerAsk => ({
    askerId: candidateId,
    stake: 1,
  });
  const ask = askFor(first.person.id);
  const zero = api.parameter("zero");
  // The rival: someone whose reasons say yes to volunteering for the first
  // candidate and coming to their events, whose own weighing endorses them
  // and whom their campaign would choose to host its donor meeting while
  // they are not running, who then files in the same contest on the same
  // platform.
  let second: {
    person: PersonState;
    filing: FilingRow;
    before: ReturnType<typeof endorsementWeighing>;
    hostAfter: string | null;
  } | null = null;
  for (const person of residents) {
    if (person.id === first.person.id) continue;
    meet(api, person, first.person);
    if (volunteerScore(core, api, mine, person, ask) <= zero) continue;
    if (eveningScore(core, api, mine, person, ATTEND) <= zero) continue;
    if (!canFile(api, person.id, first.filing.contestId)) continue;
    const before = endorsementWeighing(api, mine, person);
    if (!before.yes) continue;
    if (donorMeetingHost(api, campaignFor(api, first.filing.id)) !== person.id)
      continue;
    const filing = file(api, person.id, first.filing.contestId, 1);
    if (filing) {
      // The same read the moment they stand in the race, nothing else
      // changed: the twin of the world where they did not file.
      const hostAfter = donorMeetingHost(
        api,
        campaignFor(api, first.filing.id),
      );
      second = { person, filing, before, hostAfter };
      break;
    }
  }
  if (!second)
    return {
      where,
      why: "no resident whose reasons say yes to volunteering, coming and endorsing, and whom the campaign would choose to host, could file in the same contest",
    };
  // Both ways: the first candidate's own reasons, asked by the rival for the
  // rival's run, say yes too, so only the race keeps either off the other's
  // campaign.
  if (
    volunteerScore(
      core,
      api,
      campaignFor(api, second.filing.id),
      first.person,
      askFor(second.person.id),
    ) <= zero
  )
    return {
      where,
      why: `${first.person.id}'s own reasons say no to volunteering for ${second.filing.id}`,
    };
  // The helper: a resident not running, asked by the same call, whose
  // reasons and temperament would also bring them to the first's evenings.
  let helper: PersonState | null = null;
  for (const person of residents) {
    if (person.id === first.person.id || person.id === second.person.id)
      continue;
    meet(api, person, first.person);
    meet(api, person, second.person);
    if (
      volunteerScore(core, api, mine, person, ask) > zero &&
      eveningScore(core, api, mine, person, ATTEND) > zero &&
      canFile(api, person.id, first.filing.contestId)
    ) {
      helper = person;
      break;
    }
  }
  if (!helper)
    return {
      where,
      why: "no resident not running says yes to volunteering and coming and could file",
    };
  // The manager: a resident not running whose own reasons would run the
  // first's campaign when asked (`askToManage`) and, once word of the filing
  // reaches them, offer to run it or give it their evenings (`offersToHelp`).
  let manager: PersonState | null = null;
  for (const person of residents) {
    if ([first.person.id, second.person.id, helper.id].includes(person.id))
      continue;
    meet(api, person, first.person);
    if (
      managerScore(core, api, mine, person) > zero &&
      offerScore(core, api, mine, person) > zero &&
      canFile(api, person.id, first.filing.contestId)
    ) {
      manager = person;
      break;
    }
  }
  if (!manager)
    return {
      where,
      why: "no resident not running would run the campaign and could file",
    };
  return { core, api, where, first, second, helper, manager, askFor, mine };
}

type Race = Exclude<ReturnType<typeof rivalRace>, { why: string }>;

/** The first draw that holds a rival race, or a failure naming every place tried. */
function findRace(): Race {
  const tried: string[] = [];
  for (let salt = 0; salt < DRAWS; salt += 1) {
    const drawn = rivalRace(salt);
    if ("why" in drawn) tried.push(`${drawn.where}: ${drawn.why}`);
    else return drawn;
  }
  throw new Error(`no draw held a rival race:\n${tried.join("\n")}`);
}

/**
 * A town organization with a speaker and a stance (as `organizedGroupsIn`
 * reads the engines that keep them; the one with the most residents
 * belonging), a resident outside it who files in a local contest on its
 * side of the question it holds most firmly, and the member with the most
 * reason to give that campaign their evenings when the group asks (time
 * with the candidate and with the speaker, their own share in its stance),
 * of those who could file in the race today; or why none. The same draw
 * gives the same answer, so a twin world built from it differs only in what
 * the caller does next.
 */
function groupedRace(salt: number) {
  const w = world(salt);
  const { core, api, town, residents, where } = w;
  const residentIds = new Set(residents.map((p) => p.id));
  const group = organizedGroupsIn(api, town)
    .filter(
      (g) =>
        !!g.speakerId &&
        !!core.people.get(g.speakerId)?.alive &&
        g.stance.length > 0,
    )
    .map((g) => ({
      g,
      count: g.memberIds.filter((id) => residentIds.has(id)).length,
    }))
    .sort(
      (x, y) =>
        y.count - x.count ||
        x.g.organizationId.localeCompare(y.g.organizationId),
    )[0]?.g;
  if (!group)
    return {
      where,
      why: "no organization in town with a speaker and a stance",
    };
  const firmest = [...group.stance].sort(
    (x, y) =>
      Math.abs(y.position) - Math.abs(x.position) ||
      x.question.localeCompare(y.question),
  )[0]!;
  const side = {
    question: firmest.question,
    position: firmest.position < 0 ? -1 : 1,
  };
  let a: { person: PersonState; filing: FilingRow } | null = null;
  for (const person of residents) {
    if (group.memberIds.includes(person.id) || person.id === group.speakerId)
      continue;
    for (const contest of localContests(api)) {
      const filing = file(
        api,
        person.id,
        contest.id,
        side.position,
        side.question,
      );
      if (filing) {
        a = { person, filing };
        break;
      }
    }
    if (a) break;
  }
  if (!a)
    return {
      where,
      why: `nobody outside ${group.organizationId} could file for a local seat`,
    };
  const contestId = a.filing.contestId;
  // Who of the group could file in the same contest today.
  const couldFile = new Set(
    [group.speakerId!, ...group.memberIds].filter(
      (id) => residentIds.has(id) && canFile(api, id, contestId),
    ),
  );
  const speaker = core.people.get(group.speakerId!)!;
  const campaign = campaignFor(api, a.filing.id);
  const townLean = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as {
      lean: number;
    }
  ).lean;
  const zero = api.parameter("zero");
  let member: { id: string; score: number } | null = null;
  for (const id of [...couldFile].sort()) {
    if (id === speaker.id) continue;
    const person = core.people.get(id)!;
    meet(api, person, a.person);
    meet(api, person, speaker);
    // The ask the group makes on its turn (`groupsWeighRace`).
    const score = volunteerScore(core, api, campaign, person, {
      askerId: speaker.id,
      stake: agreementWith(
        api,
        id,
        personLean(core.people, person, townLean),
        group.stance,
      ),
    });
    if (score > zero && (!member || score > member.score))
      member = { id, score };
  }
  return { ...w, group, side, a, couldFile, member };
}

type Grouped = Exclude<ReturnType<typeof groupedRace>, { why: string }>;

/** The campaign engine's turn, on its own module calendar (no hand call): the town's organizations weigh the race, then its campaigns work. */
const campaignTurnPasses = (core: CoreState) =>
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), campaignParameter("campaignTurnDays")),
  );

/** The group's endorsement of a filing, when it gave one. */
const groupBacking = (
  api: CoreAPI,
  filingId: string,
  organizationId: string,
): EndorsementRow | null =>
  endorsementsOf(api, filingId).find(
    (row) => row.organizationId === organizationId && row.answer === "yes",
  ) ?? null;

/** The twin built from the same draw, checked to be the same race before it diverges. */
function twinOf(salt: number, control: Grouped): Grouped {
  const twin = groupedRace(salt);
  expect("why" in twin, control.where).toBe(false);
  const held = twin as Grouped;
  expect(held.group.organizationId, control.where).toBe(
    control.group.organizationId,
  );
  expect(held.a.filing.id, control.where).toBe(control.a.filing.id);
  return held;
}

describe("a candidate never helps a rival in their own race", () => {
  it("a rival is not enlisted, seated at a donor meeting or endorsing, by filing id; a resident not running is enlisted", () => {
    const { core, api, where, first, second, helper, askFor, mine } =
      findRace();
    const [a, b] = [first.person, second.person];
    const [fa, fb] = [first.filing, second.filing];
    const theirs = campaignFor(api, fb.id);
    console.log(
      `${where}: contest ${fa.contestId}; ${a.id} filed ${fa.id}; ${b.id} filed ${fb.id}; ${helper.id} not running`,
    );
    for (const id of [a.id, b.id, helper.id])
      expect(id, `${where}: nobody here is the player`).not.toBe(core.playerId);

    // The ballot is the one reader: each is the other's rival by filing id.
    expect(rivalFiling(api, mine, b.id)?.id, where).toBe(fb.id);
    expect(rivalFiling(api, theirs, a.id)?.id, where).toBe(fa.id);
    expect(rivalFiling(api, mine, helper.id), where).toBeNull();
    expect(rivalFiling(api, mine, a.id), `${where}: own campaign`).toBeNull();

    // Volunteering: each rival's reasons say yes to the other's ask, and only
    // the race stops it.
    const zero = api.parameter("zero");
    expect(
      volunteerScore(core, api, mine, b, askFor(a.id)),
      `${where}: ${b.id}'s reasons for ${fa.id}`,
    ).toBeGreaterThan(zero);
    expect(
      volunteerScore(core, api, theirs, a, askFor(b.id)),
      `${where}: ${a.id}'s reasons for ${fb.id}`,
    ).toBeGreaterThan(zero);
    expect(
      askToVolunteer(api, fa.id, b.id, askFor(a.id)),
      `${where}: ${b.id} (${fb.id}) volunteers for ${fa.id}`,
    ).toBe(false);
    expect(
      askToVolunteer(api, fb.id, a.id, askFor(b.id)),
      `${where}: ${a.id} (${fa.id}) volunteers for ${fb.id}`,
    ).toBe(false);
    // Said yes to a's face at home (the director's talk after a filing), the
    // rival is still not counted among a's volunteers.
    expect(
      enlistVolunteer(api, fa.id, b.id),
      `${where}: ${b.id} (${fb.id}) enlisted for ${fa.id}`,
    ).toBe(false);
    expect(
      askToVolunteer(api, fa.id, helper.id, askFor(a.id)),
      `${where}: ${helper.id} asked for ${fa.id}`,
    ).toBe(true);
    expect(campaignFor(api, fa.id).volunteerIds).toContain(helper.id);
    expect(campaignFor(api, fa.id).volunteerIds).not.toContain(b.id);
    expect(campaignFor(api, fb.id).volunteerIds).not.toContain(a.id);

    // Events: b is in a's own circle, so a's campaign reaches them, and b's
    // reasons (warmth, agreement with the platform they share, how they stand
    // with a) and temperament would bring them to a's evenings; only the
    // race keeps them home.
    expect(core.people.get(a.id)!.knownIds.has(b.id), where).toBe(true);
    expect(
      eveningScore(core, api, campaignFor(api, fa.id), b, ATTEND),
      `${where}: ${b.id}'s reasons to come to ${fa.id}'s events`,
    ).toBeGreaterThan(zero);
    expect(
      whoComes(api, campaignFor(api, fa.id)),
      `${where}: ${b.id} (${fb.id}) comes to ${fa.id}'s events`,
    ).not.toContain(b.id);

    // Donor meetings: each knows the other and the helper knows both, all
    // adults in town and none the player, yet neither rival is seated in the
    // helper's circle for the other's meeting or invited to it; and b, the
    // host a's campaign chose while b was not running, whose reasons and
    // temperament would still lend their home for a's evening, is no longer
    // chosen once they file, nor holds it.
    expect(core.people.get(helper.id)!.knownIds.has(a.id), where).toBe(true);
    expect(core.people.get(helper.id)!.knownIds.has(b.id), where).toBe(true);
    expect(
      hostCircle(api, campaignFor(api, fa.id), helper.id),
      `${where}: ${b.id} in ${helper.id}'s circle for ${fa.id}`,
    ).not.toContain(b.id);
    expect(
      hostCircle(api, campaignFor(api, fb.id), helper.id),
      `${where}: ${a.id} in ${helper.id}'s circle for ${fb.id}`,
    ).not.toContain(a.id);
    expect(
      donorMeetingInvitees(api, campaignFor(api, fa.id), helper.id),
    ).not.toContain(b.id);
    expect(
      donorMeetingInvitees(api, campaignFor(api, fb.id), helper.id),
    ).not.toContain(a.id);
    expect(
      eveningScore(core, api, campaignFor(api, fa.id), b, HOST),
      `${where}: ${b.id}'s reasons to host for ${fa.id}`,
    ).toBeGreaterThan(zero);
    expect(
      second.hostAfter,
      `${where}: ${fa.id}'s donor-meeting host, chosen while ${b.id} was not running, once ${b.id} filed ${fb.id}`,
    ).not.toBe(b.id);
    expect(
      holdDonorMeeting(api, fa.id, b.id),
      `${where}: ${b.id} (${fb.id}) holds ${fa.id}'s donor meeting`,
    ).toBeNull();

    // Endorsement: before filing, b's own weighing endorsed fa (nobody but a
    // standing). Filed on the same platform, b's own run draws less of b's
    // backing than fa does (the same agreement, and no tie to oneself), so
    // nothing in the weighing but the race says no.
    expect(
      second.before.yes,
      `${where}: ${b.id} endorses ${fa.id} unfiled`,
    ).toBe(true);
    expect(second.before.score, where).toBeGreaterThan(zero);
    expect(askForEndorsement(api, fa.id, b.id), where).toBe(false);
    expect(askForEndorsement(api, fb.id, a.id), where).toBe(false);
    const answer = (filingId: string, speakerId: string) =>
      endorsementsOf(api, filingId).find(
        (row) => row.speakerId === speakerId && row.organizationId === null,
      );
    const bOnA = answer(fa.id, b.id)!;
    expect(bOnA).toMatchObject({
      answer: "no",
      reason: "prefers-rival",
      rivalFilingId: fb.id,
      backing: second.before.backing,
    });
    expect(bOnA.tie, `${where}: ${b.id}'s tie to ${a.id}`).toBeGreaterThan(
      zero,
    );
    expect(
      bOnA.rivalBacking!,
      `${where}: ${b.id}'s backing of their own ${fb.id} against ${fa.id}`,
    ).toBeLessThan(bOnA.backing);
    expect(answer(fb.id, a.id)).toMatchObject({
      answer: "no",
      reason: "prefers-rival",
      rivalFilingId: fa.id,
    });
  });

  it("a volunteer who then files in the same race leaves the campaign that day, kept with the filing, and does not come to its events", () => {
    const { core, api, where, first, helper, askFor } = findRace();
    const fa = first.filing;
    expect(
      askToVolunteer(api, fa.id, helper.id, askFor(first.person.id)),
      `${where}: ${helper.id} asked for ${fa.id}`,
    ).toBe(true);
    expect(campaignFor(api, fa.id).volunteerIds, where).toContain(helper.id);
    expect(
      whoComes(api, campaignFor(api, fa.id)),
      `${where}: ${helper.id} comes to ${fa.id}'s events as its volunteer`,
    ).toContain(helper.id);
    expect(
      sharedHistory(core, first.person.id, helper.id),
      `${where}: ${helper.id} works on ${fa.id}`,
    ).toContainEqual({ kind: "campaign", recordId: fa.id });
    const filed = file(api, helper.id, fa.contestId, -1);
    expect(filed, `${where}: ${helper.id} files in ${fa.contestId}`).not.toBe(
      null,
    );
    console.log(
      `${where}: ${helper.id} volunteered for ${fa.id}, then filed ${filed!.id}`,
    );
    const after = campaignFor(api, fa.id);
    expect(after.volunteerIds, where).not.toContain(helper.id);
    // One record of why: the day, and the filing whose announcement is the
    // cause.
    expect(after.leftToRun, where).toEqual([
      {
        personId: helper.id,
        role: "volunteer",
        on: core.date,
        filingId: filed!.id,
      },
    ]);
    expect(
      core.durableLog.get(`candidate-filed:${filed!.id}` as never)?.date,
      where,
    ).toBe(core.date);
    // They worked on the candidate's campaign, then ran against them: the
    // work they shared stays on the record, ended the day they filed.
    expect(
      sharedHistory(core, first.person.id, helper.id),
      `${where}: ${helper.id} worked on ${fa.id} before filing ${filed!.id}`,
    ).toContainEqual({ kind: "campaign", recordId: fa.id, endedOn: core.date });
    // Off the volunteers, their own reasons and temperament would still bring
    // them to the candidate's evenings; only their own run keeps them home.
    expect(
      eveningScore(core, api, after, helper, ATTEND),
      `${where}: ${helper.id}'s reasons to come to ${fa.id}'s events`,
    ).toBeGreaterThan(api.parameter("zero"));
    expect(
      whoComes(api, after),
      `${where}: ${helper.id} (${filed!.id}) comes to ${fa.id}'s events`,
    ).not.toContain(helper.id);
    expect(
      askToVolunteer(api, fa.id, helper.id, askFor(first.person.id)),
      `${where}: ${helper.id} (${filed!.id}) asked again for ${fa.id}`,
    ).toBe(false);
  });

  it("someone running the campaign who then files leaves its staff that day, and is not asked back, enlisted at home or brought back by word of the filing", () => {
    const { core, api, where, first, manager } = findRace();
    const fa = first.filing;
    const a = first.person;
    const zero = api.parameter("zero");
    expect(
      managerScore(core, api, campaignFor(api, fa.id), manager),
      `${where}: ${manager.id}'s reasons to run ${fa.id}`,
    ).toBeGreaterThan(zero);
    expect(
      askToManage(api, fa.id, manager.id),
      `${where}: ${manager.id} asked to run ${fa.id}`,
    ).toBe(true);
    expect(campaignFor(api, fa.id).staffIds, where).toContain(manager.id);
    const filed = file(api, manager.id, fa.contestId, -1);
    expect(filed, `${where}: ${manager.id} files in ${fa.contestId}`).not.toBe(
      null,
    );
    console.log(
      `${where}: ${manager.id} ran ${fa.id}, then filed ${filed!.id}`,
    );
    const after = campaignFor(api, fa.id);
    expect(
      after.staffIds,
      `${where}: ${manager.id} (${filed!.id}) on ${fa.id}'s staff`,
    ).not.toContain(manager.id);
    expect(after.leftToRun, where).toEqual([
      {
        personId: manager.id,
        role: "staff",
        on: core.date,
        filingId: filed!.id,
      },
    ]);
    // Their reasons to run it and to give it their evenings are what they
    // were; only their own run says no.
    expect(
      managerScore(core, api, after, manager),
      `${where}: ${manager.id}'s reasons to run ${fa.id} after filing`,
    ).toBeGreaterThan(zero);
    expect(
      askToManage(api, fa.id, manager.id),
      `${where}: ${manager.id} (${filed!.id}) asked again to run ${fa.id}`,
    ).toBe(false);
    expect(
      enlistVolunteer(api, fa.id, manager.id),
      `${where}: ${manager.id} (${filed!.id}) enlisted for ${fa.id}`,
    ).toBe(false);
    // Word of a's filing reaches them: a tells them in person the next day,
    // and the day after, the campaign engine's own turn weighs who has heard
    // (running the campaign first, while nobody runs it, then giving it
    // evenings), as it does every day.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    api.relationship(a.id, manager.id, "contact", TOLD_HOURS, undefined, {
      cause: "neighbors",
      sourceId: `test:campaign-rival-help:told:${fa.id}:${manager.id}`,
    });
    expect(
      managerScore(core, api, campaignFor(api, fa.id), manager),
      `${where}: ${manager.id}'s reasons to offer to run ${fa.id}`,
    ).toBeGreaterThan(zero);
    expect(
      offerScore(core, api, campaignFor(api, fa.id), manager),
      `${where}: ${manager.id}'s reasons to offer ${fa.id} their evenings`,
    ).toBeGreaterThan(zero);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const weighed = campaignFor(api, fa.id);
    const running = (ids: readonly string[]) =>
      ids.filter((id) => rivalFiling(api, weighed, id));
    expect(
      running(weighed.staffIds),
      `${where}: anyone standing in ${fa.contestId} offered to run ${fa.id}`,
    ).toEqual([]);
    expect(
      running(weighed.volunteerIds),
      `${where}: anyone standing in ${fa.contestId} offered ${fa.id} their evenings`,
    ).toEqual([]);
    // Nor is an offer from anyone standing in the race applied (the event the
    // director stages as the candidate's scene; with no player here nobody's
    // log keeps it, so the applied event ids are read).
    expect(
      ballot(api, fa.contestId)
        .filter((f) => f.personId !== a.id)
        .map((f) => `${VOLUNTEER_OFFERED_EVENT}:${fa.id}:${f.personId}`)
        .filter((id) => core.eventIds.has(id)),
      `${where}: offers to ${fa.id} from anyone standing in ${fa.contestId}`,
    ).toEqual([]);
  });

  it(
    "a group backing one candidate sends no member who files in the race, and a group whose speaker files backs no rival",
    () => {
      const tried: string[] = [];
      let member: string | null = null;
      let speaker: string | null = null;
      for (
        let salt = 0;
        salt < GROUP_DRAWS && (member === null || speaker === null);
        salt += 1
      ) {
        // The twin where nobody else runs: the group backs the candidate on
        // the campaign turn and sends members to its doors.
        const control = groupedRace(salt);
        if ("why" in control) {
          tried.push(`${control.where}: ${control.why}`);
          continue;
        }
        const { group, side, a } = control;
        campaignTurnPasses(control.core);
        const backed = groupBacking(
          control.api,
          a.filing.id,
          group.organizationId,
        );
        if (!backed) {
          tried.push(
            `${control.where}: ${group.organizationId} backed nobody in ${a.filing.contestId}`,
          );
          continue;
        }
        const label = `${control.where}: ${group.organizationId} (speaker ${group.speakerId}) on ${side.question}=${side.position}, ${a.person.id} filed ${a.filing.id}`;
        // The member with the most reason to go, who could have filed in the
        // race that day, sent when nobody else runs.
        const sent =
          control.member && backed.volunteerIds.includes(control.member.id)
            ? control.member.id
            : null;
        if (member === null && sent) {
          const twin = twinOf(salt, control);
          const runs = file(
            twin.api,
            sent,
            a.filing.contestId,
            -side.position,
            side.question,
          );
          expect(runs, `${label}: ${sent} files`).not.toBe(null);
          campaignTurnPasses(twin.core);
          const row = groupBacking(twin.api, a.filing.id, group.organizationId);
          expect(
            row,
            `${label}: still backs ${a.filing.id} with ${runs!.id} standing`,
          ).not.toBe(null);
          expect(
            row!.volunteerIds,
            `${label}: ${sent} (${runs!.id}) sent to ${a.filing.id}`,
          ).not.toContain(sent);
          expect(
            campaignFor(twin.api, a.filing.id).volunteerIds,
            `${label}: ${sent} (${runs!.id}) on ${a.filing.id}'s volunteers`,
          ).not.toContain(sent);
          console.log(
            `${label}: sent ${sent} when nobody else ran; with ${runs!.id} standing sent ${row!.volunteerIds.join(", ") || "nobody"}`,
          );
          member = sent;
        } else if (member === null)
          tried.push(
            control.member
              ? `${label}: did not send ${control.member.id} (reasons ${control.member.score}); sent ${backed.volunteerIds.join(", ") || "nobody"}`
              : `${label}: no member who could file had reason to go`,
          );
        if (speaker === null && control.couldFile.has(group.speakerId!)) {
          const twin = twinOf(salt, control);
          const runs = file(
            twin.api,
            group.speakerId!,
            a.filing.contestId,
            -side.position,
            side.question,
          );
          expect(runs, `${label}: the speaker files`).not.toBe(null);
          campaignTurnPasses(twin.core);
          expect(
            rivalFiling(
              twin.api,
              campaignFor(twin.api, a.filing.id),
              group.speakerId!,
            )?.id,
            label,
          ).toBe(runs!.id);
          for (const filing of ballot(twin.api, a.filing.contestId))
            if (filing.personId !== group.speakerId)
              expect(
                groupBacking(twin.api, filing.id, group.organizationId),
                `${label}: backs ${filing.id} with its speaker's ${runs!.id} standing`,
              ).toBe(null);
          console.log(
            `${label}: backed ${a.filing.id} when its speaker did not run; with ${runs!.id} standing backed nobody`,
          );
          speaker = group.speakerId!;
        } else if (speaker === null)
          tried.push(`${label}: its speaker could not file`);
      }
      console.log(
        `group case: ${tried.length} draws passed over\n${tried.join("\n")}`,
      );
      expect(
        member,
        `no draw had a group send a member who could file:\n${tried.join("\n")}`,
      ).not.toBe(null);
      expect(
        speaker,
        `no draw had a group whose speaker could file:\n${tried.join("\n")}`,
      ).not.toBe(null);
    },
    TWIN_TIMEOUT,
  );
});
