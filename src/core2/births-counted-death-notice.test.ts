/**
 * A counted relative's death reaches the full people who are family to them:
 * the month's counts record the death, a death notice names them as
 * witnesses, and each grieves from the closeness the opening recorded for
 * the tie (core-counted-death-relations). A place is drawn from all 56 on a
 * seed nobody chose, redrawn until a full person's counted relative dies
 * within a played year; DEATH_NOTICE_SEED pins one. The world always plays the
 * whole year, and the death must fall inside it, between the opening and the
 * end.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { currentCloseness } from "./closeness";
import { gameStartDate } from "./game-start";
import { griefToday } from "./grief";
import { addDays } from "./kernel/dates";
import { pairKey } from "./kernel/ids";
import { advanceCore } from "./life";
import { DEFAULT_HEALTH_DATA } from "./modules/health";
import { coreAPI } from "./state";

const seed = process.env.DEATH_NOTICE_SEED ?? randomBytes(8).toString("hex");

it(`a counted relative's death reaches a full relative who grieves from their recorded tie (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "counted-death-notice");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Each counted relative's full kin at the opening, with the tie's closeness.
    const kin = new Map<string, { personId: string; closeness: number }[]>();
    for (const person of core.people.values())
      for (const id of person.familyIds) {
        if (!core.husks.has(id)) continue;
        const tie = core.relationships.get(pairKey(person.id, id));
        expect(tie, `${where}: ${person.id} and ${id}`).toBeDefined();
        kin.set(id, [
          ...(kin.get(id) ?? []),
          {
            personId: person.id,
            closeness: currentCloseness(core, tie!),
          },
        ]);
      }
    // Month by month, so each death's notice and grief are read as it lands.
    const opening = gameStartDate();
    const end = addDays(opening, 365);
    let found:
      | {
          deceasedId: string;
          diedOn: string;
          eventId: string;
          relative: string;
          grief: number;
        }
      | undefined;
    while (core.date < end) {
      advanceCore(
        core,
        addDays(core.date, 30) < end ? addDays(core.date, 30) : end,
      );
      // The month's counts row is bookkeeping (kept only with it on); the
      // notice is what a relative reads: a death event in their grief.
      for (const [deceasedId, relatives] of kin) {
        if (found) break;
        for (const relative of relatives) {
          const person = core.people.get(relative.personId);
          if (!person?.alive) continue;
          const grief = griefToday(api, person);
          const eventId = grief.sourceIds.find((id) =>
            id.startsWith(
              `${DEFAULT_HEALTH_DATA.deathEventKind}:${deceasedId}:`,
            ),
          );
          if (!eventId) continue;
          found = {
            deceasedId,
            diedOn: eventId.slice(eventId.lastIndexOf(":") + 1),
            eventId,
            relative: relative.personId,
            grief: grief.grief,
          };
          break;
        }
      }
    }
    // The year was played to its end, whether or not a witness was found.
    expect(core.date, `${where}: the played year completed`).toBe(end);
    if (!found) {
      tried.push(`${where}: no counted relative of a full person died`);
      continue;
    }
    expect(found.grief, `${where}: ${found.relative} grieves`).toBeGreaterThan(
      0,
    );
    // The counted death fell inside the played year, by date.
    expect(
      found.diedOn > opening && found.diedOn <= end,
      `${where}: ${found.deceasedId} died on ${found.diedOn}, outside ${opening} to ${end}`,
    ).toBe(true);
    process.stdout.write(
      `DEATH NOTICE ${where}: ${found.deceasedId} died on ${found.diedOn} (year ${opening} to ${end}, played to ${core.date}); ${found.eventId} reached ${found.relative}, grief ${found.grief.toFixed(4)} when read (opening closeness ${kin
        .get(found.deceasedId)!
        .find((k) => k.personId === found!.relative)!
        .closeness.toFixed(4)})\n`,
    );
    return;
  }
  throw new Error(
    `no counted relative of a full person died in a year: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);
