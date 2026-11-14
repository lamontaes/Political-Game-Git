/**
 * What a campaign buys comes from a seller that is recorded, never made up
 * for it: a business in town where one fits, else the town's outside account
 * (the region's pollsters, printers and halls), and a mailer's postage always
 * goes outside, to the Postal Service. Checked in two named places and seeds
 * of the played world (buildBenchWorld), with the town's fitting businesses
 * taken out of the town's index to stage a town that has none.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { campaignAct } from "../bench/campaign";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { outsideMarketAccount, townOutsideOf } from "./opening-outside-market";
import {
  campaignFor,
  rentVenue,
  seller,
  sendMail,
  unitPrice,
  type Purchase,
} from "./modules/campaigns";
import { coreAPI } from "./state";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import type { CoreState } from "./types";

const PLACES = [
  {
    name: "Tonto Basin, Arizona",
    key: "0474610",
    seed: "6515617c0d237b0cac014f6844969df83a8105fe398f0de7abd2d6b020049e4d",
  },
  {
    name: "Sail Harbor, Connecticut",
    key: "0966113",
    seed: "e7a20307aa2e0b41e0ba9369bb6a73303ee7824be16f52fee752c6908435bcbd",
  },
];

for (const place of PLACES)
  it(`${place.name}: a town with no fitting business pays the outside account, and postage always does`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const state = core as CoreState;
    const api = coreAPI(core);
    const town = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as {
        townPlaceId: string;
      }
    ).townPlaceId;
    const outside = townOutsideOf(state.organizations.values(), town);
    expect(outside, `${place.name}: outside account`).toBeDefined();

    // With the town's own businesses, the first fitting one sells.
    const townSellers = (["poll", "mail", "event"] as Purchase[]).map((p) =>
      seller(api, p),
    );
    for (const id of townSellers) expect(id, place.name).not.toBe(outside!.id);

    // Stage a town with none: take every business out of the town's index.
    const employers = state.organizationsByPlaceKind.get(`${town}:employer`)!;
    for (const id of [...employers]) employers.delete(id);
    for (const p of ["poll", "mail", "event"] as Purchase[])
      expect(seller(api, p), `${place.name}: ${p}`).toBe(outside!.id);
    expect(
      [...state.stopgapHits].filter((id) => /campaign-.*-seller/.test(id)),
      place.name,
    ).toEqual([]);
    expect(
      [...state.organizations.keys()].some((id) =>
        id.startsWith("organization:campaign-"),
      ),
      "no stand-in is made",
    ).toBe(false);
  }, 600_000);

for (const place of [
  {
    name: "Florence, South Dakota",
    key: "4621820",
    seed: "e255632505a77244a8d3af744c476a5b3351e8fdb75b806578f2cb973d2083da",
  },
])
  it(`${place.name}: mail print, postage and a hall are all paid to the outside account in a town with no business`, () => {
    const START = "2026-01-05";
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
        .get("town") as unknown as {
        townPlaceId: string;
      }
    ).townPlaceId;
    api.addOrganization(outsideMarketAccount(town, START));
    const outside = townOutsideOf(core.organizations.values(), town)!;
    const employers = core.organizationsByPlaceKind.get(`${town}:employer`);
    for (const id of [...(employers ?? [])]) employers!.delete(id);
    const residents = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === town &&
          2026 - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    let filingId: string | null = null;
    let candidate = residents[0]!;
    for (const resident of residents.slice(0, 5)) {
      core.playerId = resident.id;
      const open = openContests(api);
      const local = open.filter(
        (c) => c.level !== "federal" && c.level !== "state",
      );
      for (const contest of local.length ? local : open) {
        const filed = fileCandidacy(api, {
          personId: resident.id,
          contestId: contest.id,
          platform: [`${PLATFORM_QUESTIONS[0]}=1`],
        });
        if (
          filed.status !== "refused" &&
          ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
        ) {
          filingId = filed.filing.id;
          candidate = resident;
          break;
        }
      }
      if (filingId) break;
    }
    expect(filingId, `${place.name}: nobody could file`).not.toBeNull();
    campaignAct(core, candidate.id, {
      filingId: filingId!,
      kind: "contribute",
      amountMinor: Math.floor(candidate.liquidMinor / 2),
    });
    const payments: {
      postings: { accountId: string; deltaMinor: number }[];
    }[] = [];
    setJournalTrace((input) => {
      if (
        input.postings.some(
          (q) => q.accountId === `cash:${outside.id}:residual`,
        )
      )
        payments.push({ postings: [...input.postings] });
    });
    try {
      const perPiece =
        unitPrice(api, "mailer-print") + unitPrice(api, "postage");
      sendMail(api, filingId!, 20 * perPiece, true);
      rentVenue(api, filingId!, "event");
    } finally {
      setJournalTrace(null);
    }
    const toOutside = payments.map(
      (p) =>
        p.postings.find((q) => q.accountId === `cash:${outside.id}:residual`)
          ?.deltaMinor ?? 0,
    );
    expect(toOutside.length, place.name).toBe(3);
    for (const paid of toOutside) expect(paid, place.name).toBeGreaterThan(0);
    expect(campaignFor(api, filingId!).spentMinor, place.name).toBe(
      toOutside.reduce((x, y) => x + y, 0),
    );
  }, 600_000);
