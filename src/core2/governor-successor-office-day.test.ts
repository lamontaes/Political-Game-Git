/**
 * A governor seated mid-year takes up the office's days (pool item
 * gov-successor-governor-identity-only-no-office-day). In Sinajana, Guam the
 * governor's successor stayed a recorded identity with no person for five
 * months, so no clemency petition was taken up with 20 prisoners serving.
 * Here the prisons fill by the engines' own convictions (the bribes are the
 * forced part, as in the clemency tests), the governor's seat is vacated by
 * the offices engine's own rule, and the successor must be a person who takes
 * up a petition. A place is drawn from all 56; set GOVERNOR_SUCCESSOR_SEED to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import {
  clemencyAuthority,
  GOVERNOR_DECIDES_CLEMENCY,
} from "./modules/executive";
import { prisonersServing } from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, vacateSeat, type TermRow } from "./modules/offices";
import { resultsOf, stateOfficeOf } from "./office-day-state";
import { coreAPI } from "./state";

const ATTEMPTS = 12;

function playPlace(seed: string, skipped: string[]): string | null {
  const place = drawPlace(seed, "governor-successor");
  const where = `${place.name} [${place.key}], seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const state = lawChain(api).stateKey;
  const authority = clemencyAuthority(state);
  if (!authority || !GOVERNOR_DECIDES_CLEMENCY.includes(authority)) {
    skipped.push(`${where}: clemency is ${authority ?? "not on file"}`);
    return null;
  }
  const terms = () =>
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
  const governor = terms()
    .filter((t) => t.status === "serving" && t.personId)
    .map((t) => stateOfficeOf(api, t.personId!))
    .find((o) => o?.role === "governor" && o.stateKey === state);
  if (!governor) {
    skipped.push(`${where}: no governor who is a person`);
    return null;
  }
  // Bribes to the serving officials but the governor fill the prisons.
  const alive = (id: string) =>
    core.people.get(id)?.alive &&
    core.cashJournal.residualAccountByOwner.has(id);
  const officials = [
    ...new Set(
      terms()
        .filter(
          (t) =>
            t.status === "serving" &&
            t.personId &&
            t.personId !== governor.personId &&
            alive(t.personId),
        )
        .map((t) => t.personId!),
    ),
  ].slice(0, 40);
  const rich = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        !officials.includes(p.id) &&
        p.id !== governor.personId &&
        alive(p.id),
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
    .slice(0, 15);
  for (const offerer of rich)
    for (const official of officials)
      considerBribe(api, {
        offererId: offerer.id,
        officialId: official,
        stakeMinor: 50_000_000,
        subjectId: `favor:${offerer.id}:${official}`,
      });
  advanceCore(core, addDays(makeIsoDate(core.date), 240));
  if (!prisonersServing(api, state).length) {
    skipped.push(`${where}: nobody in a state prison`);
    return null;
  }
  // The governor leaves office; the offices engine fills the seat by its rule.
  const vacancy = vacateSeat(api, governor.seatId, "resigned");
  expect(vacancy, `${where}: ${governor.seatId} vacated`).not.toBeNull();
  const successor = () =>
    terms().find((t) => t.seatId === governor.seatId && t.status === "serving");
  const seatedOn = core.date;
  if (!successor()) {
    skipped.push(
      `${where}: ${governor.seatId} left open by its rule (${vacancy!.rule.method})`,
    );
    return null;
  }
  // Three weeks: the weekly petition comes up at least twice.
  advanceCore(core, addDays(makeIsoDate(core.date), 21));
  const term = successor()!;
  expect(
    term.personId,
    `${where}: ${term.id}, seated ${seatedOn}, has a person`,
  ).toBeTruthy();
  expect(term.personId, `${where}: a new holder`).not.toBe(governor.personId);
  expect(stateOfficeOf(api, term.personId!)?.role, `${where}`).toBe("governor");
  const decided = resultsOf(api, term.personId!).filter(
    (row) => row.kind === "clemency",
  );
  expect(
    decided.length,
    `${where}: ${term.personId} (${term.id}) took up no petition in 21 days with ${prisonersServing(api, state).length} serving`,
  ).toBeGreaterThan(0);
  for (const row of decided)
    expect(row.by, `${where}: ${row.id}`).toBe("character");
  // A person from the next office day: the petition is weekly, so the first
  // is taken up within a week of the seating, not when some other engine
  // happens to read the seat (Fair Plain, Michigan on main: 15 days).
  const first = [...decided].sort((a, b) => a.date.localeCompare(b.date))[0]!;
  expect(
    first.date <= addDays(makeIsoDate(seatedOn), 7),
    `${where}: ${term.id} seated ${seatedOn}, first petition ${first.id} on ${first.date}`,
  ).toBe(true);
  return `${where}: ${governor.termId} left office on ${seatedOn}; ${term.id} is ${term.personId} and took up ${decided.length} petitions, first ${first.id} on ${first.date}`;
}

it("a governor seated mid-year is a person who takes up the weekly petition", () => {
  const skipped: string[] = [];
  const base =
    process.env.GOVERNOR_SUCCESSOR_SEED ?? randomBytes(8).toString("hex");
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const proof = playPlace(`${base}:${attempt}`, skipped);
    if (proof) {
      console.log(`GOVERNOR-SUCCESSOR ${proof}`);
      return;
    }
  }
  throw new Error(
    `No drawn place had a governor's successor take up a petition: ${skipped.join("; ")}`,
  );
}, 3_600_000);
