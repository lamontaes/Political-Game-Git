/**
 * Calibrates candidacyRevolvingDoorWeight: in drawn towns, the margins of
 * every adult weighing a council seat they do not hold (their reasons to run
 * against the stay-out pull, named and counted alike), and the pull that
 * keeps out the share of would-be newcomers Fisman, Leder-Luis, O'Donnell and
 * Vannutelli (2025) measure (18.2%, 11% to 25%).
 *
 *   node --import tsx scripts/law-wiring/calibrate-revolving-door.ts <seed> [draws]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import {
  countedCandidacyReasons,
  decideToRun,
  RUN,
} from "../../src/core2/modules/candidacy";
import {
  CANDIDACY_PARAMETERS,
  candidacyParameter,
} from "../../src/core2/candidate-pool";
import { countedResidents } from "../../src/core2/electorate";
import { lawChain } from "../../src/core2/modules/laws";
import type { ContestRow } from "../../src/core2/modules/elections";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
// The margins are measured with the law's pull off.
(CANDIDACY_PARAMETERS.candidacyRevolvingDoorWeight as { value: number }).value =
  0;
const seed = process.argv[2] ?? "revolving-door";
const draws = Number(process.argv[3] ?? 6);
const margins: { margin: number; weight: number }[] = [];
for (let draw = 0; draw < draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "revolving-door");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const offices = api.moduleState("core2-offices-v1").table("offices");
  const council = (
    api
      .moduleState("core2-elections-v1")
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).find((c) =>
    String(
      (offices.get(c.officeId) as { kind?: string } | undefined)?.kind ?? "",
    ).startsWith("council"),
  );
  if (!council) {
    console.error(`${place.name}: no council contest`);
    continue;
  }
  const open = {
    contestId: council.id,
    officeName: council.title,
    filingDeadline: council.filingDeadline,
    sourceIds: [council.id],
  };
  const bar = candidacyParameter(api, "candidacyStayOutPull");
  const town = lawChain(api).townPlaceId;
  let named = 0;
  for (const p of [...core.people.values()]) {
    if (!p.alive || p.placeId !== town) continue;
    // The chooser's own scores: run against stay out, traits included.
    const d = decideToRun(api, p.id, open, true);
    if (!d) continue;
    const run = d.scores.find((s) => s.actionId === RUN.id)?.score ?? 0;
    const out = d.scores.find((s) => s.actionId !== RUN.id)?.score ?? 0;
    margins.push({ margin: run - out, weight: 1 });
    named += 1;
  }
  let counted = 0;
  for (const v of countedResidents(core as CoreState)) {
    if (v.placeId !== town) continue;
    const r = countedCandidacyReasons(api, v, open);
    const sum = Object.values(r).reduce((a, b) => a + b, 0);
    margins.push({ margin: sum - bar, weight: v.weight });
    counted += 1;
  }
  console.error(
    `${place.name} (${place.key}), seed ${place.seed}: ${named} named, ${counted} counted`,
  );
}
// Entrants are rare (a council seat draws a handful), so the share a pull
// keeps out is read from the upper tail of the margins: above a high
// threshold the excess falls off about exponentially, with scale s equal to
// the mean excess, so a pull w keeps out 1 - exp(-w / s) of those over the
// line, and the research's share q needs w = -s ln(1 - q).
const total = margins.reduce((n, m) => n + m.weight, 0);
const sorted = [...margins].sort((a, b) => b.margin - a.margin);
const tail = (share: number) => {
  let acc = 0;
  const rows: { margin: number; weight: number }[] = [];
  for (const m of sorted) {
    if (acc >= share * total) break;
    acc += m.weight;
    rows.push(m);
  }
  const threshold = rows.at(-1)?.margin ?? 0;
  const excess =
    rows.reduce((n, m) => n + m.weight * (m.margin - threshold), 0) /
    Math.max(
      1,
      rows.reduce((n, m) => n + m.weight, 0),
    );
  return { threshold, excess };
};
const out = [0.001, 0.005, 0.01].map((share) => {
  const { threshold, excess } = tail(share);
  return {
    share,
    threshold,
    scale: excess,
    weightFor: {
      low: -excess * Math.log(1 - 0.11),
      mid: -excess * Math.log(1 - 0.182),
      high: -excess * Math.log(1 - 0.25),
    },
  };
});
console.log(
  JSON.stringify({
    weighed: total,
    over: margins.filter((m) => m.margin > 0).reduce((n, m) => n + m.weight, 0),
    tails: out,
  }),
);
