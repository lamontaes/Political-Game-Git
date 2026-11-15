// @vitest-environment node
/**
 * Asking someone to take a post (brief J, Nov 14, 2026): a player who is a
 * mayor or a governor asks one of the people offered for an open post, and
 * the person answers from their own record in a scene, as a running mate
 * does. A yes names them through the engine that names a post today (the
 * "name a department head" act for a town post, the governor's appointment
 * for a state post, each confirmed as before); a no is kept with its reason
 * and date and the post stays open.
 *
 * Pinned places and seeds. HAND-STAGED: the head who holds the post falls
 * seriously ill (beginSeriousIllness), once; the health engine books and
 * plays their death, which opens the post. Before, the death was written by
 * hand on the opening day (pool item tests-state-post-opened-by-written-death).
 * The days run on the player's own clock (advancePlayerV1), so an open post
 * waits for the player; a governor keeps only that stop on (setStops).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  appointmentsIn,
  headCandidates,
  postsToFill,
  stateCandidates,
  statePostsToFill,
} from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import { memberKey } from "../core2/modules/legislature";
import { officeHost, preparedFor } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import {
  askToServe,
  postAsks,
  postStanding,
  serveAsk,
} from "../core2/modules/serve-asks";
import { officeActHandlers, OFFICE_ACTS } from "../core2/office-day-acts";
import { coreAPI } from "../core2/state";
import type { ActOffer, CoreState, PersonId } from "../core2/types";
import type { Director } from "./ledger";
import { playToDeathAsPlayer } from "../../tests/support/play-to-death";
import { playServeAsk } from "../../tests/support/serve-ask-play";

/**
 * Each place pins its post, the person who says yes and the one who says no,
 * as the place's record gives them (the read's lean and reason, at the seed):
 * at Victoria, Kansas the city administrator's post, River Snyder yes (pay,
 * 0.57) and Richard Hart no (the job they would leave, -0.13). Re-pinned
 * Nov 15 from Kimberly Colon, who was the state's transportation secretary,
 * drawn at the opening from the town's own people: since #9385 (pool item
 * executive-cabinet-drawn-from-the-state) a cabinet secretary lives where the
 * state's people put them, and Victoria is not the state's seat, so the
 * secretary now lives elsewhere in Kansas and she is not in this world; at Fern
 * Prairie, Washington the agriculture post, Michelle Hunter yes (pay, 0.25)
 * and Marcus Hunter no (the county clerk's job he would leave, -0.13).
 * Re-pinned Nov 15 from Cheryl Monroe yes: she is one of the President's
 * cabinet nominees passed over, who held no town and no work, so she said
 * yes to any post; since executive-federal-nominees-passed-over-have-no-work
 * she is a registered nurse and turns this post down (-0.23).
 * Re-pinned Nov 15 from John Pugh, who was offered while he sat in the U.S.
 * Senate for Rhode Island (official:seat:US-RI:us-senate:1): a governor's
 * list now holds only the state's own people who hold no other office
 * (executive-governor-pick-offers-the-state), so he is no longer offered.
 */
const PLACES = [
  {
    level: "town",
    office: "mayor",
    key: "2073775",
    seed: "f18f773a439a0edb270a308b0b66e18d21f26a61a9fa359e6cb1ce11f0e398de",
    yes: "River Snyder",
    no: "Richard Hart",
    reason: "own-job",
  },
  {
    level: "state",
    office: "governor",
    key: "5323690",
    seed: "d156d6ecb2e252df9e0b3f2f992aff211c70c4b87e0caa779cd5729063d48ae0",
    yes: "Michelle Hunter",
    no: "Marcus Hunter",
    reason: "own-job",
  },
] as const;

interface World {
  core: CoreState;
  director: Director;
  playerId: PersonId;
  post: string;
  where: string;
}

