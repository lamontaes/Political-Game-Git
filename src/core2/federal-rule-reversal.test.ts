// @vitest-environment node
/** Reader proof only: legislative votes and bill-paper screenshots are separate acceptance work. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { resolveLawInForce } from "./laws-in-force";
import { type LawRowInput } from "./laws-starting";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-rule-reversal");
const question =
  "us-policy-positions:health-human-services.medicaid-work-requirement";

it(`the law reader applies federal enactment and restores the lower law after repeal: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const opening = gameStartDate();
    const world = buildBenchWorld(place.seed, opening, {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const before = lawInForce(api, question);
    expect(before.governing).not.toBeNull();
    expect(before.governing!.level).toBe("state");
    const initialPending = before.pending.find((r) => r.level === "federal");
    expect(initialPending).toBeDefined();
    expect(
      lawInForce(api, question, initialPending!.effectiveDate).governing?.id,
    ).toBe(initialPending!.id);
    const enactedDate = addDays(opening, 1);
    const repealedDate = addDays(opening, 2);
    const enactment = enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: question,
      value: 1,
      effectiveDate: enactedDate,
      measureId: "reader-proof-enactment",
      citation:
        "Reader test: enactment of the federal community-engagement requirement",
    });
    // The production writer does not need an opening-data-only mandate tag.
    expect(enactment.terms?.mandate).toBeUndefined();
    expect(lawInForce(api, question, opening).governing?.id).toBe(
      before.governing!.id,
    );
    const active = lawInForce(api, question, enactedDate);
    expect(active.governing?.id).toBe(enactment.id);
    expect(
      active.levels.find((l) => l.level === "state")?.setAside,
    ).toBeDefined();
    const repeal = enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: question,
      value: 0,
      effectiveDate: repealedDate,
      measureId: "reader-proof-repeal",
      citation:
        "Reader test: repeal of the federal community-engagement requirement",
    });
    const restored = lawInForce(api, question, repealedDate);
    expect(restored.governing?.id).toBe(before.governing!.id);
    expect(restored.value).toBe(before.value);
    expect(
      restored.levels.find((l) => l.level === "state")?.setAside,
    ).toBeUndefined();
    // Later acts with the same effective date follow enactment order.
    const reenactment = enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: question,
      value: 1,
      effectiveDate: repealedDate,
      measureId: "reader-proof-reenactment",
      citation:
        "Reader test: requirement enacted again with the same effective date",
    });
    expect(lawInForce(api, question, repealedDate).governing?.id).toBe(
      reenactment.id,
    );
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: question,
      value: 0,
      effectiveDate: repealedDate,
      measureId: "reader-proof-final-repeal",
      citation: "Reader test: later repeal with the same effective date",
    });
    expect(lawInForce(api, question, repealedDate).governing?.id).toBe(
      before.governing!.id,
    );
    // The original future phase cannot undo Congress's repeal when its date arrives.
    const pending = before.pending.find((r) => r.level === "federal");
    expect(pending).toBeDefined();
    expect(
      lawInForce(api, question, pending!.effectiveDate).governing?.id,
    ).toBe(before.governing!.id);

    // Negative fixture: an arbitrary federal row and old marker are not a
    // source of preemption. No such bill is claimed to have passed in play.
    const unrelated = "us-policy-positions:housing-land-use.rent-stabilization";
    const lower = lawInForce(api, unrelated).governing;
    expect(lower).not.toBeNull();
    const fixture: LawRowInput = {
      ...lower!,
      id: "fixture-unsourced-federal",
      level: "federal",
      jurisdiction: "US",
      value: lower!.value === 1 ? 0 : 1,
      terms: { mandate: true },
    };
    const rows = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[];
    const answer = resolveLawInForce({
      series: unrelated,
      chain: lawChain(api),
      date: opening,
      rows: [...rows.filter((r) => r.series === unrelated), fixture],
    });
    expect(answer.governing?.id).toBe(lower!.id);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        stateLaw: before.governing!.id,
        enactment: enactment.id,
        repeal: repeal.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
