/**
 * As mayor the player names someone from their own circle to a town post, and
 * the appointment's recorded reason cites the tie by its relationship record
 * id (pool item gov-m3-05-mayor-appoints-someone-they-know, M3-05). The
 * player sits as mayor in a place drawn from all 56 (a place with no mayor
 * who has a resident in their circle is passed over by name); the person is
 * one the mayor already has a relationship record with.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { pairKey } from "./kernel/ids";
import { appoint, appointmentsIn, townPosts } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";
import { buildBenchWorld } from "../bench/world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 25;

it(`as mayor the player names a person they know, and the reason cites the tie by record id (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "executive-appoints-known");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const mayor = townSeats(api).find(
      (row) => row.office.kind === "mayor" && row.holder?.personId,
    )?.holder?.personId;
    if (!mayor) {
      tried.push(`${where}: no mayor`);
      continue;
    }
    // A post the mayor appoints (it may already be filled: naming again replaces its head).
    const spec = townPosts(api).find((post) => /mayor/.test(post.appointedBy));
    if (!spec) {
      tried.push(`${where}: the mayor appoints no post`);
      continue;
    }
    fillInPerson(core, mayor);
    core.playerId = mayor as PersonId;
    // The player's circle: a resident of the town the mayor has a relationship record with.
    const seated = new Set(
      townSeats(api).flatMap((row) =>
        row.holder?.personId ? [row.holder.personId as string] : [],
      ),
    );
    const circle = [...core.people.values()]
      .filter(
        (p) =>
          p.placeId === town &&
          p.alive &&
          p.id !== mayor &&
          !seated.has(p.id) &&
          core.relationships.has(pairKey(mayor, p.id)),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!circle.length) {
      tried.push(`${where}: the mayor knows no one outside the council`);
      continue;
    }
    const known = circle[0]!;
    const tie = core.relationships.get(pairKey(mayor, known.id))!;
    const named = appoint(api, { post: spec.key, personId: known.id });
    if (!named) {
      tried.push(`${where}: ${known.id} was not appointable to ${spec.key}`);
      continue;
    }
    expect(named.holderId, `${where}: holder`).toBe(known.id);
    expect(named.appointedBy, `${where}: appointer`).toBe(mayor);
    const reason = named.reasons.find((r) => r.candidateId === known.id);
    expect(reason, `${where}: no reason for ${known.id}`).toBeTruthy();
    expect(reason!.acquaintance, `${where}: acquaintance`).toBeGreaterThan(0);
    expect(
      reason!.acquaintanceRecordId,
      `${where}: the reason cites the tie by id`,
    ).toBe(tie.id);
    // The record is kept: the table row reads the same reason back.
    const kept = appointmentsIn(api, town).find((row) => row.post === spec.key);
    expect(kept?.holderId, where).toBe(known.id);
    expect(kept?.reasons[0]?.acquaintanceRecordId, where).toBe(tie.id);
    if (named.confirmation)
      expect(named.confirmation.yes, `${where}: confirmation`).toBeGreaterThan(
        named.confirmation.no,
      );
    console.log(
      `${where}: ${spec.title} to ${known.id}, tie ${tie.id}, confirmation ${named.confirmation ? `${named.confirmation.yes}-${named.confirmation.no}` : "none"}`,
    );
    return;
  }
  throw new Error(
    `seed ${seed}: no drawn place seated the player as a mayor with someone in their circle in ${DRAWS} draws:\n${tried.join("\n")}`,
  );
}, 900_000);
