// @vitest-environment node
/** Exhaustive opening-law drafting audit. These drafts are not passed votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { inForceOn, lawRowIsLater } from "./laws-in-force";
import {
  bodyJurisdiction,
  bodyReach,
  bodyRow,
  draftBill,
  FEDERAL_HOUSE,
  memberKey,
  members,
} from "./modules/legislature";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "starting-law-repeal-routes");

it(`every active opening law has a reversal bill: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
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
      // Existing production alias: group-a-wages.localWageAuthority writes
      // the authority series read by the minimum-wage resolver. This is a
      // concrete policy route, not the old audit's unsupported exemption.
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
            }),
          ],
        });
        if (
          bill.status !== "drafted" ||
          !bill.authority.every((a) => a.allowed)
        )
          continue;
        routes.push({
          lawId: row.id,
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
      "Every active starting law must have an authorized reversal draft",
    ).toEqual([]);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
