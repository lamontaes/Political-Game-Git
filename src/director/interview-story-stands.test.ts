/**
 * The story an outlet prints of an interview says where the candidate
 * stands on every question they were asked, from the answers on the record,
 * and names each question the way the reporter asked it. Cannonville, Utah:
 * before, the story was one line ("We asked Pat Candidate about welfare and
 * Medicaid."), gave no stand, named only the first question and named it
 * differently from the question asked (Account lead, Nov 14).
 *
 * The route is the ordinary one: the player is the resident the bench's
 * creator picks for a birthday, files for the town council the bench's way,
 * plays day by day to the first invitation, says yes in its scene and, at the
 * sitting, answers the first question with a side, declines the second
 * ("Nothing to add on that.") and takes a side on the third.
 */
import { describe, expect, it } from "vitest";
import { wordPrintedStory } from "../bench/archive-words";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { interviewsFor } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { questionAbout } from "../english/question-names";
import { openConversation, say } from "./conversation";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";

/** Pinned: Cannonville, Utah (pin-b:0 of the debate draw). */
const place = {
  name: "Cannonville, Utah",
  key: "4910330",
  seed: "3a5884384393f00611b28a5ce609187c999d9b0f21d97ef4a4e9e0a15f724a08",
};

describe("an interview's printed story", () => {
  it(`says the stand on every question, named as asked (pinned: ${place.name})`, () => {
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      playerBirthDate: "1978-06-01",
      playerGender: "female",
    });
    const { core, director } = world;
    const me = world.playerId as PersonId;
    core.playerId = me;
    for (const id of [
      me,
      ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ??
        []),
    ])
      if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
    const api = coreAPI(core);
    const today = () => makeIsoDate(core.date);
    const council = "contest:seat:gus2025:135819:council:0:2025-11-04";
    let filed = false;
    for (let week = 0; week < 40 && !filed; week += 1) {
      try {
        const result = fileForOffice(core, me, council) as {
          filing?: { status?: string };
        };
        filed = ["petitioning", "on-ballot"].includes(
          result.filing?.status ?? "",
        );
      } catch {
        // Filing is not open yet.
      }
      if (!filed) advanceCore(core, addDays(today(), 7));
    }
    expect(filed, `${place.name}: the player filed`).toBe(true);

    const seen = new Set<string>();
    let published: string | null = null;
    while (!published && today() < "2025-11-04") {
      advanceCore(core, addDays(today(), 1));
      for (const entry of director.ledger.people.get(me)!.schedule) {
        if (seen.has(entry.momentId)) continue;
        const types = entry.bindings.map((row) => row.typeKey);
        if (types.includes("interview-invite")) {
          seen.add(entry.momentId);
          const result = purposeScene(core, director, me, entry, {
            typeKey: "interview-invite",
          });
          if (result?.kind !== "composed") continue;
          const agree = result.scene.talk.tree.replies.findIndex(
            (reply) => reply.line.move === "agree",
          );
          expect(replyInScene(core, director, me, entry, [agree])).toBeTruthy();
        } else if (types.includes("interview-sitting")) {
          seen.add(entry.momentId);
          const scene = composeScene(core, director, me, entry);
          const talk = openConversation(core, me, scene!.talkToId!, {
            director,
            occasionId: entry.momentId,
          });
          // A side, a decline, a side: the declined reply is the brief one.
          for (let at = 0; talk.choices.length && at < 8; at += 1) {
            const brief = talk.choices.find((c) => c.move === "brief");
            const side = talk.choices.find((c) => c.move !== "brief");
            say(core, talk, (at === 1 && brief ? brief : side)!.key);
          }
          published = talk.sitting?.published ?? null;
          break;
        }
      }
    }
    expect(published, `${place.name}: an interview was sat for`).toBeTruthy();
    const row = interviewsFor(api, me).find((r) => r.id === published)!;
    expect(row.storyId, `${place.name}: the outlet printed it`).toBeTruthy();
    const record = api
      .moduleState("news")
      .table("stories")
      .get(row.storyId!) as never;
    const printed = wordPrintedStory(core, record)!;
    // The paragraphs open with the lede.
    const text = (printed.paragraphs ?? [printed.lede]).join(" ");
    process.stdout.write(
      `${place.name}: ${printed.headline} | ${text}\n${JSON.stringify(row.answers)}\n`,
    );
    expect(row.answers.length, `${place.name}: three questions`).toBe(3);
    // Named in full once, then by last name, as the paper's stories do.
    const me_ = core.people.get(me)!;
    const full = `${me_.givenName} ${me_.familyName}`;
    expect(text.split(full).length - 1, `${place.name}: "${full}" once`).toBe(
      1,
    );
    expect(
      row.answers.some((a) => a.position === null),
      `${place.name}: one question declined`,
    ).toBe(true);
    for (const answer of row.answers) {
      const asked = questionAbout(answer.question);
      expect(asked, `${answer.question} has a spoken name`).toBeTruthy();
      // Each question named as the reporter asked it, with its stand.
      const stand =
        answer.position === null
          ? /declined to take a side on/
          : answer.position > 0
            ? /backs|is for/
            : /opposes|is against/;
      const sentence = text
        .split(/(?<=\.)\s+/)
        .find((s) => s.includes(asked!) && stand.test(s));
      expect(
        sentence,
        `${place.name}: the story says the stand on ${asked}`,
      ).toBeTruthy();
    }
    // The limit is near twice the slower of two measurements: alone (38.6 s
    // at 358c0156), and on CI beside the pull request's other changed test
    // files (74.6 s, #9509's unit job). It was 70 s, set from 32 s measured
    // alone on train aa927a84; that was the wrong measurement, since CI runs
    // the file beside the others (Account lead, Nov 15).
  }, 150_000);
});
