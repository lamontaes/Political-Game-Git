/** Native played-year evidence, followed by explicit controlled law edge cases. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, fillInPerson } from "./state";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { POLICY_QUESTIONS } from "./policy-answers";
import { limitOutsideSales } from "./residents-economy";
import type { CoreState } from "./types";

const question =
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";
/**
 * Draws are screened against the state's researched starting answer, the row
 * the laws engine puts in force at the opening (modules/laws.ts), before any
 * is opened; at most OPENED screened places are opened. In measured runs 3 of
 * 9 opened places had no farm selling outside, so 12 all passed over comes
 * about once in 530,000 runs.
 */
const DRAWS = 2000;
const OPENED = 12;
const startsWithLimit = (stateKey: string): boolean =>
  POLICY_QUESTIONS[question]?.answers[stateKey]?.answer === "yes";

/** The town's open farms that sell outside it, as the world opens. */
function farmsSellingOutside(core: CoreState, town: string): string[] {
  const sellers = new Set(
    [...(residentsRuntime(core)?.flows.values() ?? [])]
      .filter((f) => f.kind === "outside-sales" && f.amountMinor > 0)
      .map((f) => f.payeeId),
  );
  return [...core.organizations.values()]
    .filter(
      (org) =>
        org.placeId === town &&
        org.classification === "enterprise:agriculture" &&
        core.finance.businesses.has(org.id) &&
        !core.finance.businesses.get(org.id)!.closedAt &&
        sellers.has(org.id),
    )
    .map((org) => org.id);
}

