/**
 * An appointing official fills a vacant town post as an act of office (pool
 * item office-appointments): a department head who died leaves the post open
 * to the official who appoints it, and "name a department head" fills it with
 * the candidate their reasons rank first, confirmed by the council, on the
 * town's payroll, with the act kept on their record. Place and seed are drawn
 * and printed; the head's death is the one fixture, for the edge.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import {
  appointmentsIn,
  headCandidates,
  postsToFill,
} from "./modules/executive";
import { nameHeadPick, officeView } from "../bench/office";
import { officeActsOf, officeHost } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { lawChain } from "./modules/laws";
import { memberKey } from "./modules/legislature";
import { officeActHandlers, OFFICE_ACTS } from "./office-day-acts";
import { coreAPI } from "./state";
import type { ActOffer, PersonState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`an appointer names a department head (seed ${seed})`, () => {
  it("opens a post when its head dies, and the act fills it with a confirmed, paid, recorded choice", () => {
    const unpaid: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "name-head");
      const where = `${place.name}; seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const officials = townSeats(api)
        .filter(
          ({ office, holder }) =>
            ["council", "mayor"].includes(office.kind) && holder?.personId,
        )
        .map(({ holder }) => memberKey(holder!));
      // A head whose appointer is a sitting official of the town.
      const found = appointmentsIn(api, town)
        .map((row) => ({
          row,
          actor: officials.find((id) => row.appointedBy === id),
        }))
        .find((entry) => entry.actor);
      if (!found) continue;
      const { row: head, actor } = found;
      const actorId = actor!;
      expect(
        postsToFill(api, actorId).map((p) => p.key),
        where,
      ).not.toContain(head.post);
      // The head dies: the post is open to the official who appoints it.
      const dead = core.people.get(head.holderId) as {
        alive: boolean;
        jobId?: string;
      };
      dead.alive = false;
      // A death ends the job, so the post's pay line is free for the next head.
      if (dead.jobId) api.endJob(dead.jobId, `died:${core.date}`);
      expect(
        postsToFill(api, actorId).map((p) => p.key),
        where,
      ).toContain(head.post);
      const offer = {
        definition: OFFICE_ACTS.find((a) => a.id === "name-department-head")!,
        targetId: head.post,
        availableHours: 1,
      } as unknown as ActOffer;
      const handler = officeActHandlers(officeHost)["name-department-head"]!;
      handler(api, actorId, offer);
      const named = appointmentsIn(api, town).find(
        (r) => r.post === head.post,
      )!;
      expect(named.holderId, where).not.toBe(head.holderId);
      const holder = core.people.get(named.holderId) as PersonState;
      expect(holder.alive, where).toBe(true);
      // The reasons rank the person named first; the council confirmed them.
      expect(named.reasons[0]!.candidateId, where).toBe(named.holderId);
      if (named.confirmation)
        expect(named.confirmation.yes, where).toBeGreaterThan(
          named.confirmation.no,
        );
      // A town whose budget line cannot pay the post at all names its head
      // unpaid (stopgap SG-GOV-appointee-pay): draw again for a town that can.
      if (!holder.jobId) {
        unpaid.push(where);
        continue;
      }
      // They are on the town's payroll for the post.
      expect(holder.jobId, `${where} ${named.id}`).toMatch(
        new RegExp(`^job:public:town:${head.post}:`),
      );
      // The act is on the official's record, with the appointment's id.
      const kept = officeActsOf(api, actorId).filter(
        (r) => r.kind === "name-department-head",
      );
      expect(
        kept.map((r) => r.recordId),
        where,
      ).toEqual([named.id]);
      // The post is filled again, so nothing is left to name.
      expect(
        postsToFill(api, actorId).map((p) => p.key),
        where,
      ).not.toContain(head.post);
      console.log(
        `name-head: ${where}; post ${head.post}; appointment ${named.id}`,
      );
      return;
    }
    throw new Error(
      `No town with an appointed head and a pay line to name them in 8 draws; ${seed}; named unpaid in: ${unpaid.join(" | ") || "none"}`,
    );
  }, 1_200_000);

  it("lists the people an open post could go to, and a pick other than the first is the one named", () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "name-head-pick");
      const where = `${place.name}; seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const officials = townSeats(api)
        .filter(
          ({ office, holder }) =>
            ["council", "mayor"].includes(office.kind) && holder?.personId,
        )
        .map(({ holder }) => memberKey(holder!));
      const found = appointmentsIn(api, town)
        .map((row) => ({
          row,
          actor: officials.find((id) => row.appointedBy === id),
        }))
        .find((entry) => entry.actor);
      if (!found) continue;
      const { row: head, actor: actorId } = found;
      // The head dies: the post is open, and the panel lists who it could go to.
      (core.people.get(head.holderId) as { alive: boolean }).alive = false;
      const listed = officeView(core, actorId!).heads.find(
        (row) => row.post === head.post,
      );
      expect(listed, where).toBeDefined();
      const ranked = headCandidates(api, head.post);
      expect(
        listed!.candidates.map((c) => c.id),
        where,
      ).toEqual(
        ranked.slice(0, listed!.candidates.length).map((r) => r.candidateId),
      );
      if (ranked.length < 2) continue;
      const handler = officeActHandlers(officeHost)["name-department-head"]!;
      const offer = {
        definition: OFFICE_ACTS.find((a) => a.id === "name-department-head")!,
        targetId: head.post,
        availableHours: 1,
      } as unknown as ActOffer;
      // Name each of the others in turn until the council confirms one.
      let named: ReturnType<typeof appointmentsIn>[number] | undefined;
      let picked = "";
      for (const reasons of ranked.slice(1, 6)) {
        nameHeadPick(core, actorId!, head.post, reasons.candidateId);
        handler(api, actorId!, offer);
        const row = appointmentsIn(api, town).find((r) => r.post === head.post);
        if (row && row.holderId !== head.holderId) {
          named = row;
          picked = reasons.candidateId;
          break;
        }
      }
      if (!named) continue;
      expect(named.holderId, where).toBe(picked);
      expect(named.holderId, where).not.toBe(ranked[0]!.candidateId);
      const kept = officeActsOf(api, actorId!).filter(
        (r) => r.kind === "name-department-head" && r.recordId === named!.id,
      );
      expect(kept.at(-1)?.how, where).toBe("did");
      console.log(
        `name-head-pick: ${where}; post ${head.post}; picked ${picked} over ${ranked[0]!.candidateId}; ${named.id}`,
      );
      return;
    }
    throw new Error(
      `No town with an appointed head to pick for in 8 draws; ${seed}`,
    );
  }, 1_200_000);
});
