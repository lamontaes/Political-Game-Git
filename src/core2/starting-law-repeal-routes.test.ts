// @vitest-environment node
/** Exhaustive opening-law effect audit. Passed desks are fixtures, not played votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { inForceOn, lawRowIsLater } from "./laws-in-force";
import {
  authorityFor,
  bodyJurisdiction,
  bodyReach,
  bodyRow,
  draftBill,
  executiveDecision,
  LEGISLATURE_MODULE_ID,
  FEDERAL_HOUSE,
  memberKey,
  members,
} from "./modules/legislature";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import type { LawRowInput } from "./laws-starting";
import type { ModuleRow } from "./module-data";
import { coreAPI } from "./state";
import { governmentAt } from "./law-reach/group-b-money";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "starting-law-repeal-routes");

it(`every active opening law has a reversal bill: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    console.log(
      JSON.stringify({
        stage: "opening",
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
      }),
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const opening = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[];
    // Every current dated tier in the loaded jurisdiction chain, including
    // industry-specific wages and regional benefit amounts. The default
    // reader selects one tier, which alone cannot exhaust the stored laws.
    const answers = new Map(
      [...new Set(opening.map((row) => row.series))].map(
        (series) => [series, lawInForce(api, series)] as const,
      ),
    );
    const current = new Map<string, LawRowInput>();
    for (const row of opening) {
      if (!inForceOn(row, api.state.date)) continue;
      const level = answers
        .get(row.series)!
        .levels.find(
          (level) =>
            level.level === row.level &&
            level.jurisdiction === row.jurisdiction,
        );
      if (level?.setAside) continue;
      const key = JSON.stringify([
        row.jurisdiction,
        row.level,
        row.series,
        row.tier,
      ]);
      const prior = current.get(key);
      if (!prior || lawRowIsLater(row, prior)) current.set(key, row);
    }
    const active = new Set([...current.values()].map((row) => row.id));
    const bodies = new Map(
      townSeats(api)
        .filter(
          (seat) =>
            seat.holder &&
            bodyRow(seat.office.kind) &&
            seat.office.level !== "federal",
        )
        .map((seat) => [
          seat.office.id,
          { id: seat.office.id, sponsor: memberKey(seat.holder!) },
        ]),
    );
    bodies.set(FEDERAL_HOUSE, {
      id: FEDERAL_HOUSE,
      sponsor: memberKey(members(api, FEDERAL_HOUSE)[0]!),
    });
    const menus = [...bodies.values()].map((body) => ({
      ...body,
      level: bodyReach(api, body.id),
      jurisdiction: bodyJurisdiction(api, body.id),
      policies: billCatalog(
        api,
        bodyReach(api, body.id),
        bodyJurisdiction(api, body.id),
      ).flatMap((s) => s.topics.flatMap((t) => t.policies)),
    }));
    const routes: unknown[] = [];
    const missing: unknown[] = [];
    for (const row of opening.filter((row) => active.has(row.id))) {
      // Existing production route: the policy writes an authority enactment,
      // read by the local-wage permission rule. Check both the policy row
      // and that permission consumer; the old numeric row is historical.
      const key =
        row.series === "local-minimum-wage-authority"
          ? "us-policy-positions:labor-workforce.local-minimum-wage-authority"
          : row.series;
      const candidates = menus.filter((body) =>
        row.level === "federal"
          ? body.level === "federal"
          : body.jurisdiction === row.jurisdiction,
      );
      let found = false;
      for (const body of candidates) {
        const policy = body.policies.find(
          (p) => (p.series ?? p.question) === key && p.authority.allowed,
        );
        if (!policy) continue;
        const operation =
          policy.kind === "policy-question"
            ? row.value === 0
              ? "enact"
              : "repeal"
            : row.value === 0
              ? "raise"
              : "lower";
        if (!policy.operations.includes(operation)) continue;
        const bill = draftBill(api, {
          bodyOfficeId: body.id,
          sponsorId: body.sponsor,
          provisions: [
            provisionFor({
              policyId: policy.id,
              operation,
              amount: row.value === 0 ? 1 : 0,
              effectiveDate: api.state.date,
            }),
          ],
        });
        if (
          bill.status !== "drafted" ||
          !bill.authority.every((a) => a.allowed)
        )
          continue;
        const context = { lawId: row.id, body: body.id, billId: bill.id };
        console.log(JSON.stringify({ stage: "reversal", ...context }));
        // The votes are a fixture. Signature, bill enactment, law effects and
        // the law-in-force reader are the production path.
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .put({
            ...bill,
            status: "awaiting-signature",
            passedOn: api.state.date,
          } as unknown as ModuleRow);
        expect(
          executiveDecision(api, bill.id, true).status,
          JSON.stringify(context),
        ).toBe("enacted");
        const reversed = lawInForce(api, key).levels.find(
          (level) =>
            level.level === row.level &&
            (row.level === "federal" ||
              level.jurisdiction === row.jurisdiction),
        )?.row;
        expect(reversed, JSON.stringify(context)).toBeDefined();
        expect(reversed!.value, JSON.stringify(context)).toBe(
          row.value === 0 ? 1 : 0,
        );
        expect(reversed!.id, JSON.stringify(context)).not.toBe(row.id);
        if (key !== row.series)
          expect(
            authorityFor(api, {
              kind: "law-amount",
              series: "minimum-wage",
              value: 0,
            }).allowed,
            JSON.stringify(context),
          ).toBe(row.value === 0);
        // Restore this answer through another bill before auditing the next
        // opening row. Otherwise reversing a state's grant would itself bar
        // a later town route that was authorized in the opening world.
        const restoration = draftBill(api, {
          bodyOfficeId: body.id,
          sponsorId: body.sponsor,
          provisions: [
            provisionFor({
              policyId: policy.id,
              operation:
                policy.kind === "policy-question"
                  ? row.value === 0
                    ? "repeal"
                    : "enact"
                  : row.value === 0
                    ? "lower"
                    : "raise",
              amount: row.value ?? 0,
              effectiveDate: api.state.date,
            }),
          ],
        });
        expect(
          restoration.authority.every((a) => a.allowed),
          JSON.stringify(context),
        ).toBe(true);
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .put({
            ...restoration,
            status: "awaiting-signature",
            passedOn: api.state.date,
          } as unknown as ModuleRow);
        expect(
          executiveDecision(api, restoration.id, true).status,
          JSON.stringify(context),
        ).toBe("enacted");
        const restored = lawInForce(api, key).levels.find(
          (level) =>
            level.level === row.level &&
            (row.level === "federal" ||
              level.jurisdiction === row.jurisdiction),
        )?.row;
        expect(restored?.value, JSON.stringify(context)).toBe(row.value);
        if (key !== row.series)
          expect(
            authorityFor(api, {
              kind: "law-amount",
              series: "minimum-wage",
              value: 0,
            }).allowed,
            JSON.stringify(context),
          ).toBe(row.value === 1);
        let reserveProof: unknown;
        if (key === "us-policy-positions:fiscal.minimum-reserve-balance") {
          const gov = governmentAt(api, row.level)!;
          expect(gov, JSON.stringify(context)).toBeDefined();
          const accountId = `reserve:${gov.organizationId}`;
          const main = api.accounts().main(gov.organizationId);
          const heldBefore = api.accounts().balance(accountId);
          const combinedBefore = heldBefore + api.accounts().balance(main);
          const repeats: unknown[] = [];
          for (const [provisions, expected] of [
            [bill.provisions, row.value === 0 ? 1 : 0],
            [restoration.provisions, row.value],
          ] as const) {
            const repeat = draftBill(api, {
              bodyOfficeId: body.id,
              sponsorId: body.sponsor,
              provisions,
            });
            expect(
              repeat.authority.every((a) => a.allowed),
              JSON.stringify(context),
            ).toBe(true);
            api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .put({
                ...repeat,
                status: "awaiting-signature",
                passedOn: api.state.date,
              } as unknown as ModuleRow);
            expect(
              executiveDecision(api, repeat.id, true).status,
              JSON.stringify(context),
            ).toBe("enacted");
            expect(
              lawInForce(api, key).levels.find(
                (level) => level.level === row.level,
              )?.row?.value,
              JSON.stringify(context),
            ).toBe(expected);
            const held = api.accounts().balance(accountId);
            if (expected === 0) expect(held, JSON.stringify(context)).toBe(0);
            expect(
              held + api.accounts().balance(main),
              JSON.stringify(context),
            ).toBe(combinedBefore);
            repeats.push({
              billId: repeat.id,
              held,
              journal: world.core.cashJournal.latestByAccount.get(accountId),
            });
          }
          expect(
            api.accounts().balance(accountId),
            JSON.stringify(context),
          ).toBe(heldBefore);
          reserveProof = { accountId, heldBefore, combinedBefore, repeats };
        }
        routes.push({
          lawId: row.id,
          effectiveSeries: key,
          effectiveLawId: reversed!.id,
          effectiveValue: reversed!.value,
          restorationBillId: restoration.id,
          restoredLawId: restored!.id,
          ...(reserveProof ? { reserveProof } : {}),
          body: body.id,
          jurisdiction: body.jurisdiction,
          policy: policy.id,
          operation,
          billId: bill.id,
        });
        found = true;
        break;
      }
      if (!found)
        missing.push({
          lawId: row.id,
          series: row.series,
          level: row.level,
          jurisdiction: row.jurisdiction,
          candidateBodies: candidates.map((body) => body.id),
        });
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        active: active.size,
        routes,
        missing,
      }),
    );
    expect(routes.length + missing.length).toBe(active.size);
    expect(active.size).toBeGreaterThan(0);
    expect(
      missing,
      "Every active starting law must have an authorized reversal that takes effect",
    ).toEqual([]);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
