import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { SITUATION_LIBRARY } from "./scheduling";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { purposeScene, replyInScene } from "./purpose-scene";

// Someone joins the player's household (circumstance row `new-housemate`,
// situation type `arrival`, purpose `housemate-arrives`). In a drawn place
// another member of the player's household is off the household's list for
// the days the director takes its baseline, then back on it: the director
// reads that as someone who joined that day, and the next day's records stage
// the scene from that person's own record (the world's own year carries no
// such joiner on a day the director watches, so the join is the one fixture).
// Checked: the cause is the joiner's record, the scene composes with the
// newcomer as asker and the player as asked, the four replies are four
// stances, the same traits say the same words and opposite traits say
// different ones, a relative and a stranger are worded apart, and a reply
// writes a record the relationship engine reads.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 6;
const WAIT_DAYS = 30;
const BASELINE_DAYS = 3;

/** The player clock runs the days as the bench runs them; a stop is resumed, a choice takes its first offer. */
function play(
  core: CoreState,
  personId: PersonId,
  clock: { date: string },
  days: number,
): void {
  // The core's date trails the clock by the day still open, so the clock's
  // own date is kept here.
  clock.date = addDays(makeIsoDate(clock.date), days);
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: { date: makeIsoDate(clock.date), minuteOfDay: P.zero },
  });
  while (packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[P.zero]!.offerId,
          });
}

const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "arrival" && (row as { purpose?: string }).purpose,
) as unknown as PurposeType;

/** Four trait profiles: the first pair is opposite; each says its own words. */
const profile = (level: number) =>
  Object.fromEntries(
    [
      "personality-v1:facet-friendly",
      "personality-v1:facet-affectionate",
      "personality-v1:facet-hostile",
      "personality-v1:facet-persistent",
      "personality-v1:facet-argumentative",
      "personality-v1:facet-forgiving",
      "personality-v1:facet-sensitive",
    ].map((id, k) => [id, k % 2 ? -level : level]),
  );

