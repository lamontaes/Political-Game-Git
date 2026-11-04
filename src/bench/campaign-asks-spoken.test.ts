import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import type { FilingRow } from "../core2/modules/elections";
import type { PersonId } from "../core2/types";
import { coreAPI } from "../core2/state";
import { campaignAct } from "./campaign";
import { buildBenchWorld } from "./world";

// The volunteer and endorsement asks are answered in each person's own
// spoken words (agreements/3-4.md, Lane 3's campaignAnswer), the name shown
// as the speaker, never narrated inside the line. Drawn places, a fresh seed.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const YEAR = 365;

it("campaign asks are answered in the speaker's own words on the bench", () => {
  const notes: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "campaign-asks-spoken");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    for (let day = 0; !openContests(api).length && day < YEAR; day += 7)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    // A grown resident of the town files and plays (as election night's
    // check does): the campaign is theirs.
    const townId = core.people.get(playerId!)?.placeId;
    const town = [...core.people.values()]
      .filter(
        (p) => p.alive && p.placeId === townId && p.birthDate < "1990-01-01",
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 30);
    let filing: FilingRow | undefined;
    let candidate: PersonId | undefined;
    for (const race of [...openContests(api)].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      for (const person of town) {
        const filed = fileCandidacy(api, {
          personId: person.id,
          contestId: race.id,
          platform: [],
        });
        if (
          filed.filing &&
          ["petitioning", "on-ballot"].includes(filed.status ?? "")
        ) {
          filing = filed.filing;
          candidate = person.id as PersonId;
          break;
        }
      }
      if (filing) break;
    }
    if (!filing || !candidate) {
      notes.push(`${where}: nobody could file`);
      continue;
    }
    core.playerId = candidate;
    for (const kind of ["volunteer", "endorsement"]) {
      const result = campaignAct(core, candidate, {
        filingId: filing.id,
        kind,
      }) as { answers: { personId: string; name: string; line: string }[] };
      expect(result.answers.length, `${where}: nobody asked`).toBeGreaterThan(
        0,
      );
      for (const answer of result.answers) {
        const person = core.people.get(answer.personId as never)!;
        expect(answer.line, `${where}: ${answer.personId}`).toBeTruthy();
        expect(answer.line, where).not.toContain(person.familyName);
        expect(answer.name, where).toBe(
          `${person.givenName} ${person.familyName}`,
        );
      }
      console.log(
        `${where}: ${kind}: ${result.answers
          .slice(0, 2)
          .map((a) => `${a.name}: "${a.line}"`)
          .join(" | ")}`,
      );
    }
    return;
  }
  throw new Error(`no race to campaign in: ${notes.join("; ")}`);
}, 1_800_000);
