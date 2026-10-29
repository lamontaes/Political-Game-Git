/**
 * The speech screen from play: the player picks one of four parts at each of
 * four stages, then gives the finished speech through the campaign engine,
 * and the listeners' views cite the speech (owner, Oct 15, evening). A random
 * place from all 56; the place and seed are in every failure message. A first
 * speech can draw nobody (no one in town leans to come to a new candidate's
 * talk), so the town's best-connected adults try in turn, and places are
 * drawn in turn, until a speech draws a crowd.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
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

const ATTEMPTS = 4;
/** How many of the town's best-connected adults try a speech in each place. */
const CANDIDATES = 8;

/** One drawn place: why nobody came to the speech, or null once its listeners' views cite it. */
const run = (drawSeed: string): string | null => {
  const place = drawPlace(drawSeed, "speech-screen");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${drawSeed}, place seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  // The town's adults with the most people they know, as a player has a
  // household and a circle, try its open contests until one accepts a filing.
  // A speech's crowd is the people of the town who know the candidate: the
  // richest adult can be a state official or a paper's owner with no one there
  // to come.
  const town = lawChain(api).townPlaceId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort(
      (a, b) =>
        b.familyIds.size +
          b.knownIds.size -
          a.familyIds.size -
          a.knownIds.size ||
        b.liquidMinor - a.liquidMinor ||
        a.id.localeCompare(b.id),
    );
  // Each of them in turn files where a contest accepts it and gives the
  // speech, until one draws a crowd.
  const empty: string[] = [];
  let filing: { id: string; personId: string } | null = null;
  let build: ReturnType<typeof speechBegin> | null = null;
  let given: ReturnType<typeof speechGive> | null = null;
  for (const candidate of adults.slice(0, CANDIDATES)) {
    let filed: { id: string; personId: string } | null = null;
    for (const contest of openContests(api)) {
      const result = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        result.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      ) {
        filed = result.filing;
        break;
      }
    }
    if (!filed) continue;
    const speakerId = filed.personId;

    // Four stages, up to four parts on offer at each, the player picking by key.
    let speech = speechBegin(core, speakerId);
    for (const stage of SPEECH_STAGES) {
      const view = speechView(speech);
      expect(view.choices.length, `${stage}: ${where}`).toBeGreaterThan(0);
      expect(view.choices.length, where).toBeLessThanOrEqual(4);
      expect(() => speechPick(core, speech, "no-such-part"), where).toThrow();
      // A stand at the core where one is offered, so the speech moves views.
      const pick =
        speech.choices.find((row) => row.stand && stage === "core") ??
        speech.choices[0]!;
      speech = speechPick(core, speech, pick.key);
    }
    expect(speech.done, where).toBe(true);
    expect(() => speechPick(core, speech, "anything"), where).toThrow();
    expect(
      speech.picked.filter((row) => row.stand).length,
      `a stand was offered: ${where}`,
    ).toBeGreaterThan(0);

    // Someone else cannot give it.
    expect(
      () =>
        speechGive(core, "someone-else", speech, {
          filingId: filed!.id,
          venue: scenePlaces.speechPlaces[0]!,
        }),
      where,
    ).toThrow();

    const said = speechGive(core, speakerId, speech, {
      filingId: filed.id,
      venue: scenePlaces.speechPlaces[0]!,
    });
    expect(said.text, where).toBe(
      speech.picked.map((row) => row.text).join(" "),
    );
    expect(said.scene.place, where).toBe(scenePlaces.speechPlaces[0]);
    if (said.reached) {
      filing = filed;
      build = speech;
      given = said;
      break;
    }
    const speaker = core.people.get(speakerId)!;
    const knows = [...speaker.familyIds, ...speaker.knownIds].filter(
      (id) => core.people.get(id)?.placeId === town,
    ).length;
    empty.push(`${speakerId} knows ${knows} people in town`);
  }
  if (!filing)
    return empty.length
      ? `${where}: nobody came to ${empty.length} candidates' speeches, and none leaned to come (${empty.join("; ")})`
      : `${where}: nobody could file`;
  const { personId, id: filingId } = filing;
  const stands = build!.picked.filter((row) => row.stand);

  // The speech engine moved the listeners' views, citing the speech record.
  const speechIds = new Set(
    stands.map(
      (_, index) =>
        `speech:${personId}:${core.date}:speech:${scenePlaces.speechPlaces[0]}` +
        (index ? `:${index}` : ""),
    ),
  );
  const heard = given!.causes
    .map((cause) => cause.voterId)
    .filter((id) =>
      stancesOf(api, id).some((stance) =>
        stance.causes.some((cause) => speechIds.has(cause.eventId)),
      ),
    );
  expect(heard.length, `views citing the speech: ${where}`).toBeGreaterThan(0);

  // The campaign screen reads the promise the speech recorded.
  const view = campaignView(core, personId).campaigns.find(
    (c) => c.filing.id === filingId,
  )!;
  expect(view.campaign.platform.length, where).toBeGreaterThan(0);
  console.log(
    `SPEECH ${where}: ${personId} drew ${given!.causes.length}; ${heard.length} views cite ${[...speechIds].join(", ")}`,
  );
  return null;
};

it("builds a speech from four picks, gives it through the campaign, and the listeners' views cite it", () => {
  const empty: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const why = run(attempt ? `${runSeed}:${attempt}` : runSeed);
    if (!why) return;
    empty.push(why);
  }
  throw new Error(
    `no speech drew anyone in ${ATTEMPTS} places: ${empty.join("; ")}`,
  );
}, 2_400_000);
