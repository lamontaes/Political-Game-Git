/**
 * The speech screen from play: the player picks one of four parts at each of
 * four stages, then gives the finished speech through the campaign engine,
 * and the listeners' views cite the speech (owner, Oct 15, evening). A random
 * place from all 56; the place and seed are in every failure message.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { stancesOf } from "../core2/modules/views";
import { SPEECH_STAGES } from "../director/speech-builder";
import {
  campaignView,
  speechBegin,
  speechGive,
  speechPick,
  speechView,
} from "./campaign";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`speech-screen:${Date.now()}`).digest("hex");

it("builds a speech from four picks, gives it through the campaign, and the listeners' views cite it", () => {
  const place = drawPlace(runSeed, "speech-screen");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  // The richest adults try the town's open contests until one accepts a filing.
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: { id: string; personId: string } | null = null;
  for (const candidate of adults.slice(0, 8)) {
    for (const contest of openContests(api)) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (filed.status !== "refused" && filed.filing.status === "on-ballot") {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  expect(filing, `nobody could file: ${where}`).not.toBeNull();
  const personId = filing!.personId;

  // Four stages, up to four parts on offer at each, the player picking by key.
  let build = speechBegin(core, personId);
  for (const stage of SPEECH_STAGES) {
    const view = speechView(build);
    expect(view.choices.length, `${stage}: ${where}`).toBeGreaterThan(0);
    expect(view.choices.length, where).toBeLessThanOrEqual(4);
    expect(() => speechPick(core, build, "no-such-part"), where).toThrow();
    // A stand at the core where one is offered, so the speech moves views.
    const pick =
      build.choices.find((row) => row.stand && stage === "core") ??
      build.choices[0]!;
    build = speechPick(core, build, pick.key);
  }
  expect(build.done, where).toBe(true);
  expect(() => speechPick(core, build, "anything"), where).toThrow();
  const stands = build.picked.filter((row) => row.stand);
  expect(stands.length, `a stand was offered: ${where}`).toBeGreaterThan(0);

  // Someone else cannot give it.
  expect(
    () =>
      speechGive(core, "someone-else", build, {
        filingId: filing!.id,
        venue: scenePlaces.speechPlaces[0]!,
      }),
    where,
  ).toThrow();

  const given = speechGive(core, personId, build, {
    filingId: filing!.id,
    venue: scenePlaces.speechPlaces[0]!,
  });
  expect(given.text, where).toBe(build.picked.map((row) => row.text).join(" "));
  expect(given.reached, `people reached: ${where}`).toBeGreaterThan(0);
  expect(given.scene.place, where).toBe(scenePlaces.speechPlaces[0]);

  // The speech engine moved the listeners' views, citing the speech record.
  const speechIds = new Set(
    stands.map(
      (_, index) =>
        `speech:${personId}:${core.date}:speech:${scenePlaces.speechPlaces[0]}` +
        (index ? `:${index}` : ""),
    ),
  );
  const heard = given.causes
    .map((cause) => cause.voterId)
    .filter((id) =>
      stancesOf(api, id).some((stance) =>
        stance.causes.some((cause) => speechIds.has(cause.eventId)),
      ),
    );
  expect(heard.length, `views citing the speech: ${where}`).toBeGreaterThan(0);

  // The campaign screen reads the promise the speech recorded.
  const view = campaignView(core, personId).campaigns.find(
    (c) => c.filing.id === filing!.id,
  )!;
  expect(view.campaign.platform.length, where).toBeGreaterThan(0);
}, 600_000);
