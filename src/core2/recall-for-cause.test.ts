/**
 * A recall for cause (pool item gov-recall-for-cause-start): where a state's
 * law lets a place recall an official only for misconduct, an ordinance vote
 * starts no petition, but a recorded criminal charge against a serving local
 * official does. Residents who heard of it weigh organizing and signing
 * through the recall decisions' own weights. The world is the played one
 * (buildBenchWorld, two-level, every module) in a place drawn from all 56
 * whose state requires grounds; the charge is a fixture, since few played
 * years hold one against a council member. The member is one already past
 * the state's opening bar on their term, so the charge falls on the second
 * day and the world plays three weeks, not the months a big town's memory
 * would not hold.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { resolveMunicipalRecallRule } from "./gov-rules/municipal-ballot-rules";
import { townSeats } from "./modules/offices";
import { lawChain } from "./modules/laws";
import { openToRecall, recallRule, recallsOf } from "./modules/recalls";
import { NEWS_MODULE_ID, storiesHeard } from "./modules/news";
import { setTraitProbe } from "./trait-probe";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`recall-cause:${Date.now()}`).digest("hex");

it("a recorded charge against a serving local official starts a recall where the state requires grounds", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const unreported: string[] = [];
  for (
    let draw = 0;
    draw < 200 && tried.length < 6 && unreported.length < 6;
    draw += 1
  ) {
    const place = drawPlace(`${seed}:${draw}`, "recall-cause");
    // Only places whose state's law gives a recall and requires grounds for it.
    const law = resolveMunicipalRecallRule(place.state.slice(3));
    if (!law.circulationDays || law.groundsRequired !== true) continue;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const rule = recallRule(api);
    if (!rule || rule.groundsRequired !== true) {
      if (rule) tried.push(`${where}: the state does not require grounds`);
      continue;
    }
    advanceCore(world.core, addDays(makeIsoDate(api.state.date), 1));
    const seat = townSeats(api).find(
      (s) =>
        s.office.kind === "council" &&
        s.holder?.personId &&
        openToRecall(api, s.holder),
    );
    if (!seat) {
      tried.push(`${where}: no council member open to a recall yet`);
      continue;
    }
    const official = seat.holder!.personId!;
    const charged = `justice.charged:fixture:${official}`;
    api.emit({
      id: charged,
      date: api.state.date,
      kind: "justice.charged",
      personIds: [official],
      placeId: lawChain(api).townPlaceId,
      facts: { caseId: `fixture:${official}`, offense: "bribery" },
      publicRecord: true,
      news: true,
      source: {
        tag: "SOURCED",
        citation: "Fixture charge",
        asOf: api.state.date,
      },
    });
    const calls: Record<string, number> = {};
    setTraitProbe({
      formula(row) {
        calls[row.decisionId] = (calls[row.decisionId] ?? 0) + 1;
      },
    });
    try {
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 20));
    } finally {
      setTraitProbe(undefined);
    }
    // The town can act only on a charge it heard of: where no outlet printed
    // a story reporting it, nobody heard, and the place is passed over.
    const reported = (
      api.moduleState(NEWS_MODULE_ID).table("stories").rows() as unknown as {
        id: string;
        facts?: { sourceRecordId?: string };
      }[]
    ).some(
      (story) =>
        story.id === charged || story.facts?.sourceRecordId === charged,
    );
    if (!reported) {
      unreported.push(`${where}: no outlet printed a story on ${charged}`);
      continue;
    }
    const petition = recallsOf(api).find((r) => r.lawId === charged);
    if (!petition) {
      tried.push(
        `${where}: no resident moved to organize over ${charged} (organize weighed ${calls["recalls.organize"] ?? 0} times)`,
      );
      continue;
    }
    expect(petition.cause, where).toBe("misconduct");
    expect(petition.memberId, where).toBe(official);
    // The organizer heard of the charge in the news: a printed story that
    // reports it.
    expect(
      storiesHeard(api, petition.organizerId).some(
        (story) =>
          story.id === charged || story.facts.sourceRecordId === charged,
      ),
      where,
    ).toBe(true);
    expect(calls["recalls.organize"] ?? 0, where).toBeGreaterThan(0);
    expect(calls["recalls.sign"] ?? 0, where).toBeGreaterThan(0);
    console.log(
      `recall-for-cause: ${where}: ${petition.id}, organizer ${petition.organizerId}, ${petition.signatures} of ${petition.required} signatures; organize weighed ${calls["recalls.organize"]}, sign ${calls["recalls.sign"]}`,
    );
    return;
  }
  throw new Error(
    `no drawn place started a recall for cause: ${[...tried, ...unreported].join("; ")}`,
  );
}, 1_800_000);
