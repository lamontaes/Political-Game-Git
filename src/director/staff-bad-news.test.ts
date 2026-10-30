import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  STAFF_MODULE_ID,
  servingStaffOf,
  staffOf,
} from "../core2/modules/staff";
import { PRESS_STORY_EVENT } from "../core2/press-desk";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// Staff bring bad news (owner, Oct 25): when a press record names an
// officeholder or their bill and runs against them, one of their own aides
// brings the story in. In a drawn town played up to two years, the
// officeholders who have aides are followed as play follows the people
// around the player. Every story record that names one of them is checked:
// a story against them, or against a bill they sponsored, stages the
// staff-news scene the day it runs, with a serving aide bringing it, citing
// the outlet and the record; a story for them, or one that names neither
// them nor their bill, stages none.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
const MONTHS = 24;

it(`a story against an officeholder or their bill brings an aide in, seed ${seed}`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const tried: string[] = [];
  let quiet = 0;
  try {
    for (let attempt = 0; attempt < 4 && !told.length; attempt += 1) {
      const place =
        attempt === 0 && pinned
          ? {
              key: pinned,
              seed,
              name: corePlaceByKey(pinned)?.displayName ?? pinned,
            }
          : drawPlace(seed, `staff-bad-news:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      if (!core.modules.has(STAFF_MODULE_ID)) {
        tried.push(`${where}: no staff engine`);
        continue;
      }
      // The officeholders with an aide, followed from the day they have one.
      const watched = new Set<PersonId>();
      const follow = () => {
        for (const row of api
          .moduleState(STAFF_MODULE_ID)
          .table("staff")
          .rows() as unknown as { officialId: string }[]) {
          const id = row.officialId as PersonId;
          if (watched.has(id) || !core.people.get(id)?.alive) continue;
          if (!servingStaffOf(api, id).length) continue;
          core.focusPersonIds.add(id);
          director.watch(core, id);
          watched.add(id);
        }
      };
      const stories: {
        id: string;
        date: string;
        facts: Record<string, string>;
        named: readonly string[];
      }[] = [];
      api.subscribeEvents(
        "staff-bad-news-test",
        [PRESS_STORY_EVENT],
        (_, event) =>
          stories.push({
            id: event.id,
            date: event.date,
            facts: event.facts as Record<string, string>,
            named: event.personIds,
          }),
      );
      const end = addDays(makeIsoDate(core.date), MONTHS * 30);
      let checked = 0;
      // The day each officeholder's last story staged its scene.
      const staged = new Map<string, string>();
      while (core.date < end && told.length < 3) {
        follow();
        advanceCore(core, addDays(makeIsoDate(core.date), 14));
        for (; checked < stories.length; checked += 1) {
          const story = stories[checked]!;
          for (const personId of story.named) {
            if (!watched.has(personId as PersonId)) continue;
            const said = `${where}: ${story.id} for ${personId}`;
            const against =
              (story.facts.sponsorId === personId &&
                story.facts.billFraming === "against") ||
              (story.facts.subjectId === personId &&
                story.facts.subjectFraming === "against");
            const book = director.ledger.people.get(personId as PersonId)!;
            const entry = book.schedule.find(
              (row) =>
                book.momentsById.get(row.momentId)?.causeId === story.id &&
                row.bindings.some(
                  (binding) => binding.typeKey === "staff-news",
                ),
            );
            if (!against) {
              // A story for them, or even, brings no one in.
              expect(
                entry,
                `a scene for a story not against them: ${said}`,
              ).toBeUndefined();
              quiet += 1;
              continue;
            }
            const aides = servingStaffOf(api, personId).map(
              (row) => row.personId,
            );
            if (!aides.length) continue;
            // The same aide brings the same scene once a month at most, and a
            // story the same day joins that sitting.
            const last = staged.get(personId);
            if (!entry && last && addDays(makeIsoDate(last), 30) > story.date)
              continue;
            // A story the day their own bill lost joins the sitting where
            // the loss is brought to them (the failure's own staff-news).
            const sameDay = book.schedule.some(
              (row) =>
                row.bindings.some(
                  (binding) => binding.typeKey === "staff-news",
                ) && book.momentsById.get(row.momentId)?.date === story.date,
            );
            if (!entry && sameDay) continue;
            expect(
              entry,
              `no aide brought in the story: ${said}`,
            ).toBeDefined();
            // It stops their day, as a record of their own life does.
            expect(entry!.outcome, said).toBe("scene-now");
            const result = purposeScene(
              core,
              director,
              personId as PersonId,
              entry!,
              {
                typeKey: "staff-news",
              },
            );
            expect(result?.kind, said).toBe("composed");
            if (result?.kind !== "composed") continue;
            const { scene } = result;
            // One of their aides, as the staff record has them (an aide may
            // have left since the day the story ran).
            expect(
              staffOf(api, personId).map((row) => row.personId),
              said,
            ).toContain(scene.talk.askerId);
            expect(scene.cause.id, said).toBe(story.id);
            const outlet = scene.facts.find((fact) => fact.key === "outlet");
            expect(outlet?.recordIds, said).toEqual(
              expect.arrayContaining([
                story.id,
                story.facts.storyId,
                story.facts.outletId,
              ]),
            );
            expect(scene.talk.state.text, said).toContain(outlet!.text);
            expect(scene.talk.tree.replies.length, said).toBeGreaterThan(0);
            staged.set(personId, story.date);
            told.push(
              `${said} (${story.facts.billId ? `bill ${story.facts.billId}` : "about them"}): aide ${scene.talk.askerId}: "${scene.talk.state.text}" / ${scene.talk.tree.replies.map((reply) => `"${reply.line.text}"`).join(", ")}`,
            );
          }
        }
      }
      // A story that names none of them brings none of them a scene: every
      // staff-news scene a followed officeholder has is for a story against
      // them or their bill, or for a bill of their own that lost.
      for (const personId of watched) {
        const book = director.ledger.people.get(personId)!;
        for (const row of book.schedule) {
          if (!row.bindings.some((binding) => binding.typeKey === "staff-news"))
            continue;
          const causeId = book.momentsById.get(row.momentId)?.causeId ?? "";
          // A bill of their own that lost is brought to them too.
          const cause = core.durableLog.get(causeId as never);
          if (
            cause?.kind === "bill-failed" &&
            cause.facts?.sponsorId === personId
          )
            continue;
          const story = stories.find((item) => item.id === causeId);
          expect(story?.named, `${where}: ${row.momentId}`).toContain(personId);
        }
      }
      if (!told.length)
        tried.push(
          `${where}: ${watched.size} officeholders with aides, ${stories.length} story records, none against one of them`,
        );
    }
    expect(told.length, tried.join("; ")).toBeGreaterThan(0);
    console.log(
      `STAFF BAD NEWS\n${told.join("\n")}\n(${quiet} stories for or even, no scene)`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
