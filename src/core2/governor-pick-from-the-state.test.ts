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
 * HAND-STAGED: the death of the post's holder, which opens the post (a post
 * stands open when its holder has died; statePostsToFill). Everything after
 * is the game's own calls.
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
  stateCandidateNames,
  stateCandidates,
  statePostsToFill,
} from "./modules/executive";
import { lawChain } from "./modules/laws";
import { seatPlayerInStateOffice } from "./office-day-state";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { coreAPI } from "./state";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

it(`${where}: a governor filling an open post is offered people from across the state, by name`, () => {
  const previous = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const player = core.playerId!;
    seatPlayerInStateOffice(api, { personId: player, role: "governor" });
    const { stateKey, townPlaceId } = lawChain(api);
    const held = appointmentsIn(api, stateKey)[0];
    expect(held, `${where}: the opening's cabinet`).toBeTruthy();
    // The post's holder dies, and the post stands open.
    const holder = core.people.get(held!.holderId)!;
    api.updatePerson(holder.id, { alive: false });
    api.emit({
      id: `test-death:${holder.id}`,
      date: core.date,
      kind: "life.death",
      personIds: [holder.id],
      placeId: holder.placeId,
      source: { tag: "SOURCED", citation: "HAND-STAGED", asOf: core.date },
    });
    expect(
      statePostsToFill(api, player).map((p) => p.key),
      where,
    ).toContain(held!.post);

    // Reading the list creates nobody.
    const people = core.people.size;
    const offered = stateCandidates(api, player, held!.post);
    const names = stateCandidateNames(api, held!.post);
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
      stateCandidates(api, player, held!.post).map((r) => r.candidateId),
      where,
    ).toEqual(offered.map((r) => r.candidateId));

    // Appointing them fills them in where they live, on the state payroll.
    const row = appointStatePost(api, {
      executiveId: player,
      post: held!.post,
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
      `state:${held!.post}`,
    );
    expect(core.people.size, `${where}: only the one appointed`).toBe(
      people + 1,
    );
  } finally {
    setBookkeeping(previous);
  }
}, 120_000);
