/**
 * Unemployment claims read the state's work-search rule (world-unemployment-work-search;
 * owner ruling Oct 20: recorded law, simulated, no form for the player). Each
 * week the matching records a claimant's contacts (the employers they applied
 * to) against the openings near them; the benefit week pays the share of its
 * amount those contacts earn against the state's weekly contact rule, capped
 * by what could be contacted. A place is drawn from all 56 on a seed nobody
 * chose (GOLDEN_PATH_SEED pins one); one without a claim under a work-search
 * rule is redrawn, never skipped.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { searchShare, type ClaimRow, type SearchRow } from "./jobs-benefits";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a benefit week pays the share of its amount the claimant's contacts earn against the state's rule", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "work-search");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const jobs = api.moduleState(JOBS_MODULE_ID);
    const claims = () => jobs.table("claims").rows() as unknown as ClaimRow[];
    // Live until someone has a claim open under a rule that asks for contacts.
    for (let month = 0; month < 12; month++) {
      if (claims().some((c) => c.open && (c.contactsRequired ?? 0) > 0)) break;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
    }
    const claim = claims().find((c) => c.open && (c.contactsRequired ?? 0) > 0);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    if (!claim) {
      tried.push(`${where}: no claim under a work-search rule`);
      continue;
    }
    // Every week already paid matches the share its recorded search earned.
    const searches = () =>
      jobs.table("searches").rows() as unknown as SearchRow[];
    for (const row of searches().filter((s) => s.paidShare !== undefined))
      expect(row.paidShare, `${where} ${row.id}`).toBe(searchShare(row));
    // A week with too few contacts pays nothing and uses up no week of benefit.
    // (Hand-set for the one claim: it proves the edge; the generated year above
    // proves the rest.) The record is the claim's own week.
    const before = jobs.table("claims").get(claim.id) as unknown as ClaimRow;
    const day = core.date;
    jobs.table("searches").put({
      id: `search:${claim.personId}:${day}`,
      claimId: claim.id,
      personId: claim.personId,
      week: day,
      contacts: 0,
      openings: 3,
      required: claim.contactsRequired!,
    } as never);
    // Advance to the claim's next pay day and one matching week beyond.
    advanceCore(core, addDays(makeIsoDate(core.date), 8));
    const after = jobs.table("claims").get(claim.id) as unknown as
      ClaimRow | undefined;
    const denied = searches().find(
      (s) => s.id === `search:${claim.personId}:${day}`,
    )!;
    if (after && after.open && after.nextPayAt > before.nextPayAt) {
      expect(denied.paidShare, `${where} ${denied.id}`).toBe(0);
      expect(after.paidMinor, `${where} ${claim.id} paid`).toBe(
        before.paidMinor,
      );
      expect(after.weeksLeft, `${where} ${claim.id} weeks`).toBe(
        before.weeksLeft,
      );
      process.stdout.write(
        `${where}: ${claim.id} needs ${claim.contactsRequired} contacts a week; week record ${denied.id} paid share 0, weeks left stayed ${after.weeksLeft}\n`,
      );
      return;
    }
    tried.push(
      `${where}: claim ${claim.id} ended or was not due in the window`,
    );
  }
  throw new Error(
    `no drawn place showed a denied week (${tried.join("; ")}; seed ${seed})`,
  );
}, 1_800_000);

it("the share is the contacts over what could be asked, capped by the openings, and a rule that asks nothing pays in full", () => {
  const row = (contacts: number, openings: number, required: number) =>
    ({
      id: "s",
      claimId: "c",
      personId: "p",
      week: "2025-01-01",
      contacts,
      openings,
      required,
    }) as SearchRow;
  expect(searchShare(undefined)).toBe(1);
  expect(searchShare(row(0, 5, 0))).toBe(1);
  expect(searchShare(row(0, 0, 3))).toBe(1);
  expect(searchShare(row(0, 5, 3))).toBe(0);
  expect(searchShare(row(1, 5, 4))).toBeCloseTo(0.25);
  expect(searchShare(row(2, 2, 4))).toBe(1);
  expect(searchShare(row(9, 9, 3))).toBe(1);
});
