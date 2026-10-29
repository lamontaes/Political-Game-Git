/**
 * A donor meeting (campaign-like-real-races, phase A; owner, Oct 29: "donor
 * meetings... it's not just door knocking, it's raising money"): a house
 * party at the candidate's warmest backer's home, where the candidate meets
 * the room, speaks, and asks each person there for money through the
 * engine's own ask. Run as a campaign day choice in a random place drawn
 * from all 56.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  contributionLimit,
  donorMeetingInvitees,
  donorReason,
  giftOf,
  openCampaigns,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";
import { PLATFORM_QUESTIONS, campaignParameter } from "./campaign-views";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`donor-meeting:${Date.now()}`).digest("hex");

/** Candidates the test tries, each in turn, until a meeting raises money. */
const CANDIDATES = 10;
/** Shifts of doors a candidate walks first, so the town has heard of them. */
const SHIFTS = 4;

function world() {
  const place = drawPlace(runSeed, "donor-meeting");
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
  // Residents of the town old enough to file for something, richest first.
  const residents = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  return { core, api, residents, where };
}

function file(
  core: CoreState,
  api: ReturnType<typeof coreAPI>,
  personId: string,
): FilingRow | null {
  core.playerId = personId;
  // A local seat (a council, a mayor, a county office), as phase A plays;
  // a place with none (a territory's towns) files for what it has.
  const open = openContests(api);
  const local = open.filter(
    (c) => c.level !== "federal" && c.level !== "state",
  );
  for (const contest of local.length ? local : open) {
    const filed = fileCandidacy(api, {
      personId,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (
      filed.status !== "refused" &&
      ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    )
      return filed.filing;
  }
  return null;
}

describe("a donor meeting", () => {
  it("asks each person in the host's room for money and names every gift", () => {
    const { core, api, residents, where } = world();
    let checked = 0;
    let tried = 0;
    for (const candidate of residents) {
      if (tried >= CANDIDATES) break;
      const filing = file(core, api, candidate.id);
      if (!filing) continue;
      tried += 1;
      const id = filing.id;
      for (let shift = 0; shift < SHIFTS; shift += 1)
        takeCampaignDayChoice(api, id, "canvass");
      // Reading the day's choices (the Campaigns screen reads them on every
      // load) asks nobody: two reads keep no new record, not even a weighed
      // decision for a possible host in the player's circle.
      const logBefore = new Set(core.durableLog.keys());
      campaignDayChoices(api, id);
      const offered = campaignDayChoices(api, id).find(
        (c) => c.kind === "donor-meeting",
      );
      expect(
        [...core.durableLog.keys()].filter((key) => !logBefore.has(key)),
        `records kept by reading the day's choices: ${where}`,
      ).toEqual([]);
      if (offered?.kind !== "donor-meeting")
        throw new Error(`no donor-meeting choice: ${where}`);
      if (!offered.available) {
        expect(offered.facts.hostId, where).toBeNull();
        continue;
      }
      const hostId = offered.facts.hostId!;
      // The host comes from the candidate's own circle.
      const circle = new Set([
        ...candidate.familyIds,
        ...candidate.knownIds,
        ...[...(core.relationshipsByPerson.get(candidate.id) ?? [])].map(
          (rel) => {
            const row = core.relationships.get(rel)!;
            return row.actorId === candidate.id ? row.otherId : row.actorId;
          },
        ),
      ]);
      expect(circle.has(hostId), `host ${hostId} known: ${where}`).toBe(true);
      const invited = new Set(
        donorMeetingInvitees(api, campaignFor(api, id), hostId),
      );
      const before = campaignFor(api, id);
      const donations = () =>
        (
          api
            .moduleState(CAMPAIGNS_MODULE_ID)
            .table("money")
            .rows() as unknown as { kind: string }[]
        ).filter((r) => r.kind === "campaigns:donation").length;
      const donationsBefore = donations();

      const keptBefore = new Set(core.durableLog.keys());
      const day = takeCampaignDayChoice(api, id, "donor-meeting");
      const meeting = day.donorMeeting;
      expect(meeting, where).not.toBeNull();
      expect(meeting!.hostId, where).toBe(hostId);
      // The host's own yes is the one decision on record for lending their
      // home, kept where the host is someone the player deals with.
      if (core.focusPersonIds.has(hostId))
        expect(
          [...core.durableLog.values()]
            .filter(
              (r) =>
                !keptBefore.has(r.id) &&
                r.kind === "person.weighed" &&
                r.actorId === hostId &&
                r.reasonKey === "campaigns.volunteer",
            )
            .map((r) => r.actionId),
          `host ${hostId} weighed once: ${where}`,
        ).toEqual(["campaigns.volunteer:yes"]);
      // The room: the host and the guests who came, each one invited and
      // each asked once, the host first.
      for (const guest of meeting!.guestIds)
        expect(invited.has(guest), `guest ${guest} invited: ${where}`).toBe(
          true,
        );
      expect(
        day.answers.map((a) => a.personId),
        where,
      ).toEqual([hostId, ...meeting!.guestIds]);
      // The candidate met everyone in the room.
      for (const personId of [hostId, ...meeting!.guestIds])
        expect(candidate.knownIds.has(personId), where).toBe(true);
      // No venue is paid.
      const after = campaignFor(api, id);
      expect(after.spentMinor, where).toBe(before.spentMinor);
      expect(after.raisedMinor - before.raisedMinor, where).toBe(
        day.raisedMinor,
      );
      expect(after.donorMeetingHostIds, where).toContain(hostId);

      // Every giver is a named gift row, within the legal limit, on the
      // journal and in the public record.
      const limit = contributionLimit(api, filing.contestId).minor;
      const givers = day.answers.filter((a) => a.givenMinor > 0);
      expect(day.giftIds, where).toEqual(
        givers.map((a) => `${id}|${a.personId}`),
      );
      // Everyone who kept their money did so for a reason their own records
      // hold: no reason to back the candidate, or no cash past their cushion.
      const cushionDays = campaignParameter("caseCushionMonths") * 30;
      for (const answer of day.answers) {
        expect(answer.why === "gave", where).toBe(answer.givenMinor > 0);
        const person = core.people.get(answer.personId)!;
        const reason = donorReason(api, id, answer.personId);
        if (answer.why === "not-warm")
          expect(reason, `${answer.personId}: ${where}`).toBeLessThanOrEqual(0);
        if (answer.why === "no-spare") {
          expect(reason, `${answer.personId}: ${where}`).toBeGreaterThan(0);
          expect(
            person.liquidMinor - cushionDays * person.livingCostDailyMinor,
            `${answer.personId}: ${where}`,
          ).toBeLessThanOrEqual(0);
        }
      }
      for (const gift of givers) {
        const row = giftOf(api, id, gift.personId);
        expect(row?.donorId, where).toBe(gift.personId);
        expect(row!.totalMinor, where).toBeGreaterThanOrEqual(gift.givenMinor);
        if (limit !== null)
          expect(
            row!.totalMinor,
            `${gift.personId}: ${where}`,
          ).toBeLessThanOrEqual(limit);
        const event = core.durableLog.get(
          `campaign-gift:${id}:${gift.personId}:${core.date}:${row!.totalMinor}`,
        );
        expect(event?.kind, `gift event ${gift.personId}: ${where}`).toBe(
          "campaign-gift",
        );
        expect(event?.facts?.donorId, where).toBe(gift.personId);
        expect(event?.facts?.amountMinor, where).toBe(String(gift.givenMinor));
      }
      expect(donations() - donationsBefore, where).toBe(givers.length);

      // The meeting itself is a record a scene can read.
      const record = core.durableLog.get(meeting!.id);
      expect(record?.kind, where).toBe("campaign-donor-meeting");
      expect(record?.facts?.hostId, where).toBe(hostId);
      expect(record?.facts?.came, where).toBe(String(meeting!.guestIds.length));
      expect(record?.facts?.gave, where).toBe(String(givers.length));
      expect(record?.facts?.raisedMinor, where).toBe(String(day.raisedMinor));
      expect(record?.facts?.donorIds, where).toBe(
        givers.map((a) => a.personId).join(","),
      );
      expect(record?.witnessIds ?? [], where).toEqual(meeting!.guestIds);

      // A host lends their home once a campaign.
      const next = campaignDayChoices(api, id).find(
        (c) => c.kind === "donor-meeting",
      );
      if (next?.kind === "donor-meeting")
        expect(next.facts.hostId, where).not.toBe(hostId);
      checked += 1;
      if (givers.length > 0) break;
    }
    expect(checked, `no candidate had a host: ${where}`).toBeGreaterThan(0);
    // Where no meeting raised money, every room's answers were checked
    // against the records above: a town whose people hold nothing past their
    // cushion gives nothing.
  });
});
