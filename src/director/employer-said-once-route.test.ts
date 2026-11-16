import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { townPlaces, visitPlace } from "../bench/places";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { acceptJobOffer, jobOffersFor } from "../core2/modules/jobs";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { noteHeard, openConversation, say } from "./conversation";

// A player at Glenmoore (place key 4229704, world seed "reach-1") takes the
// game's own job offer, then visits the places Travel lists and talks to
// the people there (the route a player takes: townPlaces, visitPlace, the
// talk). In every talk the speaker's employer is said once, and a closing
// line never names an employer nothing in the talk said (owner rule 113).
const PLACE_KEY = "4229704";
const SEED = "reach-1";

it("an employer is named once in a talk, and no closing names one the talk did not say (Glenmoore, seed reach-1)", () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(SEED, "2025-01-20", {
    twoLevel: true,
    placeKey: PLACE_KEY,
  });
  const me = playerId as PersonId;
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const twice: string[] = [];
  const unsaid: string[] = [];
  let talks = 0;
  for (let day = 0; day < 10; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const offer of jobOffersFor(api, me))
      if (offer.status === "pending") acceptJobOffer(api, offer.id);
    if (day % 2) continue;
    for (const [at, minute] of [570, 720, 840].entries()) {
      for (const row of townPlaces(core, me).slice(0, 8)) {
        let visit: ReturnType<typeof visitPlace>;
        try {
          visit = visitPlace(core, me, row.organizationId, minute);
        } catch {
          continue;
        }
        const present = Object.keys(visit.names).filter((id) => id !== me);
        for (const other of present.slice(0, 3)) {
          const talk = openConversation(core, me, other as PersonId, {
            director,
            presentIds: [me, ...present] as PersonId[],
            minuteOfDay: minute,
          });
          if (!talk.lines.length) continue;
          noteHeard(core, talk);
          for (let turn = 0; turn < 14 && talk.choices.length; turn += 1)
            say(
              core,
              talk,
              talk.choices[(turn + at) % talk.choices.length]!.key,
            );
          talks += 1;
          const texts = talk.lines.map((line) => line.text.toLowerCase());
          const employers = [me, other as PersonId].flatMap((id) => {
            const job = core.people.get(id)?.jobId;
            const org = job
              ? core.organizations.get(core.jobs.get(job)!.organizationId)
              : undefined;
            return org ? [org.name.toLowerCase()] : [];
          });
          for (const [index, text] of texts.entries()) {
            if (
              !talk.lines[index]!.wording?.parts.some((part) =>
                part.startsWith("conversation.farewell"),
              )
            )
              continue;
            for (const name of employers)
              if (
                text.includes(name) &&
                !texts.slice(0, index).some((before) => before.includes(name))
              )
                unsaid.push(`${name}: ${talk.lines[index]!.text}`);
          }
          for (const name of employers) {
            const own = talk.lines.filter(
              (line) =>
                line.speakerId === (other as PersonId) &&
                line.text.toLowerCase().includes(name),
            );
            if (own.length > 1)
              twice.push(own.map((line) => line.text).join(" | "));
          }
        }
      }
    }
  }
  expect(talks).toBeGreaterThan(10);
  expect(unsaid).toEqual([]);
  expect(twice).toEqual([]);
}, 150_000);
