// @vitest-environment node
/** Reader proof only: legislative votes and bill-paper screenshots are separate acceptance work. */
import { randomBytes } from "node:crypto";
import powers from "../../data/research/powers-catalog/question-powers.json";
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

    // The other opening federal mandate must survive the move to shared data.
    // A state cannot repeal SNAP's federal work conditions where SNAP applies.
    const assistance =
      "us-policy-positions:health-human-services.work-requirement-for-assistance";
    const snapRule = powers.questions[assistance].federalPreemption;
    expect(snapRule.excludedStateKeys).toEqual(["US-PR", "US-AS", "US-MP"]);
    const stateAssistance = enactLaw(api, {
      jurisdiction: lawChain(api).stateKey,
      level: "state",
      series: assistance,
      value: 0,
      effectiveDate: enactedDate,
      measureId: "reader-proof-state-assistance",
      citation: "Reader test: state removes its own work condition",
    });
    const snapDate = "2025-11-01" > enactedDate ? "2025-11-01" : enactedDate;
    const snap = lawInForce(api, assistance, snapDate);
    const excluded = snapRule.excludedStateKeys.includes(
      lawChain(api).stateKey,
    );
    expect(snap.governing?.level).toBe(excluded ? "state" : "federal");
    expect(snap.value).toBe(excluded ? 0 : 1);
    // Scope edge cases reuse the drawn world's rows and vary only the chain;
    // these fixtures prove statutory coverage, not a played territorial vote.
    const snapRows = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows()
      .filter((r) => r.series === assistance) as unknown as LawRowInput[];
    for (const stateKey of snapRule.excludedStateKeys) {
      const scoped = resolveLawInForce({
        series: assistance,
        chain: { ...lawChain(api), stateKey },
        rows: snapRows,
        date: snapDate,
      });
      expect(scoped.governing?.id).toBe(stateAssistance.id);
      expect(
        scoped.levels.find((l) => l.level === "federal")?.setAside,
      ).toBeDefined();
    }
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: assistance,
      value: 0,
      effectiveDate: snapDate,
      measureId: "reader-proof-snap-repeal",
      citation: "Reader test: Congress removes its work condition",
    });
    expect(lawInForce(api, assistance, snapDate).governing?.id).toBe(
      stateAssistance.id,
    );

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
