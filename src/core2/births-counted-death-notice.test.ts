/**
 * A counted relative's death reaches the full people who are family to them:
 * the month's counts record the death, a death notice names them as
 * witnesses, and each grieves from the closeness the opening recorded for
 * the tie (core-counted-death-relations). A place is drawn from all 56 on a
 * seed nobody chose, redrawn until a full person's counted relative dies
 * within a played year; DEATH_NOTICE_SEED pins one.
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
import { RENEWAL_MODULE_ID } from "./modules/renewal";
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
    const end = addDays(gameStartDate(), 365);
    let found:
      | {
          deceasedId: string;
          countsId: string;
          eventId: string;
          relative: string;
          grief: number;
        }
      | undefined;
    while (!found && core.date < end) {
      advanceCore(
        core,
        addDays(core.date, 30) < end ? addDays(core.date, 30) : end,
      );
      for (const row of api
        .moduleState(RENEWAL_MODULE_ID)
        .table("counts")
        .rows() as unknown as { id: string; deaths: string[] }[])
        for (const deceasedId of row.deaths) {
          const relatives = kin.get(deceasedId);
          if (!relatives || found) continue;
          for (const relative of relatives) {
            const person = core.people.get(relative.personId);
            if (!person?.alive) continue;
            const grief = griefToday(api, person);
            const eventId = grief.sourceIds.find((id) =>
              id.startsWith(
                `${DEFAULT_HEALTH_DATA.deathEventKind}:${deceasedId}:`,
              ),
            );
            expect(
              eventId,
              `${where}: ${relative.personId} learned of ${deceasedId}'s death (${row.id})`,
            ).toBeDefined();
            found = {
              deceasedId,
              countsId: row.id,
              eventId: eventId!,
              relative: relative.personId,
              grief: grief.grief,
            };
            break;
          }
        }
    }
    if (!found) {
      tried.push(`${where}: no counted relative of a full person died`);
      continue;
    }
    expect(found.grief, `${where}: ${found.relative} grieves`).toBeGreaterThan(
      0,
    );
    process.stdout.write(
      `DEATH NOTICE ${where}: ${found.deceasedId} died in ${found.countsId}; ${found.eventId} reached ${found.relative}, grief ${found.grief.toFixed(4)} on ${core.date} (opening closeness ${kin
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
