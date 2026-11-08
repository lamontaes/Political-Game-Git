import { writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { join } from "node:path";
import { drawPlace } from "./core2-year/place";
import { benchRequest, benchWorld, serialize } from "../src/bench/handler.ts";
import { coreAPI } from "../src/core2/state.ts";
import { townSeats } from "../src/core2/modules/offices.ts";
import {
  draftBill,
  holdVote,
  members,
  memberKey,
  memberPosition,
  offerDeal,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  executiveOf,
  billOf,
} from "../src/core2/modules/legislature.ts";
import { provisionFor } from "../src/core2/bill-catalog.ts";
import { lawInForce, LAWS_MODULE_ID } from "../src/core2/modules/laws.ts";
import { addDays } from "../src/core2/kernel/dates.ts";
import { earliestModuleStopsV1 } from "../src/core2/player-stops-v1.ts";
import { snapshotExplicitControlV1 } from "../src/core2/player-control-state-v1.ts";
import { billPaper } from "../src/bench/legislature.ts";
import { chromium } from "playwright";
import {
  cabinetOf,
  nominate,
} from "../src/core2/office-day-federal-president.ts";
const replay = process.argv[2] ?? randomBytes(8).toString("hex");
const output = process.env.LAW_PROOF_OUTPUT ?? "/tmp/law-levels-congress-proof";
mkdirSync(output, { recursive: true });
const place = drawPlace(replay, "played-law-reversals");
const question =
  "us-policy-positions:health-human-services.medicaid-work-requirement";
const proof: any[] = [];
async function main() {
  console.log(JSON.stringify({ replay, place }));
  await import("../src/bench/server.ts");
  const request = async (path: string) => {
    const r = await benchRequest(
      "POST",
      new URL(path, "http://localhost:3000"),
      { developer: false },
    );
    if (r.status !== 200) throw new Error(`${path}: ${r.status} ${r.body}`);
    return JSON.parse(String(r.body));
  };
  await request(
    `/api/newlife?${new URLSearchParams({ seed: place.seed, placeKey: place.key })}`,
  );
  const core = benchWorld().core!;
  const api = coreAPI(core);
  const starting = lawInForce(api, question);
  const advance = async () => {
    let r = await request("/api/advance?mode=day");
    for (let n = 0; n < 50; n++) {
      if (
        !r.packet ||
        r.packet.kind === "complete" ||
        r.packet.kind === "choice"
      )
        return;
      r = await request(
        `/api/resume?pauseId=${encodeURIComponent(r.packet.pauseId ?? "")}`,
      );
    }
    throw new Error("Fifty clock stops did not clear");
  };
  const sponsor = townSeats(api).find(
    (s) => s.office.kind === "us-senate" && s.holder?.personId,
  )?.holder;
  if (!sponsor) throw new Error("No represented senator");
  const president = executiveOf(api, FEDERAL_SENATE).term!;
  for (const operation of ["enact", "repeal"] as const) {
    await request(`/api/play?id=${encodeURIComponent(memberKey(president))}`);
    if (snapshotExplicitControlV1(core).personId !== memberKey(president))
      await advance();
    const effectiveDate = addDays(core.date, 1);
    const assistance =
      "us-policy-positions:health-human-services.work-requirement-for-assistance";
    const bill = draftBill(api, {
      bodyOfficeId: FEDERAL_SENATE,
      sponsorId: memberKey(sponsor),
      provisions: [
        provisionFor({
          policyId: `question:${question}`,
          operation,
          effectiveDate,
        }),
        operation === "enact"
          ? provisionFor({
              policyId: `question:${assistance}`,
              operation: "repeal",
              effectiveDate,
            })
          : provisionFor({
              policyId: "law:income-tax",
              operation: "lower",
              amount:
                lawInForce(api, "income-tax").levels.find(
                  (l) => l.level === "federal",
                )!.row!.value! - 1,
              effectiveDate,
            }),
      ],
    });
    const offers: any[] = [];
    // One real offer per opposing member. Acceptance is the engine's decision;
    // every accepted offer creates a future obligation for this sponsor.
    for (const chamber of [FEDERAL_SENATE, FEDERAL_HOUSE]) {
      const opposition = members(api, chamber)
        .map((term) => ({
          id: memberKey(term),
          position: memberPosition(api, bill.id, memberKey(term)),
        }))
        .filter((m) => m.position.total <= 0)
        .sort((a, b) => b.position.total - a.position.total);
      for (const member of opposition) {
        const result = offerDeal(api, {
          billId: bill.id,
          memberId: member.id,
          kind: "back-their-item",
        });
        offers.push({ chamber, member: member.id, ...result });
      }
    }
    let result = holdVote(api, bill.id);
    if (result.status === "awaiting-signature") {
      await request(
        `/api/desk?${new URLSearchParams({ billId: bill.id, how: "sign" })}`,
      );
      result = billOf(api, bill.id);
    }
    if (result.status === "enacted" || result.status === "overridden") {
      console.log(
        JSON.stringify({
          beforePaper: operation,
          stops: earliestModuleStopsV1(core, {
            controlledPersonId: memberKey(president),
            from: { date: core.date, minuteOfDay: 0 },
            through: { date: addDays(core.date, 1), minuteOfDay: 0 },
          }),
        }),
      );
      for (const post of cabinetOf(api))
        if (post.status === "vacant" || post.status === "rejected") {
          const nominee = nominate(api, memberKey(president), post.postId);
          console.log(JSON.stringify({ nomination: post.postId, nominee }));
        }
      await request(`/api/play?id=${encodeURIComponent(memberKey(sponsor))}`);
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({
          viewport: { width: 1600, height: 1800 },
        });
        await page.goto("http://localhost:3000/play");
        await page.getByTestId("continue").click();
        await page.locator("#game").waitFor({ state: "visible" });
        await page
          .getByRole("button", { name: "Politics", exact: true })
          .click();
        await page.locator("#sheet-tabs [data-tab=office]").click();
        await page.locator(".office-screen").waitFor({ state: "visible" });
        const drafts = page.getByRole("button", {
          name: "Drafts",
          exact: true,
        });
        if (await drafts.isVisible()) await drafts.click();
        await page
          .getByRole("button", { name: "Read the bill", exact: true })
          .nth(proof.length)
          .click();
        await page
          .getByRole("heading", {
            name: billPaper(core, bill.id).spoken,
            exact: true,
          })
          .waitFor({ state: "visible" });
        await page.screenshot({
          path: join(output, `${operation}.png`),
          fullPage: true,
        });
        await page.getByText(/^Decided:/).scrollIntoViewIfNeeded();
        await page.screenshot({
          path: join(output, `${operation}-decision.png`),
          fullPage: true,
        });
      } finally {
        await browser.close();
      }
      await request(`/api/play?id=${encodeURIComponent(memberKey(president))}`);
      await advance();
    }
    const entry = {
      operation,
      billId: bill.id,
      status: result.status,
      offers,
      rows: api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows()
        .filter((r) => (r.terms as any)?.enactedByBill === bill.id),
      after: lawInForce(api, question),
      paper: billPaper(core, bill.id),
    };
    proof.push(entry);
    writeFileSync(
      join(output, "records.json"),
      serialize({ replay, place, starting, proof }),
    );
    console.log(
      JSON.stringify({
        operation,
        billId: bill.id,
        status: result.status,
        offers: offers.length,
        accepted: offers.filter((o) => o.accepted).length,
        tally: entry.paper.tally,
        governing: entry.after.governing?.id,
      }),
    );
  }
  console.log(
    JSON.stringify({
      complete:
        proof.every((p) => ["enacted", "overridden"].includes(p.status)) &&
        proof[0].after.governing?.jurisdiction === "US" &&
        proof[1].after.governing?.id === starting.governing?.id,
      starting: starting.governing?.id,
      after2027: lawInForce(api, question, "2027-01-01").governing?.id,
    }),
  );
  assert(
    proof.every((p) => ["enacted", "overridden"].includes(p.status)),
    "Both bills must become law",
  );
  assert.equal(proof[0].after.governing?.jurisdiction, "US");
  assert.equal(proof[1].after.governing?.id, starting.governing?.id);
  assert.equal(
    lawInForce(api, question, "2027-01-01").governing?.id,
    starting.governing?.id,
  );
  console.log("Both bills became law; the state answer returned.");
  if (!process.argv.includes("--serve")) process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
