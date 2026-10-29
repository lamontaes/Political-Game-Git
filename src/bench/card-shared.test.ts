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
import { closenessBetween } from "../core2/closeness";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { gameStartDate } from "../core2/game-start";
import { preStartHistory } from "../core2/pre-start";
import { sharedHistory } from "../core2/shared-history";
import type { PersonId } from "../core2/types";
import { familyFactsOf } from "../core2/modules/people";
import { subjectsBetween } from "../director/conversation";
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
      card.shared.map((row) => row.recordId),
      `${where}: ${id}`,
    ).toEqual(
      sharedHistory(core, me, id)
        .filter((row) => row.kind !== "family")
        .map((row) => row.recordId),
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

it("a workgroup coworker's card and the director's tie moment cite the same records", () => {
  const place = drawPlace(seed, "card-shared-coworker");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  // The player, then their household, then the town, in that order: whoever
  // works beside someone they know who is not family (a relative's tie is a
  // family tie, never a coworker's). A player who just turned 18 may have no
  // job.
  const knownCoworker = (id: PersonId) =>
    [...(core.people.get(id)?.knownIds ?? [])]
      .sort()
      .find(
        (other) =>
          !core.people.get(id)?.familyIds.has(other as PersonId) &&
          sharedHistory(core, id, other as PersonId).some(
            (row) => row.kind === "coworker",
          ),
      ) as PersonId | undefined;
  const player = world.playerId! as PersonId;
  const candidates = [
    player,
    ...(core.households.get(core.people.get(player)!.householdId)?.memberIds ??
      []),
    ...[...core.people.keys()].sort(),
  ].filter((id) => knownCoworker(id as PersonId)) as PersonId[];
  expect(
    candidates.length,
    `${where}: nobody knows a coworker`,
  ).toBeGreaterThan(0);

  // The scene: a contact between them moves the tie the director watches;
  // the moment it writes cites the same relationship record and names the
  // employer's history, so the scene is never a stranger's. The contact is
  // put in by hand, large enough to turn the tie (a fixture for the trigger;
  // every record read is the world's own). Whether a turn is a moment is
  // the person's own: the tie channel is weighed by their traits, so one who
  // weighs ties lightly lets it pass under the floor (Roscoe, Missouri, seed
  // 11505131091574c74cdf), and the next in order is watched.
  let me: PersonId | undefined;
  let mateId: PersonId | undefined;
  let moment: { id: string; causeKind?: string } | undefined;
  const passed: string[] = [];
  for (const id of candidates.slice(0, 12)) {
    const mate = knownCoworker(id)!;
    const tie = id < mate ? `${id}:${mate}` : `${mate}:${id}`;
    director.watch(core, id);
    coreAPI(core).relationship(id, mate, "contact", 200, undefined, {
      cause: "fixture-contact",
      sourceId: "fixture-contact",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    moment = [...director.ledger.people.get(id)!.momentsById.values()].find(
      (row) => row.causeId === tie,
    );
    if (moment) {
      me = id;
      mateId = mate;
      break;
    }
    passed.push(`${id} (under the floor)`);
  }
  expect(
    me,
    `${where}: no turn was a moment: ${passed.join(", ")}`,
  ).toBeDefined();
  expect(moment?.causeKind, where).toBe("contact:coworker");
  const employerId = sharedHistory(core, me!, mateId!).find(
    (row) => row.kind === "coworker",
  )!.recordId;
  const tieId = me! < mateId! ? `${me}:${mateId}` : `${mateId}:${me}`;

  // The card: the tie by its relationship record, the work by the employer.
  const card = knownCard(core, me!, mateId!);
  expect(card.tie?.recordId, where).toBe(tieId);
  expect(
    card.shared.find((row) => row.kind === "coworker" || row.kind === "worked")
      ?.recordId,
    where,
  ).toBe(employerId);
  expect(card.tie?.level, where).toBe(closenessBetween(core, me!, mateId!));
  console.log(
    `${where}: tie ${tieId}, employer ${employerId}, moment ${moment?.id}`,
  );
}, 600_000);

it("a relative's card and the player's talk about them cite the same family fact", () => {
  const place = drawPlace(seed, "card-shared-relative");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, playerId, director } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  const player = core.people.get(me)!;
  const relatives = familyFactsOf(player);
  // Someone the player's relative has never met, to introduce them to.
  const stranger = [...core.people.values()].find(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      row.id !== me &&
      !player.familyIds.has(row.id) &&
      row.householdId !== player.householdId,
  )!;
  let checked = 0;
  for (const id of [...player.familyIds].sort()) {
    const fact = relatives.get(id);
    if (!fact || !core.people.get(id)?.alive) continue;
    const card = knownCard(core, me, id);
    expect(card.relationRecordId, `${where}: ${id}`).toBe(fact.factId);
    const kin = subjectsBetween(core, me, stranger.id, director).find(
      (row) => row.id === `kin:${id}`,
    );
    if (stranger.knownIds.has(id) || !kin) continue;
    expect(kin.facts.relation?.sourceRecordIds, `${where}: ${id}`).toEqual([
      fact.factId,
    ]);
    checked += 1;
  }
  expect(
    checked,
    `${where}: no relative the stranger has not met`,
  ).toBeGreaterThan(0);
  console.log(`${where}: ${checked} relatives cited by the same family fact`);
}, 600_000);
