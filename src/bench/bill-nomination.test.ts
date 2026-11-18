import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  EXECUTIVE_MODULE_ID,
  appointmentsIn,
  statePostsToFill,
} from "../core2/modules/executive";
import type { CoreAPI } from "../core2/types";
import { lawChain } from "../core2/modules/laws";
import { memberKey } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { askHead, officeView, ordersDecide, ordersView } from "./office";
import { postStanding } from "../core2/modules/serve-asks";
import type { PersonId } from "../core2/types";
import { playServeAsk } from "../../tests/support/serve-ask-play";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// A governor the player plays asks someone for an open cabinet post from the candidates the
// office panel shows, and a yes in the sit-down seats them (brief J); the state chamber's
// confirmation is on the appointment. A post opens when its
// holder dies (the one hand-set fact here; the rest is the engine's). A place drawn from all 56 on a
// seed nobody chose.
const seed =
  process.env.NOMINATION_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

/**
 * After a yes, the governor's nomination goes to the chamber: confirmed, the
 * person holds the post; turned down, the nomination is on the record
 * unconfirmed and the post stays open. Returns the confirmation either way.
 */
function seatedOrTurnedDown(
  api: CoreAPI,
  executiveId: string,
  post: string,
  nomineeId: string,
  where: string,
) {
  const state = lawChain(api).stateKey;
  const seated = appointmentsIn(api, state).find((row) => row.post === post);
  if (seated?.holderId === nomineeId) {
    expect(seated.appointedBy, where).toBe(executiveId);
    expect(seated.confirmation?.confirmed, where).toBe(true);
    expect(
      statePostsToFill(api, executiveId).map((p) => p.key),
      where,
    ).not.toContain(post);
    return seated.confirmation;
  }
  const nomination = api
    .moduleState(EXECUTIVE_MODULE_ID)
    .table("nominations")
    .get(`nomination:${state}:${post}:${nomineeId}:${api.state.date}`) as
    { confirmation: { confirmed: boolean } | null } | undefined;
  expect(nomination?.confirmation?.confirmed, where).toBe(false);
  expect(
    statePostsToFill(api, executiveId).map((p) => p.key),
    where,
  ).toContain(post);
  return nomination!.confirmation;
}

describe(`the governor names a cabinet post (seed ${seed})`, () => {
  it("shows the open post with its candidates and seats the one the player names", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "nomination");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find(
        (s) => s.office.kind === "governor",
      )?.holder;
      const state = lawChain(api).stateKey;
      const held = appointmentsIn(api, state).find((row) => row.confirmation);
      if (!governor?.personId || !core.people.has(governor.personId) || !held) {
        tried.push(`${where}: no governor to play or no confirmed post`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(governor.personId);
      const first = core.date;
      for (let guard = 0; guard < 50 && core.date <= first; guard++) {
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      const id = memberKey(governor);
      // The holder of one confirmed post dies; the post stands open.
      api.updatePerson(held.holderId, { alive: false });
      expect(
        statePostsToFill(api, id).map((p) => p.key),
        where,
      ).toContain(held.post);
      const head = officeView(core, governor.personId).heads.find(
        (h) => h.post === held.post,
      );
      expect(head?.candidates.length, where).toBeGreaterThan(0);
      // The player asks those whose own record says yes, best first, until
      // the chamber confirms one; one it turns down is on the record
      // unconfirmed, and the post stays open for the next.
      const willing = head!.candidates.filter(
        (c) =>
          (postStanding(api, id, c.id, { key: held.post, level: "state" })
            ?.lean ?? 0) > 0,
      );
      let seated: ReturnType<typeof seatedOrTurnedDown> = null;
      let nominee: (typeof willing)[number] | undefined;
      for (const c of willing) {
        const asked = askHead(core, governor.personId, held.post, c.id);
        const played = playServeAsk(
          core,
          world.director,
          governor.personId as PersonId,
          asked.eventId,
        );
        expect(played.reply.facts?.ending, played.lines.join("\n")).toBe(
          "serving",
        );
        seated = seatedOrTurnedDown(api, id, held.post, c.id, where);
        if (seated?.confirmed) {
          nominee = c;
          break;
        }
      }
      if (!nominee) {
        tried.push(
          `${where}: nobody offered for ${held.post} would say yes and be confirmed`,
        );
        continue;
      }
      console.log(
        `nomination: ${where}, ${held.post} to ${nominee.name}, ${JSON.stringify(seated)}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a governor with a confirmed post (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);

  it("stops the governor when a cabinet post opens and seats the one they name", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:stop:${attempt}`, "nomination-stop");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find(
        (s) => s.office.kind === "governor",
      )?.holder;
      const state = lawChain(api).stateKey;
      const held = appointmentsIn(api, state).find((row) => row.confirmation);
      if (!governor?.personId || !core.people.has(governor.personId) || !held) {
        tried.push(`${where}: no governor to play or no confirmed post`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(governor.personId);
      const first = core.date;
      for (let guard = 0; guard < 50 && core.date <= first; guard++) {
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      api.updatePerson(held.holderId, { alive: false });
      for (let day = 0; day < 20; day++) {
        const offer = ordersView(core).find(
          (row) => row.kind === "post" && row.order === held.post,
        );
        if (offer && offer.kind === "post") {
          expect(offer.candidates.length, where).toBeGreaterThan(0);
          // Naming someone at the desk asks them; the first whose own record says yes.
          const nominee = offer.candidates.find(
            (c) =>
              (postStanding(api, memberKey(governor), c.id, {
                key: held.post,
                level: "state",
              })?.lean ?? 0) > 0,
          );
          if (!nominee) {
            tried.push(
              `${where}: nobody offered for ${held.post} would say yes`,
            );
            break;
          }
          const asked = ordersDecide(core, offer.entryId, "issue", nominee.id);
          expect(asked, where).toBeTruthy();
          const played = playServeAsk(
            core,
            world.director,
            governor.personId as PersonId,
            asked!.eventId,
          );
          expect(played.reply.facts?.ending, played.lines.join("\n")).toBe(
            "serving",
          );
          const seated = seatedOrTurnedDown(
            api,
            memberKey(governor),
            held.post,
            nominee.id,
            where,
          );
          // The chamber turned the nominee down: on the record, the post open;
          // draw again for a desk whose nominee is seated.
          if (!seated?.confirmed) {
            tried.push(`${where}: the chamber turned ${nominee.name} down`);
            break;
          }
          console.log(
            `nomination stop: ${where}, ${held.post} to ${nominee.name}, ${JSON.stringify(seated)}`,
          );
          return;
        }
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      tried.push(`${where}: the open post never stopped the governor`);
    }
    throw new Error(
      `no drawn place stopped a governor for a post (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
