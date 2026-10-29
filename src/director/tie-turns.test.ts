import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { sharedHistory } from "../core2/shared-history";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

// A tie that grows, sours or comes back is a scene
// (director-tie-turn-scenes-never-fire). The director used to score one
// day's change in a tie, and one day's contact never clears the moment
// floor, so becoming-friends and argument could never fire. It now scores
// the change since the tie last turned. In a place drawn from all 56: a
// year with the player watched lists every turn the director recorded and
// what each staged; then the player and an acquaintance spend hours
// together through the relationship engine until the tie turns, and the
// friendship is a scene, cited to their relationship record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "tie-turns");
const HOURS_A_DAY = 6;
const MAX_DAYS = 30;
const DAYS_A_YEAR = 365;

it(`a tie that grows over time together is a becoming-friends scene, in ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  director.watch(core, playerId);
  const api = coreAPI(core);
  const lines: string[] = [];

  // An acquaintance the player knows only a little, by their tie record. A
  // player who just turned 18 may open knowing only family
  // (SG-WIRE-PEOPLE-SCHOOLMATES): they meet a townsperson who shares no
  // household, family or employer with them, as the encounters engine meets
  // a group's members.
  const contacts = () =>
    [...(core.relationshipsByPerson.get(playerId) ?? [])]
      .map((id) => core.relationships.get(id)!)
      .filter((row) => row.kind === "contact");
  if (!contacts().length) {
    const player = core.people.get(playerId)!;
    const stranger = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== playerId &&
          row.householdId !== player.householdId &&
          !player.familyIds.has(row.id) &&
          !sharedHistory(core, playerId, row.id as PersonId).length,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    api.meet(playerId, stranger.id, {
      placeId: player.placeId,
      sourceId: "fixture-meeting",
      cause: "met-in-group",
      hours: 1,
    });
  }
  const tie = contacts()
    .map((row) => ({
      row,
      otherId: (row.actorId === playerId
        ? row.otherId
        : row.actorId) as PersonId,
    }))
    .filter(({ otherId }) => core.people.get(otherId)?.alive)
    .sort((a, b) => a.row.id.localeCompare(b.row.id))[0];
  expect(tie, "an acquaintance on record").toBeTruthy();
  const { row, otherId } = tie!;
  const book = director.ledger.people.get(playerId)!;
  const turned = () =>
    book.threads.get(otherId)?.turns.filter((turn) => turn.turn !== "started")
      .length ?? 0;
  let days = 0;
  for (; days < MAX_DAYS && !turned(); days += 1) {
    api.relationship(playerId, otherId, "contact", HOURS_A_DAY);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  const thread = book.threads.get(otherId)!;
  const grew = thread.turns.find((turn) => turn.turn === "grew");
  expect(
    grew,
    `no grew turn after ${days} days of ${HOURS_A_DAY} hours together`,
  ).toBeTruthy();
  const moment = book.momentsById.get(grew!.momentId!)!;
  // Cited to the two people's relationship record.
  expect(moment.causeId).toBe(row.id);
  expect(moment.label).toBe("tie:contact:contact");
  const entry = book.schedule.find((item) => item.momentId === moment.id)!;
  const scene = entry.bindings.find(
    (binding) => binding.typeKey === "becoming-friends",
  );
  expect(scene, `${moment.id} staged ${entry.outcome}`).toBeTruthy();
  // Met with them, the day they spent together: it plays.
  expect(entry.outcome).toBe("scene-now");
  expect(
    scene!.roles.find((role) => role.role === "other-friend")?.personIds,
  ).toEqual([otherId]);
  lines.push(
    `grew after ${days} days (${days * HOURS_A_DAY} hours), closeness ${core.relationships.get(row.id)!.level.toFixed(2)}: ${moment.id}, becoming-friends, ${entry.outcome}`,
  );

  // A quarrel after it: the tie sours, and the scene is an argument.
  for (let day = 0; day < MAX_DAYS; day += 1) {
    api.relationship(playerId, otherId, "contact", -HOURS_A_DAY);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (thread.turns.some((turn) => turn.turn === "soured")) break;
  }
  const soured = thread.turns.find((turn) => turn.turn === "soured");
  expect(soured, "a quarrel that sours the tie").toBeTruthy();
  const quarrel = book.schedule.find(
    (item) => item.momentId === soured!.momentId,
  )!;
  lines.push(
    `soured: ${soured!.momentId}, ${quarrel.bindings.map((binding) => binding.typeKey).join(",") || `nothing staged (${quarrel.coverage?.reason ?? "no binding"})`}`,
  );

  // The rest of the year as the world plays it, then every turn the director
  // recorded for the player and what each staged.
  advanceCore(core, addDays(makeIsoDate("2025-01-20"), DAYS_A_YEAR));
  const below = [...book.belowFloor].filter(([label]) =>
    label.startsWith("tie:"),
  );
  lines.push(
    `tie changes below the moment floor over the year: ${below.map(([label, count]) => `${label} ${count}`).join(", ") || "none"}`,
  );
  for (const [id, other] of book.threads)
    for (const turn of other.turns) {
      const staged = turn.momentId
        ? book.schedule.find((item) => item.momentId === turn.momentId)
        : undefined;
      lines.push(
        `  ${turn.date} ${turn.turn} with ${id}: ${
          staged
            ? `${staged.outcome} ${staged.bindings.map((binding) => binding.typeKey).join(",") || staged.coverage?.reason || ""}`
            : turn.turn === "started"
              ? "a tie starting is not a turn a scene answers"
              : "no moment"
        }`,
      );
    }
  process.stdout.write(
    `TIE TURNS ${place.name} ${seed}\n${lines.join("\n")}\n`,
  );
}, 900_000);

it("a tie in the family never stages becoming-friends", async () => {
  const types = (await import("./data/situation-types.json")).default.types as {
    key: string;
    causes: { match?: { labelPrefix?: string } }[];
  }[];
  const friends = types.find((type) => type.key === "becoming-friends")!;
  for (const cause of friends.causes)
    expect(cause.match?.labelPrefix).toBe("tie:contact:contact");
});
