/**
 * Legal cannabis sales reach teens through the health engine's past-month
 * use record, in a played world: a place drawn from all 56 on a seed nobody
 * chose, the bench world with every module installed, built twice from the
 * same seed. In one, every level of the town's chain legalizes cannabis
 * sales; in the other, every level bans them. The outcome web runs
 * cannabis-sales-to-youth-use where sales are legal, and on its refresh day
 * the health engine decides each full teen's past-month use from the
 * national share times the web's factor (moved by the teen's own
 * conscientiousness); the counted monthly row carries the counted teens'
 * users at the same share times their count.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { YouthCannabisCount } from "./births-counted";
import { youthCannabisRecordOf } from "./modules/health";
import { enactLaw, lawChain } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";

const seed = process.env.YOUTH_CANNABIS_SEED ?? randomBytes(20).toString("hex");
const QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
const LINK = "cannabis-sales-to-youth-use";
/** Long enough for a web month and a refresh day after the law changes. */
const DAYS = 70;
const TRIES = 4;
const RENEWAL = "core2-renewal-v1";

/** Sets the sales law at every level of the town's chain, effective today. */
function setSales(core: CoreState, value: number, tag: string) {
  const api = coreAPI(core);
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: QUESTION,
      value,
      effectiveDate: core.date,
      measureId: `test:youth-cannabis:${tag}:${value}:${core.date}`,
      citation: "Controlled law case in a generated world.",
    });
}

function webMonths(core: CoreState, placeId: string) {
  return coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .query("byPlace", [placeId]) as unknown as readonly WebMonth[];
}

/** The counted teens' count the counted flows kept for the town's latest month. */
function countedRow(core: CoreState, placeId: string) {
  return coreAPI(core).moduleState(RENEWAL).table("countedCarry").get(placeId)
    ?.youthCannabis as unknown as YouthCannabisCount | undefined;
}

describe("legal cannabis sales reach teens' past-month use", () => {
  it("is the researched link, a small decrease with a range across zero", () => {
    const row = WEB_LINKS.find((link) => link.key === LINK)!;
    expect(row.from).toBe(`law:${QUESTION}`);
    expect(row.to).toBe("health.youth-cannabis-use");
    expect(row.size).toBeLessThan(0);
    expect(row.range![0]).toBeLessThan(0);
    expect(row.range![1]).toBeGreaterThan(0);
  });

  it(
    `each full teen's share moves by the web's factor where sales are legal, and counted teens' users with it (seed ${seed})`,
    { timeout: 900_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-youth-cannabis:${attempt}`);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key})`;
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          const legal = build();
          const banned = build();
          setSales(legal, 1, "legal");
          setSales(banned, 0, "banned");
          const until = addDays(makeIsoDate(legal.date), DAYS);
          advanceCore(legal, until);
          advanceCore(banned, until);
          const placeId = lawChain(coreAPI(legal)).townPlaceId;
          // The web runs the link in the legal world's months only.
          const ran = webMonths(legal, placeId).filter(
            (row) => (row.effects[LINK] ?? 0) !== 0,
          );
          const twinRan = webMonths(banned, placeId).filter(
            (row) => (row.effects[LINK] ?? 0) !== 0,
          );
          expect(
            twinRan.map((row) => row.id),
            where,
          ).toEqual([]);
          // Full teens in the town with a record in both worlds.
          const pairs = [...legal.people.values()]
            .filter((person) => person.placeId === placeId)
            .map((person) => ({
              id: person.id as PersonId,
              legal: youthCannabisRecordOf(legal, person.id as PersonId),
              banned: youthCannabisRecordOf(banned, person.id as PersonId),
            }))
            .filter((pair) => pair.legal && pair.banned);
          if (!ran.length || !pairs.length) {
            passed.push(
              `${where}: ${ran.length} web months ran the link, ${pairs.length} teens with a record in both worlds`,
            );
            continue;
          }
          for (const pair of pairs) {
            const a = pair.legal!;
            const b = pair.banned!;
            expect(a.month, pair.id).toBe(b.month);
            expect(b.factor, `${pair.id} banned`).toBe(1);
            expect(a.factor, `${pair.id} legal`).not.toBe(1);
            expect(
              ran.some((row) => row.id === a.webRecordId),
              `${pair.id}: ${a.webRecordId} is a month that ran the link`,
            ).toBe(true);
            // The share the teen is decided at is the twin's times the factor.
            expect(a.placeShare, pair.id).toBeCloseTo(
              b.placeShare * a.factor,
              12,
            );
          }
          // Counted teens carry the same share times their count.
          const countedLegal = countedRow(legal, placeId);
          const countedBanned = countedRow(banned, placeId);
          const sample = pairs[0]!;
          const used = pairs.filter((pair) => pair.legal!.used).length;
          const usedTwin = pairs.filter((pair) => pair.banned!.used).length;
          expect(countedLegal?.month, where).toBe(countedBanned?.month);
          if (countedLegal && countedBanned && countedBanned.teens > 0) {
            expect(
              ran.some((row) => row.id === countedLegal.webRecordId),
              `${where}: counted ${countedLegal.webRecordId}`,
            ).toBe(true);
            expect(countedLegal.teens, where).toBeCloseTo(
              countedBanned.teens,
              6,
            );
            expect(countedLegal.users, where).toBeLessThan(countedBanned.users);
          }
          process.stdout.write(
            `YOUTH-CANNABIS (YOUTH_CANNABIS_SEED=${seed}) ${where}, world seed ${drawn.seed}: sales legal at every level in one world, banned in the twin; ${ran.length} web months ran ${LINK} (${ran.map((row) => `${row.id} ${row.effects[LINK]}`).join(", ")}); ${pairs.length} full teens, e.g. ${sample.legal!.id}: share ${sample.legal!.placeShare.toFixed(6)} at factor ${sample.legal!.factor} (${sample.legal!.webRecordId}) against ${sample.banned!.placeShare.toFixed(6)} in the twin (${sample.banned!.id}), own share ${sample.legal!.share.toFixed(6)} against ${sample.banned!.share.toFixed(6)}; users ${used} legal, ${usedTwin} banned; counted teens ${countedLegal ? `${countedLegal.month}: ${countedLegal.teens.toFixed(1)} with ${countedLegal.users.toFixed(3)} users (${countedLegal.webRecordId}) against ${countedBanned?.users.toFixed(3)}` : "none"}. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had a teen in a month the link ran: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
