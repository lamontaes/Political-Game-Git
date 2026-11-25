// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { coreAPI } from "../core2/state";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  petitionOf,
  standing,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { campaignFor } from "../core2/modules/campaigns";
import { campaignDayOpen } from "../core2/campaign-day";
import { campaignDay } from "./campaign";
import { announceForOffice, fileForOffice, localRaces } from "./government";
import {
  buildBenchWorld,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
} from "./world";

// Run now, file on the date (owner, Nov 17, after playing v0.113.0): "From
// day one the player can announce for a coming race, form a campaign
// committee, raise money and gather petition signatures. The official filing
// happens in the real window, and the year between is the campaign." A new
// life in a drawn place announces for its own race on day one, campaigns
// before the window, and files in the window with what it gathered.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

type Race = {
  contestId: string;
  title: string;
  bar: string | null;
  mayAnnounce: boolean;
  announced: boolean;
  playerMayFile: boolean;
  filingOpens: string | null;
};

function opening() {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(draw === 0 ? seed : `${seed}:${draw}`, "announce");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let core;
    try {
      ({ core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        warmUpDays: OPENING_WARMUP_DAYS,
      }));
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passed.push(`${where}: no player can live here`);
      continue;
    }
    const races = (localRaces(core) as unknown as { races: Race[] }).races;
    const race = races.find((r) => r.mayAnnounce);
    if (race) return { core, race, where, passed };
    passed.push(
      `${where} on ${core.date}: no race to announce for (${races
        .map((r) => `${r.title}: ${r.bar ?? "open"}`)
        .join("; ")})`,
    );
  }
  throw new Error(
    `No drawn place had a race to announce for (seed ${seed}):\n${passed.join("\n")}`,
  );
}

describe("announcing before filing opens", () => {
  it("campaigns from day one and files in the window with what it gathered", () => {
    const { core, race, where, passed } = opening();
    process.stdout.write(
      `announce-before-filing (GOLDEN_PATH_SEED=${seed}): ${where}, ${race.title}, filing opens ${race.filingOpens}; passed over: ${passed.join(" | ") || "none"}\n`,
    );
    const api = coreAPI(core);
    const playerId = core.playerId!;
    const contest = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(race.contestId) as unknown as ContestRow;
    expect(race.bar, where).toBe("window-not-open");

    // Day one: the player announces.
    const made = announceForOffice(core, playerId, race.contestId);
    expect(made.status, `${where}: ${JSON.stringify(made)}`).toBe("announced");
    const filingId = (made as { filing: FilingRow }).filing.id;
    const announced = () =>
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(filingId) as unknown as FilingRow;
    expect(announced().announcedOn, where).toBe(core.date);
    // Not yet in the race: not on its ballot, and the page still waits for the window.
    expect(standing(announced()), where).toBe(false);
    expect(
      ballot(api, race.contestId).some((f) => f.personId === playerId),
      where,
    ).toBe(false);
    const page = () =>
      (localRaces(core) as unknown as { races: Race[] }).races.find(
        (r) => r.contestId === race.contestId,
      )!;
    expect(page().announced, where).toBe(true);
    expect(page().mayAnnounce, where).toBe(false);
    expect(page().playerMayFile, where).toBe(false);
    // A second announcement for the same race is refused.
    expect(
      announceForOffice(core, playerId, race.contestId).status,
      where,
    ).toBe("refused");

    // The committee formed the day of the announcement.
    const campaign = campaignFor(api, filingId);
    expect(core.organizations.get(campaign.organizationId)?.kind, where).toBe(
      "campaign-committee",
    );

    // The campaign works before the window: its days are open, and a day
    // at the doors gathers signatures where the law asks them.
    const days = campaignDayOpen(api, filingId);
    expect(days.length, `${where}: campaign days`).toBeGreaterThan(0);
    const petition = petitionOf(api, filingId);
    expect(petition, `${where}: petition`).not.toBeNull();
    const canvass = campaignDay(core, playerId, { filingId, kind: "canvass" });
    expect(campaignFor(api, filingId).doorsKnockedCount, where).toBeGreaterThan(
      0,
    );
    const signedBefore = petitionOf(api, filingId)!.signed;
    if (petition!.needed > 0)
      expect(
        signedBefore,
        `${where}: needed ${petition!.needed}, ${JSON.stringify(canvass).slice(0, 300)}`,
      ).toBeGreaterThan(0);

    process.stdout.write(
      `announce-before-filing: petition asks ${petition!.needed}, ${signedBefore} signed before the window\n`,
    );
    // The window opens: the same candidacy is filed at the counter.
    advanceToRaceFiling(core, contest);
    expect(page().playerMayFile, `${where} on ${core.date}`).toBe(true);
    const filed = fileForOffice(core, playerId, race.contestId);
    expect(filed.status, `${where}: ${JSON.stringify(filed)}`).not.toBe(
      "refused",
    );
    const row = announced();
    expect(
      row.status === "petitioning" || row.status === "on-ballot",
      where,
    ).toBe(true);
    expect(row.filedOn, where).toBe(core.date);
    expect(row.announcedOn! < row.filedOn, where).toBe(true);
    // The signatures gathered before the window stand on the filed petition.
    expect(petitionOf(api, filingId)!.signed, where).toBeGreaterThanOrEqual(
      signedBefore,
    );
    // Its committee is the one formed on the announcement.
    expect(campaignFor(api, filingId).organizationId, where).toBe(
      campaign.organizationId,
    );
  }, 900_000);
});
