/**
 * Director playtest request 1: does the game reward work, or clicking?
 *
 * Two arms start from the identical saved situation, do the SAME total
 * campaign work — same number of sessions, each the same fixed 90 minutes,
 * same participants — and end at the SAME game time. They differ only in how
 * the work was distributed across days.
 *
 *   spread   one session a day for eight days
 *   packed   four sessions a day for two days, then six days of ordinary time
 *
 * Splitting or concentrating equivalent work into a different number of
 * afternoons should not by itself manufacture effectiveness. A real timing or
 * audience difference would be a legitimate explanation; an unexplained gap is
 * the defect.
 *
 * Reported per arm: support share, money spent, campaign actions actually
 * recorded, opponent activity, and elapsed game days — not just the final
 * percentage.
 */
import { letAdultTimePass } from "../../src/presentation/adult-life";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import {
  createExplicitGeographyLife,
  requireLocalityInState,
} from "../../src/presentation/new-game-geography";
import {
  latestSupportState,
  quantityBasisPoints,
} from "../../src/simulation/campaign-support";
import type { World } from "../../src/simulation";

const OFFICE = "us-ky-general-assembly-v1:house";

function start(stateKey: string, town: string, seed: string) {
  const place = requireLocalityInState(stateKey, town);
  const created = createExplicitGeographyLife({
    placeKey: place.key,
    seed,
    startAge: 40,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  return {
    world: fileForOffice(
      created.game.world,
      created.game.playerPersonId,
      null,
      OFFICE,
    ),
    personId: created.game.playerPersonId,
  };
}

/** Do up to `want` sessions today; returns how many actually happened. */
function workToday(world: World, personId: string, want: number) {
  let done = 0;
  for (let attempt = 0; attempt < want; attempt += 1) {
    const view = projectCampaign(world, personId);
    if (view.phase !== "active") break;
    const offer = view.offers.find(
      (row) => row.unavailable === null && row.kind === "outreach",
    );
    if (!offer) break;
    let next: World;
    try {
      next = spendAnAfternoon(world, personId, offer.kind);
    } catch {
      break;
    }
    if (next === world) break;
    world = next;
    done += 1;
  }
  return { world, done };
}

interface Reading {
  readonly label: string;
  readonly sessions: number;
  readonly workDays: number;
  readonly supportAtSameTime: number;
  readonly opponentSupport: string;
  readonly playerActions: number;
  readonly opponentActions: number;
  readonly spentMinorUnits: number;
  readonly finalSupport: number;
  readonly votePercent: number;
  readonly memoPercent: number | null;
  readonly won: boolean;
}

/** Canonical hidden support, which the player never sees. Measurement only. */
function supportPercent(
  world: World,
  personId: string,
  who = personId,
): number {
  const campaign = (world.history.campaigns ?? []).find(
    (entry) => entry.candidatePersonId === personId,
  )!;
  const scope = campaign.candidateSupportScopes.find(
    (entry) => entry.candidatePersonId === who,
  )!;
  return quantityBasisPoints(latestSupportState(world, campaign, scope)) / 100;
}

function opponentSupports(world: World, personId: string): string {
  const campaign = (world.history.campaigns ?? []).find(
    (entry) => entry.candidatePersonId === personId,
  )!;
  return campaign.candidateSupportScopes
    .filter((scope) => scope.candidatePersonId !== personId)
    .map((scope) =>
      (
        quantityBasisPoints(latestSupportState(world, campaign, scope)) / 100
      ).toFixed(1),
    )
    .join("/");
}

function arm(
  label: string,
  perDay: number,
  workDays: number,
  sameTimeDays: number,
  seed: string,
): Reading {
  const started = start("US-KY", "Albany", seed);
  let world = started.world;
  const personId = started.personId;
  let sessions = 0;
  // The work phase. Both arms do the same sessions and then stop working.
  for (let day = 0; day < sameTimeDays; day += 1) {
    if (day < workDays) {
      const worked = workToday(world, personId, perDay);
      world = worked.world;
      sessions += worked.done;
    }
    world = letAdultTimePass(world, 1);
  }

  // Read at the SAME game time, with the same total work behind each arm.
  const supportAtSameTime = supportPercent(world, personId);
  const opponentSupport = opponentSupports(world, personId);
  const actions = world.history.campaignActions ?? [];
  const campaign = (world.history.campaigns ?? []).find(
    (row) => row.candidatePersonId === personId,
  );
  const mine = actions.filter((row) => row.campaignId === campaign?.id);

  // Then let the contest resolve with no further work from either arm.
  for (let day = 0; day < 40; day += 1) {
    if (projectCampaign(world, personId).phase !== "active") break;
    world = letAdultTimePass(world, 1);
  }
  const view = projectCampaign(world, personId);
  const tally = view.tallies?.find((row) => row.isThisCandidate);

  return {
    label,
    sessions,
    workDays,
    supportAtSameTime,
    opponentSupport,
    playerActions: mine.length,
    opponentActions: actions.length - mine.length,
    spentMinorUnits: mine.reduce(
      (sum, row) => sum + (row.plannedSpend?.minorUnits ?? 0),
      0,
    ),
    finalSupport: supportPercent(world, personId),
    votePercent: tally ? tally.voteShare * 100 : Number.NaN,
    memoPercent: view.reading?.percent ?? null,
    won: view.phase === "won",
  };
}

const rows: Reading[] = [];
for (const seed of ["click-a", "click-b", "click-c", "click-d"]) {
  rows.push(arm(`spread 1/day x8 [${seed}]`, 1, 8, 8, seed));
  rows.push(arm(`packed 4/day x2 [${seed}]`, 4, 2, 8, seed));
}

const header = [
  "arm".padEnd(25),
  "sess".padStart(5),
  "support@day8".padStart(13),
  "rivals@day8".padStart(12),
  "spent".padStart(6),
  "final".padStart(6),
  "vote%".padStart(6),
  "memo%".padStart(6),
  "won".padStart(4),
].join(" ");
console.log(header);
for (const row of rows) {
  console.log(
    [
      row.label.padEnd(25),
      String(row.sessions).padStart(5),
      `${row.supportAtSameTime.toFixed(2)}%`.padStart(13),
      row.opponentSupport.padStart(12),
      String(row.spentMinorUnits).padStart(6),
      `${row.finalSupport.toFixed(1)}%`.padStart(6),
      `${row.votePercent.toFixed(1)}%`.padStart(6),
      (row.memoPercent === null
        ? "—"
        : `${row.memoPercent.toFixed(1)}%`
      ).padStart(6),
      (row.won ? "yes" : "no").padStart(4),
    ].join(" "),
  );
}
