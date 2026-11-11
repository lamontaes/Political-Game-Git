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
import { FEDERAL_HOUSE, FEDERAL_SENATE, members } from "./modules/legislature";
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
