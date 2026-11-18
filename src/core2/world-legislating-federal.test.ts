/**
 * Congress files on a question list read from data (pool item
 * gov-congress-passes-policy-laws-part-1-question-list-from-data). In the
 * played world (`buildBenchWorld`, every module installed) of a drawn place
 * (replay with FEDERAL_FILING_SEED), the federal session's filings name only
 * questions the research list admits, and both chambers' members sponsor
 * some: each filing is a bill on the one legislature engine, introduced in its
 * sponsor's own chamber. The place and seed are in every message; the test
 * draws more places, up to a bound, until one has a federal session with filings.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  members,
  memberKey,
} from "./modules/legislature";
import {
  federalQuestionAdmitted,
  legislativeSessionsOf,
} from "./modules/world-legislating";
import { coreAPI } from "./state";

const base = process.env.FEDERAL_FILING_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;

it(`Congress files on the research list's questions, from both chambers (seed ${base})`, () => {
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const seed = createHash("sha256")
      .update(`${base}:${attempt}`)
      .digest("hex");
    const place = drawPlace(seed, "federal-filing");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 60));
      const session = legislativeSessionsOf(api).find(
        (row) => row.jurisdiction === "US",
      );
      if (!session?.filings.length) {
        passed.push(`${where}: no federal session filings`);
        continue;
      }
      const house = new Set(
        members(api, FEDERAL_HOUSE).map((t) => t.personId ?? t.id),
      );
      const senate = new Set(
        members(api, FEDERAL_SENATE).map((t) => t.personId ?? t.id),
      );
      const keyOf = (id: string) => id;
      let fromHouse = 0;
      let fromSenate = 0;
      for (const filing of session.filings) {
        expect(
          federalQuestionAdmitted(filing.question),
          `${where}: ${session.id} files on ${filing.question}, which the research list does not admit`,
        ).toBe(true);
        const sponsor = keyOf(filing.sponsor);
        if ([...house].some((id) => sponsor.includes(String(id))))
          fromHouse += 1;
        if ([...senate].some((id) => sponsor.includes(String(id))))
          fromSenate += 1;
      }
      if (!fromHouse || !fromSenate) {
        passed.push(
          `${where}: ${session.filings.length} filings, ${fromHouse} from the House and ${fromSenate} from the Senate`,
        );
        continue;
      }
      console.log(
        `federal-filing: ${where}; ${session.id}: ${session.filings.length} filings, ${fromHouse} House and ${fromSenate} Senate sponsors; first ${session.filings[0]!.question}, bill ${session.filings.find((f) => f.billId)?.billId ?? "not yet introduced"}`,
      );
      return;
    } finally {
      setBookkeeping(was);
    }
  }
  throw new Error(
    `no drawn place filed from both chambers: ${passed.join("; ")} (seed ${base})`,
  );
}, 3_600_000);

// Congress opens its session by filing each chamber on its own. When no member
// of a chamber carries a change, the President asks a member of that chamber,
// so the one asked is always among the chamber's filers. Before the fix the
// Senate's pass was handed the House as its body, the President's asked member
// was a House member, and opening the session threw
// "Cannot read properties of undefined (reading 'personId')" at memberKey.
// The three places below are the ones that threw (Sheyenne ND, Twin Creeks MT,
// Booth WV), with the seeds that reproduced it.
const THREW: readonly { name: string; key: string; seed: string }[] = [
  {
    name: "Sheyenne, North Dakota",
    key: "3872580",
    seed: "43d7ce9fd8df624bfdc912a579284207969b6124ba2c7780436d571a4bf7fcdf",
  },
  {
    name: "Twin Creeks, Montana",
    key: "3075550",
    seed: "d888b20564f96beac8772cf19a02d37f8e6ca065c294cc49e35b9327a498592f",
  },
  {
    name: "Booth, West Virginia",
    key: "5409148",
    seed: "4c34cc968c8412093378375288816b724fa98501f454e802c3eb42a3dceb801f",
  },
];

for (const place of THREW) {
  it(`Congress opens its session and each bill the President asks a member to carry sits in that member's chamber (${place.name} ${place.key}, seed ${place.seed})`, () => {
    const was = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      // Congress convenes on January 3, 2026, in the world's first year.
      advanceCore(core, makeIsoDate("2026-01-10"));
      const api = coreAPI(core);
      const seats = new Map(
        [FEDERAL_HOUSE, FEDERAL_SENATE].map((body) => [
          body,
          new Set(members(api, body).map(memberKey)),
        ]),
      );
      const asked = (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as {
          id: string;
          bodyOfficeId: string;
          sponsorId: string;
          requestedBy?: string;
        }[]
      ).filter((b) => b.requestedBy && seats.has(b.bodyOfficeId));
      for (const bill of asked)
        expect(
          seats.get(bill.bodyOfficeId)!.has(bill.sponsorId),
          `${bill.id}: asked of ${bill.sponsorId}, who holds no seat on ${bill.bodyOfficeId}`,
        ).toBe(true);
      expect(
        legislativeSessionsOf(api).some((row) => row.jurisdiction === "US"),
        "Congress has an open session",
      ).toBe(true);
    } finally {
      setBookkeeping(was);
    }
  }, 600_000);
}
