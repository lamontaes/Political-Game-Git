/**
 * After a debate, the other candidate comes over (owner, Oct 14: "Debate";
 * item words-debate-opponent-scene). The meetings engine holds each race's
 * debate and records it, naming every candidate on the stage. In a drawn
 * place, with the town's officeholders watched (they run again), a year is
 * played: each debate record stages the rally-opponent scene for a watched
 * candidate, with another candidate from that record as the opponent. The
 * talk plays the lines said leaving the stage (the debate fact cites the
 * record), brings up a question the two answered on opposite sides when
 * there is one, and a reply is written back.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { ballot, openContests } from "../core2/modules/elections";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";
import type { Fact } from "../english/scene-talk-words";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 6;
const YEAR = 365;
const WEEK = 7;
const SOON_DAYS = 60;
const LABEL = "cause:event:debate";
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "rally-opponent",
) as unknown as PurposeType;
const PROFILE = [
  "personality-v1:facet-friendly",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-hostile",
  "personality-v1:facet-persistent",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-sensitive",
];

it(`a debate brings the other candidate over, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "debate-opponent");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const watched = new Set<string>();
    for (const row of townSeats(coreAPI(core))) {
      const holder = row.holder?.personId;
      if (holder && core.people.has(holder as PersonId)) watched.add(holder);
    }
    for (const id of watched) director.watch(core, id as PersonId);
    // Candidates file through the year: each week, everyone on a ballot who
    // is a full person is watched too, as the player would be.
    const end = addDays(makeIsoDate(core.date), YEAR);
    const api = coreAPI(core);
    while (core.date < end) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), WEEK), end].sort()[0]!,
      );
      // Only races near their day, before the debate is held (meetings.ts
      // holds a race's debate some days before the election): watching every
      // filer in a large place costs more memory than a test may use.
      const soon = addDays(makeIsoDate(core.date), SOON_DAYS);
      for (const contest of openContests(api).filter(
        (c) => c.electionDate <= soon,
      ))
        for (const filing of ballot(api, contest.id))
          if (
            !watched.has(filing.personId) &&
            core.people.has(filing.personId as PersonId)
          ) {
            watched.add(filing.personId);
            director.watch(core, filing.personId as PersonId);
          }
    }
    const debates = [...core.durableLog.values()].filter(
      (row) => row.kind === "debate",
    );
    for (const [personId, book] of director.ledger.people)
      for (const entry of book.schedule) {
        const moment = book.momentsById.get(entry.momentId);
        if (moment?.label !== LABEL) continue;
        if (!entry.bindings.some((row) => row.typeKey === "rally-opponent"))
          continue;
        const record = core.durableLog.get(moment.causeId as never)!;
        const result = purposeScene(
          core,
          director,
          personId as PersonId,
          entry,
          {
            typeKey: "rally-opponent",
          },
        );
        expect(result?.kind, `${where}: ${moment.causeId}`).toBe("composed");
        if (result?.kind !== "composed") continue;
        const { scene } = result;
        // The opponent is another candidate on the debate's own record.
        expect(scene.askerId, where).not.toBe(personId);
        expect(record.personIds, where).toContain(scene.askerId);
        const debate = scene.facts.find((row) => row.key === "debate");
        expect(debate?.recordIds, where).toContain(moment.causeId);
        const root = scene.talk.tree.replies.map((row) => row.line);
        expect(new Set(root.map((row) => row.move)).size, where).toBe(
          root.length,
        );
        // Two speakers with opposite tempers say it differently.
        const facts = Object.fromEntries(
          scene.facts.map((row) => [
            row.key,
            { text: row.text, sourceRecordIds: row.recordIds } as Fact,
          ]),
        );
        const text = (level: number) => {
          const out = composeSceneTalk(
            core,
            director,
            { askerId: scene.askerId, askedId: scene.askedId },
            TYPE,
            facts,
            {
              askerTraits: Object.fromEntries(
                PROFILE.map((id, k) => [id, k % 2 ? -level : level]),
              ),
            },
          );
          return out.kind === "composed"
            ? out.talk.lines.map((row) => row.text).join("|")
            : out.reason;
        };
        expect(text(2), where).toBe(text(2));
        expect(text(2), where).not.toBe(text(-2));
        const reply = replyInScene(
          core,
          director,
          personId as PersonId,
          entry,
          [0],
        );
        expect(reply, `${where}: the reply is written back`).toBeTruthy();
        const issue = scene.facts.find((row) => row.key === "issue");
        console.log(
          `DEBATE OPPONENT ${where}: ${debates.length} debates; cause ${moment.causeId}, ${scene.askerId} to ${personId}${issue ? `, on ${issue.text}` : ""}, reply ${reply}\n${[...scene.talk.narration, ...(scene.talk.open ? [scene.talk.open] : []), scene.talk.state].map((row) => `  ${row.text}`).join("\n")}\n  replies: ${root.map((row) => row.text).join(" | ")}\n  hostile: ${text(2)}\n  gentle: ${text(-2)}`,
        );
        return;
      }
    tried.push(
      `${where}: ${debates.length} debates, none staged for a watched candidate`,
    );
  }
  throw new Error(
    `no drawn place staged a debate scene: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
