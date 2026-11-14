import { expect, it } from "vitest";
import { campaignDay } from "../bench/campaign";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import {
  addDays,
  ageOnDate,
  daysBetweenText,
  makeIsoDate,
} from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { careNeedOf } from "../core2/modules/health";
import { townSeats } from "../core2/modules/offices";
import { partyTie } from "../core2/modules/parties";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import { chooseVariant } from "./arc-variant";
import { doorsKnocked } from "./doors";

// A door the player knocks plays the arc its resident's own records give
// (arc-variant.ts, src/director/data/arc-variants.json, families ask-signature and
// ask-support): a layoff on the jobs books, an open rent notice on the
// household, the care their health or a household member's asks, a tie to
// the player, the same party. Never a draw: each variant seen here is checked
// against the record that caused it, the variant played is the highest score
// (a tie to the name first in the alphabet), a second knock on the same door
// plays the next one down, and where no record scores above the plain arc the
// plain scene plays. A signature variant plays only while the petition
// circulates, a vote variant only after. Three places and seeds are fixed
// here so the proof runs the same every time (Account lead, Nov 14): each
// run seed draws its place from all 56 by the one draw, and the test names
// the place it must land on.
const PINNED = [
  { seed: "332ce80c95d5b55b", place: "Hortonville" },
  { seed: "door1a", place: "Donnelly" },
  { seed: "7f3c19e2a4b85d60", place: "Eva" },
] as const;
const ATTEMPTS = 4;
const WEEKS = 52;
const DAYS = 6;

type Row = {
  purpose: string;
  base: number;
  terms?: { read: string; weight: number }[];
  onlyFor?: { fact: string; is: string };
};
const FAMILIES = (
  variantFile as unknown as {
    families: Record<string, { variants: Record<string, Row> }>;
  }
).families;
const PLAIN = FAMILIES["ask-support"]!.variants.plain!.base;

