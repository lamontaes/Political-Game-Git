/**
 * Campaign calibration (CTO, Oct 12, from OPUS-PLAY's runs): checks on totals
 * against field rates, never dice. In a two-level town, a candidate's doors
 * are reported beside the field band (about a quarter to a third of the
 * households knocked open, filling in the counted ones that do), not checked
 * against it: a real band is reported, never a pass or fail line (owner,
 * Nov 8), and a town whose openers are older opens more doors by the door
 * rule's own age lean. A walk that opens no door at all fails. A small share
 * of acquaintances volunteer, and a speech on a question few care about moves
 * few listeners.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  askForDonation,
  askToVolunteer,
  campaignFor,
  commissionPoll,
  giveSpeech,
  knockDoors,
  openCampaigns,
} from "./modules/campaigns";
import { personStance } from "./campaign-views";
import { closenessBetween } from "./closeness";
import { campaignParameter, PLATFORM_QUESTIONS } from "./campaign-data";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`calibration:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter((k) => !["US-AS", "US-GU", "US-MP", "US-VI"].includes(k))
  .sort();

describe("campaign calibration on totals", () => {
  it("doors, volunteers and a niche speech land near field rates", () => {
    let report: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 6 && !report; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `place:${attempt}`).key;
      const full = buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 400,
      });
      const adults = [...full.people]
        .filter((p) => 2026 - Number(p.birthDate.slice(0, 4)) >= 30)
        .sort(
          (a, b) =>
            b.knownIds.length - a.knownIds.length || a.id.localeCompare(b.id),
        );
      const player = adults[0]!;
      const core = createLifeCore(
        collapseToTwoLevels({ ...full, playerId: player.id }),
      );
      openLaws(core);
      openOffices(core, seed, core.date);
      openElections(core);
      openCampaigns(core);
      const api = coreAPI(core);
      let filing: FilingRow | null = null;
      for (const contest of openContests(api)) {
        const r = fileCandidacy(api, {
          personId: player.id,
          contestId: contest.id,
          platform: [],
          party: null,
        });
        if (r.status === "refused") continue;
        filing = r.filing;
        break;
      }
      if (!filing) continue;
      const namedBefore = core.people.size;
      const met = knockDoors(api, {
        filingId: filing.id,
        canvasserId: player.id,
        // About 180 doors: a few dozen leaves the contact rate within chance of
        // the 15% floor in a town that answers at the field rate.
        hours: 12,
      });
      const knocked = campaignFor(api, filing.id).doorsKnockedCount ?? 0;
      const contact = met.length / Math.max(1, knocked);
      const filled = core.people.size - namedBefore;
      const known = [...(core.people.get(player.id)?.knownIds ?? [])].filter(
        (id) => core.people.has(id),
      );
      const said = known.map((id) => ({
        id,
        yes: askToVolunteer(api, filing!.id, id),
        tie: closenessBetween(core, id, player.id),
      }));
      const volunteers = said.filter((s) => s.yes).length;
      // A question few people care about: the weakest left-right split.
      const niche = [...PLATFORM_QUESTIONS].sort(
        (a, b) =>
          Math.abs(personStance(1, a)) - Math.abs(personStance(1, b)) ||
          a.localeCompare(b),
      )[0]!;
      const heard = giveSpeech(api, {
        filingId: filing.id,
        venue: "town-hall",
        statements: [{ question: niche, position: 1 }],
      });
      const moved = heard.filter(
        (c) => Math.abs(c.warmthAfter - c.warmthBefore) > 0.05,
      );
      // The question the town splits on most, said the same way: it should
      // move more of its listeners than the niche one.
      const salient = [...PLATFORM_QUESTIONS].sort(
        (a, b) =>
          Math.abs(personStance(1, b)) - Math.abs(personStance(1, a)) ||
          a.localeCompare(b),
      )[0]!;
      const heardSalient = giveSpeech(api, {
        filingId: filing.id,
        venue: "town-hall",
        statements: [{ question: salient, position: 1 }],
      });
      const movedSalient = heardSalient.filter(
        (c) => Math.abs(c.warmthAfter - c.warmthBefore) > 0.05,
      );
      // A poll: paid per completed interview from the campaign's money,
      // reaching the counted residents too.
      for (const id of [...core.people.keys()].sort())
        askForDonation(api, filing.id, id);
      const spentBefore = campaignFor(api, filing.id).spentMinor;
      const poll = commissionPoll(api, { filingId: filing.id, sampleSize: 40 });
      expect(campaignFor(api, filing.id).spentMinor - spentBefore).toBe(
        poll.contacted * campaignParameter("pollCostPerInterviewMinor"),
      );
      const countedRespondents = poll.respondentIds.filter(
        (id) => !core.people.has(id),
      ).length;
      report = {
        seed,
        poll: {
          contacted: poll.contacted,
          counted: countedRespondents,
          answers: poll.answers,
        },
        state,
        place: key,
        knocked,
        contacts: met.length,
        contact: Math.round(contact * 100) / 100,
        filledInAtDoor: filled,
        acquaintances: known.length,
        volunteers,
        niche,
        listeners: heard.length,
        movedMuch: moved.length,
      };
      expect(knocked, `${state} ${key}`).toBeGreaterThan(10);
      expect(
        met.length,
        `${state} ${key} ${seed}: a walk opened no door`,
      ).toBeGreaterThan(0);
      // The doors' rate is reported beside the field band, not checked.
      process.stdout.write(
        `doors in ${state} ${key}, seed ${seed}: ${met.length} of ${knocked} knocked opened, contact ${contact.toFixed(3)}, field band about 0.25 to 0.33 (a quarter to a third)\n`,
      );
      // Pins family 32 (#9747): no band on how many volunteer or how many a
      // speech moves; the checks are the relationships each stands for.
      // Volunteers are closer to the candidate than those who decline
      // (volunteerClosenessWeight), and the niche question moves fewer of its
      // listeners than the one the town splits on most.
      const yes = said.filter((s) => s.yes);
      const no = said.filter((s) => !s.yes);
      const meanTie = (rows: typeof said) =>
        rows.reduce((t, s) => t + s.tie, 0) / Math.max(1, rows.length);
      process.stdout.write(
        `volunteers in ${state} ${key}, seed ${seed}: ${yes.length} of ${known.length}, mean closeness ${meanTie(yes).toFixed(2)} against ${meanTie(no).toFixed(2)} for those who declined; speeches moved ${moved.length} of ${heard.length} (niche) and ${movedSalient.length} of ${heardSalient.length} (most split)\n`,
      );
      // It can't pass on nothing: with a dozen or more asked, some say yes
      // and some say no.
      if (known.length >= 10) {
        expect(
          yes.length,
          `${state} ${key} ${seed}: no one volunteered`,
        ).toBeGreaterThan(0);
        expect(
          no.length,
          `${state} ${key} ${seed}: everyone volunteered`,
        ).toBeGreaterThan(0);
      }
      if (yes.length && no.length)
        expect(
          meanTie(yes),
          `${state} ${key} ${seed}: volunteers' closeness to the candidate`,
        ).toBeGreaterThan(meanTie(no));
      if (heard.length >= 10 && heardSalient.length >= 10)
        expect(
          moved.length / heard.length,
          `${state} ${key} niche speech against the most split`,
        ).toBeLessThan(movedSalient.length / heardSalient.length);
    }
    expect(report, "no town to campaign in").not.toBeNull();
    govReport("campaign-calibration", JSON.stringify(report));
  });
});