it("reads withdrawal law at farm production and removes its limit on repeal", () => {
  const named = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : undefined;
  const base = randomBytes(32).toString("hex");
  const passedOver: string[] = [];
  let opened = 0;
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < (named ? 1 : DRAWS); attempt++) {
      if (opened >= OPENED) break;
      const draw =
        named ?? drawPlace(`${base}:${attempt}`, "session-a-groundwater");
      if (!named && !startsWithLimit(draw.state)) continue;
      opened += 1;
      const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      // Chosen from what the world opens with, never from the effect: the
      // starting law limits withdrawal, and an open farm in town sells outside.
      const farms = farmsSellingOutside(core, lawChain(api).townPlaceId);
      if (lawInForce(api, question).value !== 1 || !farms.length) {
        passedOver.push(
          `${where}: ${farms.length ? "no withdrawal limit in force" : "no farm selling outside"}`,
        );
        continue;
      }
      const table = api.moduleState("business").table("operating");
      const records = new Map<string, unknown>();
      const receipts = new Map<string, unknown>();
      const owners = new Map<string, unknown>();
      const started = performance.now();
      for (let day = 0; day < 365; day++) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        for (const row of table.rows()) {
          if (!String(row.cause).startsWith(`law:${question}:`)) continue;
          const org = core.organizations.get(String(row.organizationId));
          const owner = api
            .moduleState("business")
            .table("owners")
            .get(String(row.organizationId));
          if (owner?.ownerId) {
            core.focusPersonIds.add(String(owner.ownerId));
            const person = fillInPerson(core, String(owner.ownerId));
            owners.set(String(owner.ownerId), {
              id: owner.ownerId,
              name: `${person?.givenName} ${person?.familyName}`,
            });
          }
          const key = `${row.id}:${row.cause}:${core.date.slice(0, 7)}`;
          if (records.has(key)) continue;
          records.set(key, {
            date: core.date,
            row,
            org,
            owner: api
              .moduleState("business")
              .table("owners")
              .get(String(row.organizationId)),
            flows: [...(residentsRuntime(core)?.flows.values() ?? [])]
              .filter(
                (f) =>
                  f.payeeId === row.organizationId &&
                  f.kind === "outside-sales",
              )
              .map((f) => ({ ...f })),
          });
        }
        for (const receipt of core.cashJournal.detailedReceipts.values()) {
          if (!receipt.sourceRef.id.startsWith("owner-draw:")) continue;
          receipts.set(receipt.id, {
            id: receipt.id,
            date: receipt.date,
            sourceRef: receipt.sourceRef,
            postings: receipt.postings,
            owners: [...receipt.owners],
          });
        }
      }
      const evidence = {
        draw,
        seconds: (performance.now() - started) / 1000,
        modules: core.modules.size,
        date: core.date,
        law: lawInForce(api, question),
        records: [...records.values()],
        owners: [...owners.values()],
        receipts: [...receipts.values()],
        journal: core.cashJournal.totals,
      };
      if (process.env.LAW_LINK_PROOF)
        writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      // The native year read the law at a farm: a rule it caused, on a farm
      // whose outside sales were flowing.
      const ruled = evidence.records as {
        row: { id: string; organizationId: string };
        flows: { id: string; amountMinor: number }[];
      }[];
      expect(
        ruled.length,
        `${where}: no farm rule from the law`,
      ).toBeGreaterThan(0);
      const selling = ruled.find((r) => r.flows.some((f) => f.amountMinor > 0));
      expect(
        selling,
        `${where}: no ruled farm with outside sales flowing`,
      ).toBeDefined();
      // These changes are controlled edge cases, not native-world acceptance
      // evidence. They run on a second opening of the same place, so the farms
      // it was chosen for are there whatever the year did: a farm can close,
      // and the state's legislature can repeal the limit.
      const fresh = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      }).core;
      const freshApi = coreAPI(fresh);
      const freshTable = freshApi.moduleState("business").table("operating");
      const changeLaw = (value: number) => {
        for (const level of lawChain(freshApi).levels)
          enactLaw(freshApi, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series: question,
            value,
            effectiveDate: fresh.date,
            measureId: `fixture:groundwater:${value}`,
            citation:
              "Controlled law case on a second opening of the drawn place.",
          });
        advanceCore(fresh, addDays(makeIsoDate(fresh.date), 32));
      };
      changeLaw(1);
      const rules = freshTable
        .rows()
        .filter((r) => String(r.cause).startsWith(`law:${question}:`));
      const compared: string[] = [];
      for (const row of rules) {
        const flows = [
          ...(residentsRuntime(fresh)?.flows.values() ?? []),
        ].filter(
          (f) =>
            f.payeeId === row.organizationId &&
            f.kind === "outside-sales" &&
            !f.endedAt,
        );
        const amounts = flows.map((f) => f.amountMinor);
        limitOutsideSales(fresh, String(row.organizationId), 1);
        const factor =
          1 -
          Number(row.share) *
            freshApi.parameter("businessGroundwaterOutputElasticity");
        flows.forEach((f, i) =>
          expect(
            Math.abs(amounts[i]! - f.amountMinor * factor),
          ).toBeLessThanOrEqual(1),
        );
        limitOutsideSales(fresh, String(row.organizationId), factor);
        compared.push(...flows.map((f) => f.id));
      }
      // The controlled limit was compared on at least one farm's flowing sales.
      expect(rules.length, `${where}: no rule under the limit`).toBeGreaterThan(
        0,
      );
      expect(compared.length, `${where}: no sales compared`).toBeGreaterThan(0);
      changeLaw(0);
      expect(
        freshTable
          .rows()
          .filter((r) => String(r.cause).startsWith(`law:${question}:`)),
      ).toHaveLength(0);
      if (process.env.LAW_LINK_PROOF)
        writeFileSync(
          process.env.LAW_LINK_PROOF,
          JSON.stringify({
            ...evidence,
            controlled: { rules: rules.length, compared },
          }),
        );
      console.log(
        `GROUNDWATER ${where}: native rule ${selling!.row.id} on ${selling!.row.organizationId}, sales flow ${selling!.flows.find((f) => f.amountMinor > 0)!.id}; ${rules.length} rules and ${compared.length} flows compared under the controlled limit; ${opened} opened${passedOver.length ? `; passed over ${passedOver.join("; ")}` : ""}`,
      );
      return;
    }
    throw new Error(
      `No drawn place opened with a withdrawal limit and a farm selling outside (${opened} opened): ${passedOver.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
  // Measured one at a time on a 4-core container: 75 to 384 seconds for a
  // drawn place, its year and the second opening (the longest, Hampton, New
  // Hampshire). Each place passed over adds one opening, 3 to 36 seconds; 11
  // passed over and the longest year come to about 13 minutes. Beside another
  // file this test ran about twice as slow (156 and 189 seconds at two
  // workers, against 57 to 97 alone), so the bound is 30 minutes.
}, 1_800_000);