/** A local filing by a resident who holds no seat, from the open contests. */
function fileLocal(core: CoreState, personId: string) {
  const api = coreAPI(core);
  if (townSeats(api).some((s) => s.holder?.personId === personId)) return null;
  for (const contest of openContests(api)) {
    if (contest.level === "federal" || contest.level === "state") continue;
    const filed = fileCandidacy(api, {
      personId,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (
      filed.status !== "refused" &&
      ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    )
      return filed.filing;
  }
  return null;
}

/** What the resident's records hold for a variant, read here apart from the engine. */
function onRecord(
  core: CoreState,
  variant: string,
  residentId: PersonId,
  playerId: PersonId,
  date: string,
): string | null {
  const api = coreAPI(core);
  const person = core.people.get(residentId)!;
  if (variant === "lost-job") {
    const row = (
      api
        .moduleState("jobs")
        .table("changes")
        .query("byPerson", [residentId]) as unknown as {
        id: string;
        kind: string;
        date: string;
      }[]
    ).find(
      (change) =>
        change.kind === "layoff" &&
        change.date < date &&
        daysBetweenText(change.date, date) <= 180,
    );
    return row ? `layoff ${row.id} on ${row.date}` : null;
  }
  if (variant === "rent-notice") {
    const row = (
      api
        .moduleState("housing")
        .table("cases")
        .query("byHousehold", [person.householdId]) as unknown as {
        id: string;
        open?: boolean;
      }[]
    ).find((notice) => notice.open);
    return row ? `rent notice ${row.id}` : null;
  }
  if (variant === "sick") {
    const need = careNeedOf(core, residentId);
    return need > 0 ? `own care need ${need.toFixed(2)}` : null;
  }
  if (variant === "caring") {
    for (const id of core.households.get(person.householdId)?.memberIds ?? []) {
      if (id === residentId || !core.people.get(id)?.alive) continue;
      const need = careNeedOf(core, id);
      if (need > 0) return `${id} care need ${need.toFixed(2)}`;
    }
    return null;
  }
  if (variant === "knows-you") {
    const [a, b] = [residentId, playerId].sort();
    const close = core.relationships.has(`${a}:${b}`)
      ? closenessBetween(core, residentId, playerId)
      : 0;
    return close > 0 ? `tie ${a}:${b} closeness ${close.toFixed(2)}` : null;
  }
  if (variant === "same-party") {
    const mine = partyTie(api, residentId)?.partyId;
    return mine && mine === partyTie(api, playerId)?.partyId
      ? `party ${mine}`
      : null;
  }
  return null;
}

it.each(PINNED)(
  "a door plays the variant its resident's own records give, never a draw (run seed $seed, $place)",
  ({ seed, place: expectedPlace }) => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `door-variants:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      if (!place.name.startsWith(`${expectedPlace},`)) {
        tried.push(`${where}: passed over on the way to ${expectedPlace}`);
        continue;
      }
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const local = () =>
        openContests(coreAPI(core)).some(
          (row) => row.level !== "federal" && row.level !== "state",
        );
      for (let week = 0; week < WEEKS && !local(); week += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
      const start = makeIsoDate(core.date);
      const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
      const adults = [...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.placeId === town &&
            row.tier !== "husk" &&
            ageOnDate(makeIsoDate(row.birthDate), start) >= 35,
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        );
      let filing: ReturnType<typeof fileLocal> = null;
      let playerId: PersonId | undefined;
      for (const row of adults.slice(0, 60)) {
        core.playerId = row.id;
        filing = fileLocal(core, row.id);
        if (filing) {
          playerId = row.id;
          break;
        }
      }
      if (!filing || !playerId) {
        tried.push(`${where}: no local race to file for by ${start}`);
        continue;
      }
      core.focusPersonIds.add(playerId);
      const seen: string[] = [];
      let doors = 0;
      for (let day = 0; day < DAYS; day += 1) {
        campaignDay(core, playerId, { filingId: filing.id, kind: "canvass" });
        for (const record of doorsKnocked(core, playerId)) {
          const residentId = record.personIds[0]!;
          const facts = record.facts as Record<string, string>;
          const family =
            facts.petition === "true" ? "ask-signature" : "ask-support";
          const again = facts.first === "false";
          const choice = chooseVariant(core, {
            family,
            askerId: residentId,
            askedId: playerId,
            cause: { id: record.id, date: core.date, facts },
            setting: "other-home",
            ...(again ? { nextDown: true } : {}),
          })!;
          doors += 1;
          const at = `${where}: door ${record.id}, resident ${residentId}, ${family}`;
          // The stated rule: the highest score, a tie to the name first in
          // the alphabet; a second knock takes the next one down.
          const scores = choice.scores;
          for (let i = 1; i < scores.length; i += 1)
            expect(
              scores[i - 1]!.score > scores[i]!.score ||
                (scores[i - 1]!.score === scores[i]!.score &&
                  scores[i - 1]!.variant < scores[i]!.variant),
              `${at}: ${JSON.stringify(scores)}`,
            ).toBe(true);
          const plain = scores.find((s) => s.variant === "plain")!.score;
          const expected =
            again &&
            scores[1] &&
            scores[1].score > 0 &&
            scores[1].score >= plain
              ? scores[1]
              : scores[0]!;
          expect(choice.variant, at).toBe(expected.variant);
          // A variant that belongs to the other kind of door never plays.
          const row = FAMILIES[family]!.variants[choice.variant]!;
          if (row.onlyFor)
            expect(facts[row.onlyFor.fact], at).toBe(row.onlyFor.is);
          if (choice.variant === "plain") {
            if (!again)
              expect(
                scores.every((s) => s.variant === "plain" || s.score <= PLAIN),
                `${at}: ${JSON.stringify(scores)}`,
              ).toBe(true);
            continue;
          }
          // Each variant played stands on the record that caused it.
          const cause = onRecord(
            core,
            choice.variant,
            residentId as PersonId,
            playerId,
            core.date,
          );
          expect(cause, `${at}: ${choice.variant} with no record`).toBeTruthy();
          seen.push(
            `${choice.purpose}${again ? " (second knock)" : ""} <- ${cause} (resident ${residentId}, door ${record.id})`,
          );
        }
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      }
      if (!seen.length) {
        tried.push(`${where}: ${doors} doors, every one plain`);
        continue;
      }
      process.stdout.write(
        `DOOR VARIANTS ${where}, run seed ${seed}, ${doors} doors:\n${seen.join("\n")}\n`,
      );
      return;
    }
    expect.fail(`seed ${seed}: ${tried.join("; ")}`);
  },
  600_000,
);
