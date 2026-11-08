/** Played proof: real new life, vote engine, executive choices, and clock. No law or vote fixtures.
 * node --import tsx scripts/law-levels-state-proof.ts [replay] [--serve]
 * A losing vote is a reported unsuccessful draw, not a forced outcome.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { drawPlace } from "../scripts/core2-year/place";
import { lawChainForPlace } from "../src/core2/laws-starting";
import { benchRequest, benchWorld, serialize } from "../src/bench/handler";
import { townSeats } from "../src/core2/modules/offices";
import { coreAPI } from "../src/core2/state";
import {
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../src/core2/modules/laws";
import {
  draftBill,
  holdVote,
  members,
  memberKey,
  bodyRow,
  bodyJurisdiction,
  executiveOf,
  votesOn,
  billOf,
} from "../src/core2/modules/legislature";
import { provisionFor } from "../src/core2/bill-catalog";
import { addDays } from "../src/core2/kernel/dates";
import { snapshotExplicitControlV1 } from "../src/core2/player-control-state-v1";
import { billPaper } from "../src/bench/legislature";
async function main() {
  const replay = process.argv[2] ?? randomBytes(8).toString("hex");
  const place = drawPlace(
    replay,
    "played-law-reversals",
    (key) => lawChainForPlace(key).incorporated,
  );
  console.log(JSON.stringify({ replay, place }));
  const screenshotDir = process.env.LAW_PROOF_SCREENSHOTS;
  if (process.argv.includes("--serve") || screenshotDir)
    await import("../src/bench/server");
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
  const world = benchWorld();
  const core = world.core!;
  const api = coreAPI(core);
  const chain = lawChain(api);
  const offices = api
    .moduleState("core2-offices-v1")
    .table("offices")
    .rows() as any[];
  const state = offices.find(
    (o) =>
      o.jurisdiction === chain.stateKey && bodyRow(o.kind)?.level === "state",
  );
  const town = offices.find(
    (o) =>
      o.level === "city" &&
      o.coversTown !== false &&
      bodyRow(o.kind) &&
      bodyJurisdiction(api, o.id) === chain.levels.at(-1)!.jurisdiction,
  );
  console.log(JSON.stringify({ chain, state: state?.id, town: town?.id }));
  const advanceDay = async () => {
    let result = await request("/api/advance?mode=day");
    for (let stops = 0; stops < 50; stops++) {
      const packet = result.packet;
      if (!packet || packet.kind === "complete" || packet.kind === "choice")
        return;
      result = await request(
        `/api/resume?pauseId=${encodeURIComponent(packet.pauseId ?? "")}`,
      );
    }
    throw new Error("Fifty play stops did not clear.");
  };
  const steps = [
    [state?.id, "law:local-power:rent-stabilization", "raise", 1],
    [
      town?.id,
      "question:us-policy-positions:housing-land-use.rent-stabilization",
      "enact",
      1,
    ],
    [state?.id, "law:local-power:rent-stabilization", "lower", 0],
    [state?.id, "law:local-power:rent-stabilization", "raise", 1],
  ] as const;
  const proof: any[] = [];
  for (const [body, policyId, operation, amount] of steps) {
    if (!body) throw new Error(`No body for ${policyId}`);
    const executive = executiveOf(api, body).term;
    if (executive) {
      await request(`/api/play?id=${encodeURIComponent(memberKey(executive))}`);
      if (snapshotExplicitControlV1(core).personId !== memberKey(executive))
        await advanceDay();
      console.log(
        JSON.stringify({
          executive: memberKey(executive),
          controlled: snapshotExplicitControlV1(core).personId,
          date: core.date,
        }),
      );
    }
    const provision = provisionFor({
      policyId,
      operation,
      amount,
      effectiveDate: addDays(core.date, 1),
    });
    const sponsor =
      body === state?.id
        ? townSeats(api).find((s) => s.office.id === body && s.holder?.personId)
            ?.holder
        : members(api, body)[0];
    if (!sponsor) throw new Error(`No sponsor for ${body}`);
    const provisions = [provision];
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: memberKey(sponsor),
      provisions,
    });
    let result = holdVote(api, bill.id);
    if (result.status === "awaiting-signature") {
      await request(
        `/api/desk?${new URLSearchParams({ billId: bill.id, how: "sign" })}`,
      );
      result = billOf(api, bill.id);
    }
    if (
      screenshotDir &&
      body === state?.id &&
      proof.length >= 2 &&
      result.status === "enacted"
    ) {
      // Read the native enacted paper before its effective date, while the
      // preceding law still governs. Restore the executive before time moves.
      await request(`/api/play?id=${encodeURIComponent(memberKey(sponsor))}`);
      const { chromium } = await import("playwright");
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
        if (proof.length === 3)
          await page
            .getByRole("button", { name: "Next page", exact: true })
            .click();
        await page
          .getByRole("button", { name: "Read the bill", exact: true })
          .nth(proof.length === 2 ? 1 : 0)
          .click();
        await page
          .getByRole("button", { name: "Back to your seat", exact: true })
          .waitFor({ state: "visible" });
        await page
          .getByRole("heading", {
            name: billPaper(core, bill.id).spoken,
            exact: true,
          })
          .waitFor({ state: "visible" });
        mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot({
          path: join(
            screenshotDir,
            proof.length === 2 ? "ban-paper.png" : "restore-paper.png",
          ),
          fullPage: true,
        });
      } finally {
        await browser.close();
      }
      if (executive)
        await request(
          `/api/play?id=${encodeURIComponent(memberKey(executive))}`,
        );
    }
    const rows = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows()
      .filter((r) => (r.terms as any)?.enactedByBill === bill.id);
    if (result.status === "enacted" || result.status === "overridden")
      await advanceDay();
    const subject = provision.series?.startsWith("local-power:")
      ? provision.series.slice("local-power:".length)
      : (provision.series ?? provision.question!);
    const entry = {
      body,
      jurisdiction: bodyJurisdiction(api, body),
      policyId,
      operation,
      status: result.status,
      billId: bill.id,
      sponsorId: memberKey(sponsor),
      votes: votesOn(api, bill.id).length,
      provisions: result.provisions,
      repeats: result.repeats,
      rows,
      after: lawInForce(api, subject),
      paper: billPaper(core, bill.id),
    };
    proof.push(entry);
    console.log(JSON.stringify(entry));
  }
  writeFileSync(
    process.env.LAW_PROOF_OUT ?? "/tmp/law-levels-state-proof.json",
    serialize({ replay, place, proof }),
  );
  const townLaw = proof[1].after.governing?.id;
  if (
    !proof.every(
      (step) => step.status === "enacted" || step.status === "overridden",
    )
  )
    throw new Error("A real vote failed; this draw does not prove reversal.");
  if (
    !townLaw ||
    proof[2].after.governing?.id === townLaw ||
    proof[3].after.governing?.id !== townLaw
  )
    throw new Error("Town rule did not suspend and return.");
  const sponsor = townSeats(api).find(
    (s) => s.office.id === state!.id && s.holder?.personId,
  )!.holder!;
  await request(`/api/play?id=${encodeURIComponent(memberKey(sponsor))}`);
  console.log(
    "PROVED: town rule suspended and restored; state sponsor selected.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
