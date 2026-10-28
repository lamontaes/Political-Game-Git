/**
 * A person serving a prison term does not vote where the state's law takes
 * the vote (pool: gov-needs-opus-gov-209). The law is one row per place in
 * data/research/justice/prison-voting-2026.json; the voter rolls, the count
 * and the polling place read the person's custody record on the day they
 * decide, and the vote returns on release.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import prisonVoting from "../../data/research/justice/prison-voting-2026.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { barredFromVoting } from "./law-reach/group-a-voting";
import {
  chargeDecisionDays,
  dispositionDays,
  incarceratedMayVote,
} from "./justice-law";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import {
  JUSTICE_MODULE_ID,
  type CountedCustodyRow,
  type CustodyRow,
} from "./modules/justice";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { placeStateKeys } from "./places";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

it("has a sourced or estimated row for all 56 places, and the vote stays only where the law keeps it", () => {
  const rows = prisonVoting.places as Record<
    string,
    { incarceratedMayVote: boolean }
  >;
  const keys = [...placeStateKeys()].sort();
  expect(keys).toHaveLength(56);
  for (const key of keys) expect(rows[key], key).toBeDefined();
  expect(keys.filter((key) => rows[key]!.incarceratedMayVote).sort()).toEqual([
    "US-DC",
    "US-ME",
    "US-PR",
    "US-VT",
  ]);
});

// Past the hearing of a case opened today: the charge decision, then the
// state's time to disposition (pleas wait for it as trials do), then a month.
const pastHearing = (api: CoreAPI) =>
  chargeDecisionDays(api).days +
  dispositionDays(api, lawChain(api).stateKey).days +
  30;

it("keeps someone serving a prison term off the roll where the law bars them, and returns the vote on release", () => {
  const ATTEMPTS = 6;
  let last = "";
  const crashes: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const seed = createHash("sha256")
      .update(randomBytes(16))
      .digest("hex")
      .slice(0, 16);
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const api = coreAPI(core);
    const alive = (id: string) =>
      core.people.get(id)?.alive &&
      core.cashJournal.residualAccountByOwner.has(id);
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    const members = [
      ...new Set(
        terms
          .filter(
            (t) => t.status === "serving" && t.personId && alive(t.personId),
          )
          .map((t) => t.personId!),
      ),
    ].slice(0, 40);
    const rich = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.tier !== "husk" &&
          !members.includes(p.id) &&
          alive(p.id),
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
      .slice(0, 15);
    // The only forced part is the offers; reports, charges, trials and
    // sentences are the justice engine's own.
    for (const offerer of rich)
      for (const official of members)
        considerBribe(api, {
          offererId: offerer.id,
          officialId: official,
          stakeMinor: 50_000_000,
          subjectId: `favor:${offerer.id}:${official}`,
        });
    try {
      advanceCore(core, addDays(makeIsoDate(core.date), pastHearing(api)));
    } catch (error) {
      // A world that stops on a finance error (pool item
      // finance-outside-obligation-ended-child) cannot show the vote.
      crashes.push(`seed ${seed} (${lawChain(api).placeName}): ${error}`);
      continue;
    }
    const stateKey = lawChain(api).stateKey;
    const where = `${lawChain(api).placeName} [${stateKey}], seed ${seed}`;
    // Named people's custody; counted people's terms have no one to bar.
    const custody = (
      api.moduleState(JUSTICE_MODULE_ID).table("custody").rows() as unknown as (
        CustodyRow | CountedCustodyRow
      )[]
    ).filter((row): row is CustodyRow => row.kind === "person");
    last = `${where}, ${custody.length} custody records`;
    if (!custody.length) continue;
    const mayVote = incarceratedMayVote(api, stateKey).may;
    for (const row of custody) {
      // Serving: barred exactly where the law bars; released: never barred.
      expect(barredFromVoting(api, row.personId), `${where} ${row.id}`).toBe(
        row.status === "serving" ? !mayVote : false,
      );
    }
    // Someone with no custody record is never barred by this rule.
    const free = [...core.people.keys()].find(
      (id) => !custody.some((row) => row.personId === id),
    )!;
    expect(barredFromVoting(api, free), where).toBe(false);
    return;
  }
  throw new Error(
    `No one was sentenced to prison in ${ATTEMPTS} worlds (last: ${last}). Worlds that stopped: ${crashes.join("; ") || "none"}.`,
  );
}, 1_800_000);
