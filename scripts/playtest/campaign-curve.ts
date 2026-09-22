/**
 * What the campaign model actually does, measured rather than argued about.
 *
 * Run it against any head and read the table. It exists so a change to the
 * model can be judged by what it does to contrasting situations, rather than
 * by whether one seed in one state looks better afterwards.
 *
 * Four numbers are kept apart on purpose, because they are four different
 * things and conflating them is how the first report of this went wrong:
 * canonical support, the final vote share, what the field memo told the
 * player, and how often the candidate actually won.
 *
 *   node --import tsx scripts/playtest/campaign-curve.ts
 */

import { createExplicitGeographyLife } from "../../src/presentation/new-game-geography";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import { letAdultTimePass } from "../../src/presentation/adult-life";
import {
  latestSupportState,
  quantityBasisPoints,
} from "../../src/simulation/campaign-support";

interface Situation {
  readonly label: string;
  readonly placeKey: string;
  readonly officeKey: string;
  readonly startAge: number;
}

/** Deliberately contrasting places: the smallest and largest I can file in. */
const SITUATIONS: readonly Situation[] = [
  {
    label: "Albany KY (small town)",
    placeKey: "2100694",
    officeKey: "us-ky-general-assembly-v1:house",
    startAge: 40,
  },
  {
    label: "Alamo NV (very small)",
    placeKey: "3200500",
    officeKey: "us-nv-legislature-v1:assembly",
    startAge: 40,
  },
  {
    label: "Aberdeen MD (small city)",
    placeKey: "2400125",
    officeKey: "us-md-general-assembly-v1:house",
    startAge: 40,
  },
  {
    label: "Abingdon IL (village)",
    placeKey: "1700113",
    officeKey: "us-il-general-assembly-v1:house",
    startAge: 40,
  },
];

/** Afternoons a day. Zero is a player who files and then does nothing. */
const EFFORTS = [0, 1, 2, 4, 6] as const;
const SEEDS = ["a", "b", "c", "d", "e"] as const;

interface Run {
  readonly actions: number;
  readonly supportPercent: number;
  readonly votePercent: number;
  readonly memoPercent: number | null;
  readonly won: boolean;
}

function playOne(situation: Situation, seed: string, effort: number): Run {
  const created = createExplicitGeographyLife({
    placeKey: situation.placeKey,
    seed: `curve-${situation.placeKey}-${seed}`,
    startAge: situation.startAge,
    startKind: "normal",
    depth: "begin-adult-life",
  });
  const personId = created.game.playerPersonId;
  let world = fileForOffice(
    created.game.world,
    personId,
    null,
    situation.officeKey,
  );

  let actions = 0;
  for (let day = 0; day < 45; day += 1) {
    if (projectCampaign(world, personId).phase !== "active") break;
    for (let slot = 0; slot < effort; slot += 1) {
      const offers = projectCampaign(world, personId).offers.filter(
        (offer) => offer.available !== false,
      );
      if (offers.length === 0) break;
      try {
        const next = spendAnAfternoon(
          world,
          personId,
          offers[(actions + slot) % offers.length]!.kind,
        );
        if (next === world) break;
        world = next;
        actions += 1;
      } catch {
        break;
      }
    }
    world = letAdultTimePass(world, 1);
  }

  const view = projectCampaign(world, personId);
  const campaign = (world.history.campaigns ?? []).find(
    (entry) => entry.candidatePersonId === personId,
  )!;
  const scope = campaign.candidateSupportScopes.find(
    (entry) => entry.candidatePersonId === personId,
  )!;
  const mine = view.tallies.find((tally) => tally.isThisCandidate);
  return {
    actions,
    supportPercent:
      quantityBasisPoints(latestSupportState(world, campaign, scope)) / 100,
    votePercent: mine ? mine.voteShare * 100 : Number.NaN,
    memoPercent: view.reading?.percent ?? null,
    won: view.phase === "won",
  };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function main(): void {
  console.log(
    [
      "situation",
      "afternoons/day",
      "actions",
      "support%",
      "vote%",
      "memo%",
      "won",
    ].join("\t"),
  );
  for (const situation of SITUATIONS) {
    for (const effort of EFFORTS) {
      const runs = SEEDS.map((seed) => playOne(situation, seed, effort));
      const memos = runs
        .map((run) => run.memoPercent)
        .filter((value): value is number => value !== null);
      console.log(
        [
          situation.label,
          effort,
          mean(runs.map((run) => run.actions)).toFixed(0),
          mean(runs.map((run) => run.supportPercent)).toFixed(1),
          mean(runs.map((run) => run.votePercent)).toFixed(1),
          memos.length ? mean(memos).toFixed(1) : "—",
          `${runs.filter((run) => run.won).length}/${runs.length}`,
        ].join("\t"),
      );
    }
  }
}

main();