/** A bench world whose player holds the office, with one of its posts opened by its head's death. */
function world(place: (typeof PLACES)[number]): World {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.key}, seed ${place.seed}`;
  const holder = townSeats(api).find(
    (s) => s.office.kind === place.office,
  )?.holder;
  expect(holder?.personId, where).toBeTruthy();
  const playerId = memberKey(holder!) as PersonId;
  const head =
    place.level === "town"
      ? appointmentsIn(api, lawChain(api).townPlaceId).find(
          (row) => row.appointedBy === playerId,
        )
      : appointmentsIn(api, lawChain(api).stateKey).find(
          (row) => row.confirmation,
        );
  expect(head, where).toBeDefined();
  // The player holds the office before the head falls ill, and their days
  // run on their own clock, so an open post waits for their choice.
  core.playerId = playerId;
  core.focusPersonIds.add(playerId);
  director.watch(core, playerId);
  const { diedOn } = playToDeathAsPlayer(
    core,
    head!.holderId,
    playerId,
    place.level === "state" ? ["appointment"] : [],
  );
  process.stdout.write(`${where}: ${head!.holderId} died ${diedOn}\n`);
  const open =
    place.level === "town"
      ? postsToFill(api, playerId)
      : statePostsToFill(api, playerId);
  expect(
    open.map((p) => p.key),
    where,
  ).toContain(head!.post);
  return { core, director, playerId, post: head!.post, where };
}

/** The person the place pins, among the people offered for the post. */
function offered(w: World, level: "town" | "state", name: string): string {
  const api = coreAPI(w.core);
  const ids = (
    level === "town"
      ? headCandidates(api, w.post)
      : stateCandidates(api, w.playerId, w.post)
  ).map((r) => r.candidateId);
  const id = ids.find((candidate) => {
    const p = w.core.people.get(candidate as PersonId);
    return p && `${p.givenName} ${p.familyName}` === name;
  });
  expect(id, `${w.where}: ${name} offered`).toBeDefined();
  return id!;
}

/** The player asks; the scene plays at once and the player takes the closing reply. */
function ask(w: World, personId: string) {
  const row = askToServe(coreAPI(w.core), {
    seat: "post",
    appointerId: w.playerId,
    post: w.post,
    personId,
  });
  const played = playServeAsk(w.core, w.director, w.playerId, row.eventId);
  expect(played.scene.purpose, w.where).toBe("ask-to-serve");
  if (played.first.move !== "ask")
    expect(played.first.move, `${w.where}: lean ${row.standing.lean}`).toBe(
      row.standing.lean > 0 ? "agree" : "decline",
    );
  return { row, reply: played.reply, lines: played.lines };
}

for (const place of PLACES)
  it(
    `asking someone to take a ${place.level} post plays as a scene; a no keeps the post open, a yes names them (${place.key}, seed ${place.seed.slice(0, 16)})`,
    // The game's own played days to the booked death: about 25 seconds for
    // the town, 40 for the state, measured; twice the longer.
    { timeout: 90_000 },
    () => {
      const w = world(place);
      const api = coreAPI(w.core);
      // 1. A no: kept with its reason and date; the post stays open and the
      // person is not offered again for now.
      const noId = offered(w, place.level, place.no);
      expect(
        postStanding(api, w.playerId, noId, {
          key: w.post,
          level: place.level,
        })!.reason,
        w.where,
      ).toBe(place.reason);
      const no = ask(w, noId);
      expect(no.row.standing.lean, w.where).toBeLessThanOrEqual(0);
      expect(no.reply.facts?.ending, no.lines.join("\n")).toBe("turned-down");
      const kept = serveAsk(api, no.row.id)!;
      expect(kept.answer, w.where).toBe("no");
      expect(kept.answeredOn, w.where).toBe(w.core.date);
      const listed = postAsks(api, w.playerId, w.post).find(
        (a) => a.personId === noId,
      );
      expect(listed?.declined?.reason, w.where).toBe(place.reason);
      expect(listed?.mayAsk, w.where).toBe(false);
      expect(() =>
        askToServe(api, {
          seat: "post",
          appointerId: w.playerId,
          post: w.post,
          personId: noId,
        }),
      ).toThrow(/too soon/);
      // 2. A yes names them through the post's own engine.
      const yesId = offered(w, place.level, place.yes);
      const yes = ask(w, yesId);
      expect(yes.row.standing.lean, w.where).toBeGreaterThan(0);
      expect(yes.reply.facts?.ending, yes.lines.join("\n")).toBe("serving");
      if (place.level === "town") {
        // The yes is the player's pick for the "name a department head" act.
        expect(
          preparedFor(api, w.playerId, "name-department-head")?.nominee,
          w.where,
        ).toEqual({ post: w.post, personId: yesId });
        officeActHandlers(officeHost)["name-department-head"]!(
          api,
          w.playerId,
          {
            definition: OFFICE_ACTS.find(
              (a) => a.id === "name-department-head",
            )!,
            targetId: w.post,
            availableHours: 1,
          } as unknown as ActOffer,
        );
      }
      const seated = appointmentsIn(
        api,
        place.level === "town"
          ? lawChain(api).townPlaceId
          : lawChain(api).stateKey,
      ).find((row) => row.post === w.post);
      expect(seated?.holderId, w.where).toBe(yesId);
      expect(seated?.appointedBy, w.where).toBe(w.playerId);
      // The asks kept for the post go once it is filled.
      expect(serveAsk(api, yes.row.id), w.where).toBeUndefined();
      process.stdout.write(
        [
          `POST ASK ${w.where}: ${w.post}, ${seated!.id}`,
          `-- a no (${no.row.standing.reason}):`,
          ...no.lines,
          `-- a yes (${yes.row.standing.yesReason}):`,
          ...yes.lines,
          "",
        ].join("\n"),
      );
    },
  );
