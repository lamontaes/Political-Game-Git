/**
 * The person card shows the past it already received (engine map line 13,
 * S3): in a drawn place, the card of someone the player shares a household or
 * an employer with lists that shared history by the same record ids the
 * director's scenes read (`sharedHistory`), the tie by its relationship
 * record, and an officeholder's card lists the seats the government's history
 * before day one records for them.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { preStartHistory } from "../core2/pre-start";
import { sharedHistory } from "../core2/shared-history";
import type { PersonId } from "../core2/types";
import { knownCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("the card lists the shared history and seats by the scenes' record ids", () => {
  const place = drawPlace(seed, "card-shared");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const me = playerId! as PersonId;
  const others = [...core.people.keys()].filter((id) => id !== me);

  const sharing = others.filter((id) =>
    sharedHistory(core, me, id).some((row) => row.kind !== "family"),
  );
  expect(sharing.length, where).toBeGreaterThan(0);
  for (const id of sharing) {
    const card = knownCard(core, me, id);
    expect(
      card.shared.map((row) => `${row.kind}:${row.recordId}`),
      `${where}: ${id}`,
    ).toEqual(
      sharedHistory(core, me, id)
        .filter((row) => row.kind !== "family")
        .map((row) => `${row.kind}:${row.recordId}`),
    );
    if (card.tie)
      expect(card.tie.recordId, where).toBe(
        me < id ? `${me}:${id}` : `${id}:${me}`,
      );
  }

  const seated = others.filter(
    (id) =>
      preStartHistory(core, { kind: "office.seat-reached", personId: id })
        .length,
  );
  expect(seated.length, where).toBeGreaterThan(0);
  for (const id of seated.slice(0, 5)) {
    const card = knownCard(core, me, id);
    expect(
      card.seats.map((row) => row.recordId),
      where,
    ).toEqual(
      preStartHistory(core, { kind: "office.seat-reached", personId: id }).map(
        (row) => row.id,
      ),
    );
    expect(
      card.seats.every((row) => row.office && row.year > 0),
      where,
    ).toBe(true);
  }
  console.log(
    `${where}: ${sharing.length} share a record with the player; ${seated.length} hold a seat from before the start`,
  );
}, 600_000);
