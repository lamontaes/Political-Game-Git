/** Generated play evidence; proposals use the legislature's writers and unforced votes. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import {
  billOf,
  draftBill,
  scheduleVote,
  votesOn,
} from "./modules/legislature";
import { governments } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { adjustPrice } from "./modules/place-prices";

const keys = [
  "environment-energy.clean-electricity-standard",
  "environment-energy.price-carbon",
  "environment-energy.bottle-deposit",
  "transportation-infrastructure.mileage-fee-replaces-fuel-tax",
  "transportation-infrastructure.public-broadband",
  "transportation-infrastructure.fare-free-transit",
].map((key) => `us-policy-positions:${key}`);

/** The laws whose price is paid to the governing level's treasury. */
const publicPayee = new Set(
  [
    "environment-energy.price-carbon",
    "transportation-infrastructure.mileage-fee-replaces-fuel-tax",
    "transportation-infrastructure.public-broadband",
  ].map((key) => `us-policy-positions:${key}`),
);

it("reads price laws at settlement and removes their rules on repeal", () => {
  const draw = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : drawPlace(
        process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex"),
        "session-a-prices",
      );
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const council = townSeats(api).find(
      (seat) => seat.office.kind === "council" && seat.holder,
    );
    const proposals: string[] = [];
    if (council?.holder?.personId) {
      for (const policy of billCatalog(api, "city").flatMap((subject) =>
        subject.topics.flatMap((topic) => topic.policies),
      )) {
        if (!keys.includes(policy.question ?? "") || !policy.authority.allowed)
          continue;
        const bill = draftBill(api, {
          bodyOfficeId: council.office.id,
          sponsorId: council.holder.personId,
          provisions: [
            provisionFor({ policyId: policy.id, operation: "enact" }),
          ],
        });
        scheduleVote(api, bill.id);
        proposals.push(bill.id);
      }
    }
    const receipts = new Map<string, unknown>();
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const receipt of core.cashJournal.detailedReceipts.values()) {
        if (
          !receipt.sourceRef.id.startsWith("price:") ||
          !keys.some((key) => receipt.sourceRef.id.includes(key))
        )
          continue;
        receipts.set(receipt.id, {
          id: receipt.id,
          date: receipt.date,
          sourceRef: receipt.sourceRef,
          postings: receipt.postings,
          owners: [...receipt.owners],
          source: receipt.source,
        });
      }
    }
    const seconds = (performance.now() - started) / 1000;
    const evidence = {
      draw,
      date: core.date,
      seconds,
      modules: core.modules.size,
      proposals: proposals.map((id) => ({
        bill: billOf(api, id),
        votes: votesOn(api, id),
      })),
      laws: api
        .moduleState("core2-laws-v1")
        .table("laws")
        .rows()
        .filter((row) => keys.includes(String(row.series))),
      rules: api.moduleState("place-prices").table("rules").rows(),
      receipts: [...receipts.values()],
      people: [...core.people.values()].map((p) => ({
        id: p.id,
        name: `${p.givenName} ${p.familyName}`,
        householdId: p.householdId,
      })),
      journalTotals: core.cashJournal.totals,
    };
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );

    // Controlled cases below are not the generated-year proof above.
    const rules = () => api.moduleState("place-prices").table("rules").rows();
    const changeLaws = (value: number) => {
      for (const level of lawChain(api).levels)
        for (const series of keys)
          enactLaw(api, {
            jurisdiction: level.jurisdiction,
            level: level.level,
            series,
            value,
            effectiveDate: core.date,
            measureId: `fixture:${value}:${series}`,
            citation:
              "Controlled enactment/repeal edge case after the played year.",
          });
      advanceCore(core, addDays(makeIsoDate(core.date), 32));
    };
    changeLaws(1);
    // A price paid to the public is a rule only where the governing level
    // keeps a treasury to be paid to (the engine ends it otherwise).
    for (const key of keys) {
      const governing = lawInForce(api, key).governing?.jurisdiction;
      const treasury = governments(api).some((g) => g.id === governing);
      const expected = !publicPayee.has(key) || treasury;
      expect(
        rules().some((row) => String(row.cause).startsWith(`law:${key}:`)),
        `${where}: ${key}, governing ${governing}, treasury ${treasury}`,
      ).toBe(expected);
    }
    changeLaws(-1);
    expect(
      rules().filter((row) =>
        keys.some((key) => String(row.cause).startsWith(`law:${key}:`)),
      ),
    ).toHaveLength(0);
    adjustPrice(api, {
      placeId: lawChain(api).townPlaceId,
      good: "electricity",
      share: 0.1,
      cause: "independent-service-record",
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Controlled service-rule fixture.",
        estimatedFrom: "Fixture only.",
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 32));
    expect(
      rules().some((row) => row.cause === "independent-service-record"),
    ).toBe(true);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
