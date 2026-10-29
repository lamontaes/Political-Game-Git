/**
 * Call donors from play (play-stop-11): in the first week after filing, in
 * places drawn from all 56, the call reaches named people, each gives what
 * their own money and view of the candidate allow or is said to not, and the
 * campaign's raised total on the Campaigns screen moves by exactly the sum.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { lawChain } from "../core2/modules/laws";
import { townSeats } from "../core2/modules/offices";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { campaignFor, giftOf } from "../core2/modules/campaigns";
import { campaignDay, campaignView } from "./campaign";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`donor-calls:${Date.now()}`).digest("hex");
// At least this many places are drawn; more are drawn, up to the cap, until one
// has a donor who gives and one has a donor who does not.
const PLACES = 5;
const MAX_PLACES = 25;

it("Call donors names each person reached with their gift or why not, and the raised total moves by the sum", () => {
  let gifts = 0;
  let refusals = 0;
  const seen: string[] = [];
  const placesTried: string[] = [];
  for (let n = 0; n < MAX_PLACES; n++) {
    if (n >= PLACES && gifts > 0 && refusals > 0) break;
    const place = drawPlace(runSeed, `donor-calls:${n}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core as CoreState);
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    placesTried.push(`${place.name}, ${place.state}`);
    const year = Number(core.date.slice(0, 4));
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          // Residents of the town file there (the clerk's residency check).
          p.placeId === lawChain(api).townPlaceId &&
          year - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    let tried = 0;
    for (const candidate of adults.slice(0, 80)) {
      if (tried >= 12 || (gifts > 0 && refusals > 0)) break;
      if (townSeats(api).some((s) => s.holder?.personId === candidate.id))
        continue;
      core.playerId = candidate.id;
      let filing = null;
      for (const contest of openContests(api)) {
        if (contest.level === "federal" || contest.level === "state") continue;
        const filed = fileCandidacy(api, {
          personId: candidate.id,
          contestId: contest.id,
          platform: [`${PLATFORM_QUESTIONS[0]}=1`],
        });
        // Filing is a petition now: a filing that is petitioning or on the ballot runs a campaign.
        if (
          filed.status !== "refused" &&
          ["petitioning", "on-ballot"].includes(filed.filing.status)
        ) {
          filing = filed.filing;
          break;
        }
      }
      if (!filing) continue;
      tried++;
      const raisedOf = () =>
        campaignView(core as CoreState, candidate.id).campaigns.find(
          (c) => c.filing.id === filing!.id,
        )!.campaign.raisedMinor;
      const calls = campaignView(core as CoreState, candidate.id)
        .campaigns.find((c) => c.filing.id === filing!.id)!
        .outings.find((o) => o.outing === "calls")!;
      if (!calls.available) {
        expect(calls.why, `a grayed call says why: ${where}`).toBeTruthy();
        continue;
      }
      const startDate = core.date;
      const cash = (id: string) => core.people.get(id)!.liquidMinor;
      const before = raisedOf();
      const wallets = new Map(
        [...core.people.keys()].map((id) => [id, cash(id)] as const),
      );
      const taken = campaignDay(core as CoreState, candidate.id, {
        filingId: filing.id,
        kind: "raise-money",
      });
      const sum = taken.calls.reduce((t, c) => t + c.givenMinor, 0);
      expect(taken.calls.length, `people reached: ${where}`).toBeGreaterThan(0);
      expect(taken.calls.length, where).toBeLessThanOrEqual(
        Math.floor(calls.hours * 10),
      );
      expect(
        raisedOf() - before,
        `raised total moved by the gifts: ${where}`,
      ).toBe(sum);
      expect(taken.raisedMinor, where).toBe(sum);
      expect(
        campaignFor(api, filing.id).raisedMinor,
        `campaign record: ${where}`,
      ).toBe(before + sum);
      expect(
        taken.callsLine,
        `the call's summary sentence: ${where}`,
      ).toBeTruthy();
      for (const call of taken.calls) {
        const person = core.people.get(call.personId)!;
        expect(call.name, where).toBe(
          `${person.givenName} ${person.familyName}`,
        );
        expect(call.line, `${call.personId}: ${where}`).toContain(call.name);
        if (call.givenMinor > 0) {
          gifts++;
          expect(call.why, where).toBe("gave");
          // The gift came out of that person's own money, which could cover it.
          expect(
            wallets.get(call.personId)!,
            `${call.personId} had the money: ${where}`,
          ).toBeGreaterThanOrEqual(call.givenMinor);
          expect(cash(call.personId), where).toBe(
            wallets.get(call.personId)! - call.givenMinor,
          );
          expect(giftOf(api, filing.id, call.personId)?.totalMinor, where).toBe(
            call.givenMinor,
          );
        } else {
          refusals++;
          expect(call.why, where).not.toBe("gave");
          expect(cash(call.personId), where).toBe(wallets.get(call.personId));
        }
      }
      const days = (Date.parse(core.date) - Date.parse(startDate)) / 86_400_000;
      expect(days, `still the first week: ${where}`).toBeLessThan(7);
      seen.push(
        `${where}; filing ${filing.id}, candidate ${candidate.id}; asked ${taken.calls.length}, gave ${taken.calls.filter((c) => c.givenMinor > 0).length}, raised ${sum}; first gift ${taken.calls.find((c) => c.givenMinor > 0)?.personId ?? "none"}`,
      );
    }
  }
  process.stdout.write(`donor calls:\n${seen.join("\n")}\n`);
  const triedList = `places tried (${placesTried.length}): ${placesTried.join("; ")}`;
  expect(
    seen.length,
    "a candidate could call donors in a drawn place",
  ).toBeGreaterThan(0);
  expect(
    gifts,
    `somebody gave in one of the drawn places; ${triedList}: ${seen.join(" | ")}`,
  ).toBeGreaterThan(0);
  expect(
    refusals,
    `somebody did not, and the line says why; ${triedList}`,
  ).toBeGreaterThan(0);
}, 600_000);