it(`someone joining the household is a scene with a purpose, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "housemate");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const clock = { date: core.date as string };
    const player = core.people.get(playerId as PersonId)!;
    core.focusPersonIds.add(playerId as PersonId);
    director.watch(core, playerId as PersonId);
    // Another member of the household steps out of its list for the days the
    // director takes its baseline, then is back on the list: the director
    // reads that as someone who joined the household that day.
    const home = core.households.get(player.householdId)!;
    const joinerId = [...home.memberIds]
      .filter((id) => id !== player.id && core.people.get(id)?.alive)
      .sort()[0];
    if (!joinerId) {
      tried.push(`${where}: nobody else in the household`);
      continue;
    }
    const joiner = core.people.get(joinerId)!;
    (home.memberIds as PersonId[]).splice(home.memberIds.indexOf(joinerId), 1);
    play(core, playerId as PersonId, clock, BASELINE_DAYS);
    (home.memberIds as PersonId[]).push(joinerId);

    const book = director.ledger.people.get(playerId as PersonId)!;
    const find = () =>
      book.schedule.find(
        (row) =>
          row.momentId &&
          book.momentsById.get(row.momentId)?.label ===
            "circumstance:new-housemate" &&
          book.momentsById.get(row.momentId)?.causeId === joiner.id,
      );
    for (let day = 1; day <= WAIT_DAYS && !find(); day += 1)
      play(core, playerId as PersonId, clock, 1);
    const entry = find();
    if (!entry) {
      tried.push(
        `${where}: no scene within ${WAIT_DAYS} days (${joinerId} ${core.date} moments ${[...book.momentsById.values()].map((m) => m.label + ":" + m.causeId).join(",")})`,
      );
      continue;
    }
    const moment = book.momentsById.get(entry.momentId)!;
    expect(moment.counterpartIds[0], where).toBe(joiner.id);
    expect(core.people.get(moment.causeId as PersonId), where).toBeTruthy();

    const result = purposeScene(core, director, playerId as PersonId, entry, {
      typeKey: "arrival",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    expect(scene.purpose, where).toBe("housemate-arrives");
    expect(scene.askerId, where).toBe(joiner.id);
    expect(scene.askedId, where).toBe(playerId);
    expect(scene.cause.id, where).toBe(joiner.id);
    const said = (key: string) => scene.facts.find((row) => row.key === key);
    expect(said("name")?.recordIds, where).toContain(joiner.id);
    expect(said("kin") !== undefined, where).toBe(
      player.familyIds.has(joiner.id),
    );

    // Plain words: no id, kind, ISO date, slot braces or long number.
    const lines: { text: string }[] = [...scene.talk.lines];
    const walk = (node: typeof scene.talk.tree) => {
      lines.push(...node.lines);
      for (const reply of node.replies) {
        lines.push(reply.line);
        if (reply.next) walk(reply.next);
      }
    };
    walk(scene.talk.tree);
    for (const line of lines)
      expect(line.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
      );
    // Nothing is claimed that no record holds: no weekday, weather or reason.
    for (const line of scene.talk.lines)
      expect(line.text, where).not.toMatch(
        /monday|tuesday|wednesday|thursday|friday|saturday|sunday|rain|snow|because/i,
      );

    // Four replies, four stances, four different texts.
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expect(new Set(root.map((row) => row.move)), where).toEqual(
      new Set(["offer", "bargain", "ask", "decline"]),
    );
    expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);

    // The same traits say the same words; opposite traits say different ones.
    const facts = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    const sayWith = (level: number, withFacts: Record<string, Fact>) => {
      const out = composeSceneTalk(
        core,
        director,
        { askerId: scene.askerId, askedId: scene.askedId },
        TYPE,
        withFacts,
        { askerTraits: profile(level) },
      );
      return out.kind === "composed"
        ? out.talk.lines.map((row) => row.text).join(" | ")
        : out.reason;
    };
    const warm = sayWith(2, facts);
    const cold = sayWith(-2, facts);
    expect(warm, where).toBe(sayWith(2, facts));
    expect(warm, where).not.toBe(cold);
    // A relative and a stranger are worded apart (the tie facts decide).
    const asStranger = { ...facts };
    delete asStranger.kin;
    delete asStranger.acquainted;
    asStranger.stranger = {
      text: joiner.givenName,
      sourceRecordIds: [joiner.id],
    };
    const asKin = { ...asStranger, kin: facts.kin ?? asStranger.stranger };
    delete (asKin as Record<string, Fact>).stranger;
    expect(sayWith(2, asStranger), where).not.toBe(sayWith(2, asKin));

    // A reply writes a record and the time together reaches the tie.
    const before = core.durableLog.size;
    const replyId = replyInScene(
      core,
      director,
      playerId as PersonId,
      entry,
      [0],
      { typeKey: "arrival" },
    );
    expect(replyId, where).toBeTruthy();
    const record = core.durableLog.get(replyId!);
    expect(record?.kind, where).toBe("scene.reply");
    expect(record?.facts?.causeId, where).toBe(joiner.id);
    expect(core.durableLog.size, where).toBeGreaterThan(before);
    const tie = [
      ...(core.relationshipsByPerson.get(playerId as PersonId) ?? []),
    ]
      .map((id) => core.relationships.get(id)!)
      .find((rel) => rel.actorId === joiner.id || rel.otherId === joiner.id);
    expect(tie, `${where}: a tie with the newcomer`).toBeTruthy();
    expect(tie!.lastContactDate >= moment.date, where).toBe(true);

    process.stdout.write(
      `HOUSEMATE ${where}: cause ${joiner.id} (${said("kin") ? "kin" : said("acquainted") ? "acquainted" : "stranger"}), moment ${entry.momentId}, reply ${replyId}\n` +
        `  warm: ${warm}\n  cold: ${cold}\n` +
        scene.talk.lines
          .map((row) => `  ${row.speaker}: ${row.text}`)
          .join("\n") +
        "\n",
    );
    return;
  }
  throw new Error(
    `no drawn place staged the scene: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
