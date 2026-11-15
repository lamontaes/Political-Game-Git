/**
 * A player governor filling an open cabinet post is offered the state's people,
 * not only the full people the world holds (executive-governor-pick-offers-the-state).
 * Before, the list was built from the people the world holds in full, most of
 * whom live in the played town, so a governor from a small town was offered
 * that town's neighbors. Now three of the state's people are drawn for the
 * post as the opening draws a cabinet, named on the list without being filled
 * in, and only the one appointed is filled in where they live and put on the
 * state payroll.
 *
 * HAND-STAGED: the post's holder falls seriously ill (beginSeriousIllness),
 * once. The health engine then books and plays their death, which opens the
 * post (a post stands open when its holder has died; statePostsToFill), and
 * everything after is the game's own calls. Before, the death was written by
 * hand on the opening day (pool item tests-state-post-opened-by-written-death).
 * The days run on the player's own clock (advancePlayerV1), so an open post
 * waits for the player; a governor keeps only that stop on (setStops).
 *
 * Asking one of them to serve (the serve-asks engine's post seat) fills that
 * person in first, so they answer as themselves; the person asked is the one
 * the list named, and appointing them then seats that same person.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1, a small town that
 * is not the state's seat.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  appointStatePost,
  appointmentsIn,
  fillInStateCandidate,
  stateCandidateNames,
  stateCandidates,
  statePostsToFill,
} from "./modules/executive";
import { lawChain } from "./modules/laws";
import { seatPlayerInStateOffice } from "./office-day-state";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { coreAPI } from "./state";
import { playToDeathAsPlayer } from "../../tests/support/play-to-death";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

function openPost() {
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const player = core.playerId!;
  seatPlayerInStateOffice(api, { personId: player, role: "governor" });
  const state = lawChain(api).stateKey;
  const held = appointmentsIn(api, state)[0]!;
  playToDeathAsPlayer(core, held.holderId, player, ["appointment"]);
  return { core, api, player, held };
}

it(`${where}: a governor filling an open post is offered people from across the state, by name`, () => {
  const previous = setBookkeeping(false);
  try {
    // HAND-STAGED: the post's holder falls ill; their death opens the post.
    const { core, api, player, held } = openPost();
    const { stateKey, townPlaceId } = lawChain(api);
    expect(
      statePostsToFill(api, player).map((p) => p.key),
      where,
    ).toContain(held.post);

    // Reading the list creates nobody.
    const people = core.people.size;
    const offered = stateCandidates(api, player, held.post);
    const names = stateCandidateNames(api, held.post);
    expect(core.people.size, `${where}: people created by reading`).toBe(
      people,
    );
    const drawn = offered.filter((r) => names.has(r.candidateId));
    expect(drawn.length, `${where}: drawn people on the list`).toBeGreaterThan(
      0,
    );
    for (const row of drawn)
      expect(names.get(row.candidateId), where).toMatch(/^\S+ \S+/);
    // At least one lives in another town of the state.
    const elsewhere = drawn.find((r) =>
      r.candidateId.startsWith("person:cabinet:"),
    );
    expect(elsewhere, `${where}: someone from elsewhere`).toBeTruthy();
    // Reading again offers the same people.
    expect(
      stateCandidates(api, player, held.post).map((r) => r.candidateId),
      where,
    ).toEqual(offered.map((r) => r.candidateId));

    // Appointing them fills them in where they live, on the state payroll.
    const row = appointStatePost(api, {
      executiveId: player,
      post: held.post,
      personId: elsewhere!.candidateId,
    });
    expect(row?.holderId, where).toBe(elsewhere!.candidateId);
    const person = core.people.get(row!.holderId)!;
    expect(`${person.givenName} ${person.familyName}`, where).toBe(
      names.get(elsewhere!.candidateId),
    );
    expect(person.placeId, `${where}: lives where they lived`).not.toBe(
      townPlaceId,
    );
    const home = corePlaceByJurisdictionId(person.placeId as never);
    expect(home?.stateJurisdictionKey ?? home?.key, where).toBe(stateKey);
    const job = core.jobs.get(person.jobId!);
    expect(job?.id, `${where}: on the state payroll`).toContain(
      `state:${held.post}`,
    );
    expect(core.people.size, `${where}: only the one appointed`).toBe(
      people + 1,
    );
  } finally {
    setBookkeeping(previous);
  }
  // The limit covers the game's own played days to the booked death (about
  // 85 seconds measured; twice that).
}, 180_000);

it(`${where}: a drawn person asked to serve is filled in as the one the list named, and seated as that person`, () => {
  const previous = setBookkeeping(false);
  try {
    const { core, api, player, held } = openPost();
    const names = stateCandidateNames(api, held.post);
    const [askedId, askedName] = [...names].find(([id]) =>
      id.startsWith("person:cabinet:"),
    )!;
    const people = core.people.size;
    // Asking fills them in, once; asking again changes nothing.
    expect(fillInStateCandidate(api, held.post, askedId), where).toBe(askedId);
    expect(fillInStateCandidate(api, held.post, askedId), where).toBe(askedId);
    expect(core.people.size, `${where}: the one asked`).toBe(people + 1);
    const person = core.people.get(askedId as never)!;
    expect(`${person.givenName} ${person.familyName}`, where).toBe(askedName);
    expect(person.jobId, `${where}: no post yet`).toBeFalsy();
    // Someone the post does not offer is not filled in.
    expect(
      fillInStateCandidate(api, held.post, "person:cabinet:nobody"),
      where,
    ).toBeNull();
    // Still offered, now as one of the world's own.
    expect(stateCandidateNames(api, held.post).has(askedId), where).toBe(false);
    expect(
      stateCandidates(api, player, held.post).map((r) => r.candidateId),
      where,
    ).toContain(askedId);
    // Appointing them seats that same person on the state payroll.
    const row = appointStatePost(api, {
      executiveId: player,
      post: held.post,
      personId: askedId,
    });
    expect(row?.holderId, where).toBe(askedId);
    expect(core.jobs.get(person.jobId!)?.id ?? "", where).toContain(
      `state:${held.post}`,
    );
    expect(core.people.size, `${where}: nobody else filled in`).toBe(
      people + 1,
    );
  } finally {
    setBookkeeping(previous);
  }
  // The limit covers the game's own played days to the booked death (about
  // 85 seconds measured; twice that).
}, 180_000);
