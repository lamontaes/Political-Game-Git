/**
 * Director playtest request 1, second half: is advancing one day at a time the
 * same as advancing the same span in one step?
 *
 * Both arms start from the identical saved situation, give no further
 * instructions, and end at the same game time. One presses the day control
 * thirty times; the other asks for thirty days once. Nothing about the world
 * should depend on which, and anything that does is either a real difference
 * worth explaining or work the one-step path is skipping.
 *
 * Reported: the date reached, money, recorded activity, due items still
 * pending, history size, and — where a campaign is running — hidden support
 * for every candidate, which is where a skipped weekly opponent evaluation
 * would show up.
 */
import { letAdultTimePass } from "../../src/presentation/adult-life";
import {
  fileForOffice,
  projectCampaign,
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

function life(town: string, seed: string, withCampaign: boolean) {
  const place = requireLocalityInState("US-KY", town);
  const created = createExplicitGeographyLife({
    placeKey: place.key,
    seed,
    startAge: 40,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  const world = withCampaign
    ? fileForOffice(
        created.game.world,
        created.game.playerPersonId,
        null,
        "us-ky-general-assembly-v1:house",
      )
    : created.game.world;
  return { world, personId: created.game.playerPersonId };
}

function supports(world: World, personId: string): string {
  const campaign = (world.history.campaigns ?? []).find(
    (row) => row.candidatePersonId === personId,
  );
  if (!campaign) return "—";
  return campaign.candidateSupportScopes
    .map((scope) => {
      try {
        return (
          quantityBasisPoints(latestSupportState(world, campaign, scope)) / 100
        ).toFixed(2);
      } catch {
        return "?";
      }
    })
    .join("/");
}

function snapshot(world: World, personId: string) {
  return {
    date: world.currentDate,
    minute: world.currentMoment.minuteOfDay,
    sequence: world.history.nextSequence,
    activities: world.history.scheduledActivities.length,
    dueItems: (world.history.futureDueItems ?? []).length,
    money: (world.history.moneyEvents ?? []).length,
    campaignActions: (world.history.campaignActions ?? []).length,
    support: supports(world, personId),
    phase: projectCampaign(world, personId).phase,
  };
}

const DAYS = 30;
for (const withCampaign of [false, true]) {
  console.log(
    `\n== ${withCampaign ? "mid-campaign" : "ordinary life"}, ${DAYS} days, no instructions`,
  );
  for (const seed of ["step-a", "step-b"]) {
    const oneAtATime = life("Albany", seed, withCampaign);
    let a = oneAtATime.world;
    for (let day = 0; day < DAYS; day += 1) a = letAdultTimePass(a, 1);

    const oneStep = life("Albany", seed, withCampaign);
    const b = letAdultTimePass(oneStep.world, DAYS);

    const left = snapshot(a, oneAtATime.personId);
    const right = snapshot(b, oneStep.personId);
    const differs = Object.keys(left).filter(
      (key) =>
        String(left[key as keyof typeof left]) !==
        String(right[key as keyof typeof right]),
    );
    console.log(`  [${seed}]`);
    console.log(`    day at a time : ${JSON.stringify(left)}`);
    console.log(`    one step      : ${JSON.stringify(right)}`);
    console.log(
      `    differs in    : ${differs.length === 0 ? "nothing" : differs.join(", ")}`,
    );
  }
}
