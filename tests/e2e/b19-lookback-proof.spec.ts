import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { expect, test } from "./fixtures";

import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
} from "../../src/presentation/new-game";
import { drawRandomPlace } from "../support/random-place";
import {
  congressCandidacyForPerson,
  fileForCongressSeat,
} from "../../src/presentation/congress-candidacy";
import {
  beginHealthEpisode,
  ensureCrisisMortality,
} from "../../src/simulation/crisis";
import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
} from "../../src/simulation";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { letStoryTimePass } from "../../src/presentation/life-story";
import {
  projectLifeContinuation,
  retireFromPlay,
} from "../../src/presentation/people-continuation";
import { ownElectionResultsDecided } from "../../src/presentation/own-election";

const SEED = "b19-random-new-game-death-1";
const PLACES = drawRandomPlace(SEED);
const state = lifePlaceStateIdentities().find(
  (candidate) => candidate.jurisdictionKey === PLACES.stateJurisdictionKey,
)!;

test(`B19 look-back death and save in ${PLACES.displayName} (${state.name}), seed ${SEED}`, async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: SEED,
    placeKey: PLACES.key,
    startAge: 34,
    depth: "summarize-earlier-life",
  });
  const personId = game.playerPersonId;
  const candidacy = congressCandidacyForPerson(game.world, personId);
  expect(candidacy).not.toBeNull();
  const senateSeat = candidacy!.seats.find(
    (seat) => seat.identity.title === "U.S. Senator" && seat.eligible,
  );
  expect(senateSeat).toBeDefined();
  let world = fileForCongressSeat(
    game.world,
    personId,
    senateSeat!.identity.officeKey,
  );
  const campaignContest = world.history.electionContests?.find(
    (contest) =>
      contest.candidatePersonIds.includes(personId) &&
      contest.office.officeKey === senateSeat!.identity.officeKey,
  );
  expect(campaignContest).toBeDefined();
  world = advanceWorld(world, 302, createCampaignElectionTransitionRegistry());
  const recordedRaces = ownElectionResultsDecided(
    world,
    personId,
    null,
    world.currentDate,
  );
  expect(recordedRaces.length).toBeGreaterThan(0);

  const worldBeforeMortality = world;
  world = ensureCrisisMortality(world);
  world = beginHealthEpisode(world, {
    stableKey: `b19-proof-test-hazard:${personId}`,
    personId,
    severity: "chronic",
    initialLimitation: "none",
    origin: { kind: "authored", note: "B19 proof test fixture only." },
    causalParentIds: [],
    hazard: {
      micros: 2_000_000_000,
      basis: "B19 proof test fixture only; not clinical data.",
    },
  });
  for (
    let day = 0;
    day < 400 &&
    !world.history.personDeaths.some((row) => row.personId === personId);
    day += 1
  )
    world = letStoryTimePass(world, personId);

  const death = world.history.personDeaths.find(
    (row) => row.personId === personId,
  );
  expect(death).toBeDefined();
  const reopened = deserializeWorld(serializeWorld(world));
  expect(reopened.currentDate).toBe(death!.diedAt);
  const deathView = projectLifeContinuation(reopened, personId)!;
  expect(deathView.lookBack.through).toBe(death!.diedAt);

  const playerJobs = reopened.history.workRelationships.filter(
    (row) => row.personId === personId,
  );
  const playerMoves = reopened.history.events.filter(
    (event) =>
      event.involvedEntityIds.includes(personId) &&
      event.type === "life.household-move",
  );
  const playerRaces = ownElectionResultsDecided(
    reopened,
    personId,
    null,
    reopened.currentDate,
  );
  expect(playerJobs.length).toBeGreaterThan(0);
  expect(playerMoves.length).toBeGreaterThan(0);
  expect(playerRaces.length).toBeGreaterThan(0);

  const retirementWorld = deserializeWorld(
    serializeWorld(retireFromPlay(worldBeforeMortality, personId)),
  );
  const retirementView = projectLifeContinuation(retirementWorld, personId)!;
  expect(retirementView.ended).toBe("retirement");

  const manifest = {
    seed: SEED,
    state: state.name,
    place: PLACES.displayName,
    placeKey: PLACES.key,
    person: `${reopened.people[personId]!.givenName} ${reopened.people[personId]!.familyName}`,
    worldId: reopened.id,
    contestId: campaignContest!.id,
    jobRecordIds: playerJobs.map((row) => row.id),
    moveRecordIds: playerMoves.map((row) => row.id),
    races: playerRaces.map((row) => ({
      contestId: row.contestId,
      resultId: row.resultId,
      sourceEventId: row.anchor.recordId,
      at: row.resolvedAt,
      sentence: row.sentence,
    })),
    deathId: death!.id,
    deathAt: death!.diedAt,
    deathCause: death!.causeKey,
    deathSaveBytes: serializeWorld(reopened).length,
    memories: deathView.lookBack.remembered.map((row) => ({
      key: row.key,
      at: row.at,
      sourceRecordIds: row.sourceRecordIds,
    })),
  };
  test.info().annotations.push({
    type: "b19-lookback-proof",
    description: JSON.stringify(manifest),
  });

  const evidence = process.env.PG_CAPTURE_EVIDENCE === "1";
  const path = (name: string) =>
    evidence
      ? `docs/codex/evidence/b19-death-look-back/${name}`
      : testInfo.outputPath(name);
  if (evidence) mkdirSync(dirname(path("death-page.png")), { recursive: true });

  const payload = JSON.stringify({
    serializedWorld: serializeWorld(reopened),
    personId,
  });
  await page.addInitScript((encoded) => {
    (
      window as Window & { __B19_LOOKBACK_CASE__?: unknown }
    ).__B19_LOOKBACK_CASE__ = JSON.parse(encoded);
  }, payload);
  await page.goto("/tests/e2e/b19-lookback-proof.html");
  await expect(page.getByTestId("life-lookback-story")).toBeVisible();
  await page.screenshot({ path: path("death-page.png"), fullPage: true });
  await page.getByTestId("life-lookback-turn-page").click();
  await expect(page.getByTestId("life-lookback-record")).toBeVisible();
  await page.screenshot({ path: path("record-page.png"), fullPage: true });

  const retirementPayload = JSON.stringify({
    serializedWorld: serializeWorld(retirementWorld),
    personId,
  });
  await page.evaluate((encoded) => {
    const render = (
      window as Window & {
        __showB19LookBackCase__?: (proofCase: {
          serializedWorld: string;
          personId: string;
        }) => void;
      }
    ).__showB19LookBackCase__;
    if (!render) throw new Error("The B19 capture harness was not mounted.");
    render(JSON.parse(encoded));
  }, retirementPayload);
  await expect(page.getByTestId("life-lookback-story")).toBeVisible();
  await page.screenshot({ path: path("retirement-page.png"), fullPage: true });

  if (evidence)
    writeFileSync(
      path("run-record.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
});
