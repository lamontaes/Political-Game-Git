import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { draftBill, memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { applyCoreEvent } from "../core2/state";
import { closenessBetween } from "../core2/closeness";
import { chooseVariant } from "./arc-variant";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import { wordSceneMove } from "../english/scene-talk-words";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 32;
const YEAR = 365;
const TRIED = 12;
/** How many bills are pending before the body as the campaign starts. */
const PENDING = 6;

// A donor's gift is a campaign-gift record (campaigns.ts recordGift). Which
// donor-ask arc plays is read from it and from the two people's records
// (arc-variant.ts, data/arc-variants.json): the gift against the donor's own
// year, its share of what others gave, how close the two are, earlier gifts
// and earlier asks the candidate put off. The gifts of a played campaign each
// play the variant their reads give; the controlled causes below change one
// record at a time on the same two people and show the variant move.
it(`a donor's ask plays the variant its records give (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "donor-ask-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), YEAR);
    const counted = (race: ContestRow) =>
      addDays(makeIsoDate(race.electionDate), 1) <= end;
    // Many places elect only in even years: the elections engine holds each
    // seat's next contest from the start.
    if (
      !(
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).some((race) => race.filingDeadline >= core.date && counted(race))
    ) {
      tried.push(`${place.name} (no race counted in the year)`);
      continue;
    }
    const open = () =>
      [...openContests(api)]
        .filter(counted)
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        );
    for (let day = 0; !open().length && day < YEAR; day += 7)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    // A council or board race, whose body has bills before it.
    const race = open().find((row) =>
      townSeats(api).some(
        (seat) =>
          seat.office.id === row.officeId &&
          members(api, row.officeId).length > 1,
      ),
    );
    const clerkId = race ? filingClerkFor(api, race.id)?.personId : undefined;
    // Edge case by hand: bills pending before that body as the campaign
    // starts, on several questions, so a donor has one to raise (a town's
    // own bills come and go).
    const sponsor = race ? members(api, race.officeId)[0] : undefined;
    const policies = race
      ? billCatalog(api, race.level as "city" | "county" | "state")
          .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
          .filter(
            (row) => row.kind === "policy-question" && row.authority.allowed,
          )
          .slice(0, PENDING)
      : [];
    const pending =
      race && sponsor
        ? policies.map((policy) =>
            draftBill(api, {
              bodyOfficeId: race.officeId,
              sponsorId: memberKey(sponsor),
              provisions: [
                provisionFor({ policyId: policy.id, operation: "enact" }),
              ],
            }),
          )
        : [];
    const filed = new Set(
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]
      ).map((row) => row.personId),
    );
    // An adult of the town who files, watched from the day they file.
    const town = lawChain(api).townPlaceId;
    const candidate = race
      ? [...core.people.values()]
          .filter(
            (p) =>
              p.alive &&
              p.id !== clerkId &&
              !filed.has(p.id) &&
              p.placeId === town &&
              ageOnDate(p.birthDate, core.date) >= 18,
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, TRIED)
          .find((p) => {
            director.watch(core, p.id);
            return ["petitioning", "on-ballot"].includes(
              fileCandidacy(api, {
                personId: p.id,
                contestId: race.id,
                platform: [],
              }).status ?? "",
            );
          })
      : undefined;
    if (!race || !candidate || !pending.length) {
      tried.push(`${place.name} (no council race took a filing)`);
      continue;
    }
    // The campaign runs to the night before the count.
    advanceCore(core, addDays(makeIsoDate(race.electionDate), -1));
    const book = director.ledger.people.get(candidate.id as PersonId)!;
    // The gifts to the candidate from others that were moments for them.
    const gifts = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "campaign-gift" &&
        row.facts?.candidateId === candidate.id &&
        book.moments.some((moment) => moment.causeId === row.id),
    );
    if (!gifts.length) {
      tried.push(`${place.name} (no gift was a moment)`);
      continue;
    }
    const family = "donor-ask";
    const seen = new Map<string, string>();
    for (const gift of gifts) {
      const here = `${where}: ${gift.id}`;
      const entry = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === gift.id,
      )!;
      const result = purposeScene(
        core,
        director,
        candidate.id as PersonId,
        entry,
      );
      expect(result?.kind, here).toBe("composed");
      if (result?.kind !== "composed") continue;
      const chosen = result.scene.variant;
      expect(chosen, `${here}: no variant`).toBeTruthy();
      // The scene plays the variant with the highest score, and the gift's
      // own record is among the records its reads came from.
      expect(chosen!.scores[0]!.variant, here).toBe(chosen!.variant);
      expect(chosen!.recordIds, here).toContain(gift.id);
      expect(result.scene.talk.purpose, here).toBe(chosen!.purpose);
      seen.set(gift.id, chosen!.variant);
    }
    const asked = candidate.id as PersonId;
    // The probes use a donor the candidate has no tie to, so the tie does not
    // speak for the gift (a gift's real donor is often someone they know), and
    // the one whose own temper pulls least against any of the variants: how a
    // person is goes into the score too (arc-variant.ts), so a donor whose
    // temper runs against a variant would hide what the records say.
    const pulls = Object.values(
      (
        variantFile as unknown as {
          families: Record<
            string,
            { variants: Record<string, { pull?: string[] }> }
          >;
        }
      ).families[family]!.variants,
    ).flatMap((row) => (row.pull ? [row.pull] : []));
    const leastAgainst = (id: PersonId) =>
      Math.min(
        ...pulls.map(
          (facets) =>
            facets.reduce(
              (sum, key) => sum + (core.people.get(id)!.traits[key] ?? 0),
              0,
            ) / facets.length,
        ),
      );
    const donorId = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== asked &&
          ageOnDate(p.birthDate, core.date) >= 18 &&
          // A donor whose living costs are on record, so a gift reads against a year.
          p.livingCostDailyMinor > 0 &&
          !core.relationships.has(
            p.id < asked ? `${p.id}:${asked}` : `${asked}:${p.id}`,
          ),
      )
      .sort(
        (a, b) =>
          leastAgainst(b.id as PersonId) - leastAgainst(a.id as PersonId) ||
          a.id.localeCompare(b.id),
      )[0]!.id as PersonId;
    const real = gifts[0]!;
    const cause = (
      id: string,
      facts: Record<string, string>,
      date = core.date,
    ) => ({ id, date, facts: { ...real.facts!, ...facts } });
    const pick = (
      id: string,
      facts: Record<string, string>,
      who: [PersonId, PersonId] = [donorId, asked],
      date = core.date,
    ) =>
      chooseVariant(core, {
        family,
        askerId: who[0],
        askedId: who[1],
        cause: cause(id, facts, date),
      })!;
    // A gift of a few dollars that is a sliver of what others gave: a small
    // donor. The same donor with a gift that is most of what others gave and
    // a year's pay: a large one. Only the gift's own record changes.
    const small = pick("probe-small", {
      amountMinor: "2500",
      share: "0.01",
      totalMinor: "2500",
    });
    const large = pick("probe-large", {
      amountMinor: "900000000",
      share: "0.9",
      totalMinor: "900000000",
    });
    expect(small.variant, `${where}: ${JSON.stringify(small.reads)}`).toBe(
      "small",
    );
    expect(large.variant, `${where}: ${JSON.stringify(large.reads)}`).toBe(
      "large",
    );
    expect(small.recordIds).toContain("probe-small");
    // The closest tie in the town: two people who are friends play the
    // friend's ask over a middling gift.
    let closest: { a: PersonId; b: PersonId; level: number } | undefined;
    for (const tie of core.relationships.values()) {
      const [a, b] = [tie.actorId, tie.otherId];
      if (!core.people.get(a)?.alive || !core.people.get(b)?.alive) continue;
      const level = closenessBetween(core, a, b);
      if (!closest || level > closest.level) closest = { a, b, level };
    }
    const middling = {
      amountMinor: "300000",
      share: "0.3",
    };
    if (closest && closest.level > 0.5) {
      const friend = pick(
        "probe-friend",
        { ...middling, totalMinor: "30000001" },
        [closest.a, closest.b],
      );
      expect(friend.variant, `${where}: ${JSON.stringify(friend.reads)}`).toBe(
        "friend",
      );
      expect(friend.recordIds.some((id) => id.includes(":"))).toBe(true);
    }
    // The candidate put the donor off twice before (the replies the scene
    // engine keeps): the same donor's next ask is the one who comes back.
    // The candidate is watched, so the replies they chose are kept.
    core.focusPersonIds.add(asked);
    for (const n of [1, 2])
      applyCoreEvent(core, {
        id: `probe-put-off-${n}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [asked, donorId],
        placeId: core.people.get(asked)!.placeId,
        facts: { typeKey: "donor-ask", ending: "put-off", causeId: `old-${n}` },
        source: {
          tag: "SOURCED",
          citation: "Recorded scene: the reply the player chose to say.",
          asOf: core.date,
        },
      });
    // The donor's next gift comes a day on.
    const nextDay = addDays(makeIsoDate(core.date), 1);
    const again = pick(
      "probe-again",
      { ...middling, totalMinor: "30000002" },
      [donorId, asked],
      nextDay,
    );
    expect(again.variant, `${where}: ${JSON.stringify(again.reads)}`).toBe(
      "again",
    );
    expect(again.recordIds).toEqual(
      expect.arrayContaining(["probe-put-off-1", "probe-put-off-2"]),
    );
    console.log(
      `DONOR ASK VARIANTS ${where}: played gifts ${[...seen.entries()].map(([id, v]) => `${id} ${v}`).join(", ")}; small ${small.scores.map((s) => s.variant + ":" + s.score.toFixed(2)).join(" ")}; large ${large.scores.map((s) => s.variant + ":" + s.score.toFixed(2)).join(" ")}; again ${again.scores.map((s) => s.variant + ":" + s.score.toFixed(2)).join(" ")}`,
    );
    return;
  }
  throw new Error(
    `no campaign took a gift in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);

// Two donors who gave to the same campaign and named the same bill give
// their own reasons (owner, Nov 11, 2026: "a ton of different speech
// versions ... This introduces people to their world."): one who works at a
// clinic and wants the bill passed, one who works at a mill and wants it
// stopped. The request is joined from the bank's pieces through the English
// engine; each names the bill, the question and the donor's own workplace,
// and a large and a small gift are each named as given when the narrator sets the scene.
it(`two donors on opposite sides of one bill give their own reasons (seed ${seed})`, () => {
  const fact = (text: string, id: string) => ({ text, sourceRecordIds: [id] });
  const base = {
    name: fact("Dana Ruiz", "person:donor"),
    first: fact("Sam", "person:player"),
    place: fact("the town", "place:town"),
    bill: fact("Ordinance 2026-4", "bill:4"),
    "donor-bill": fact("Ordinance 2026-4", "bill:4"),
    about: fact("free fares on public transit", "bill:4"),
  };
  const word = (
    step: "state" | "open",
    move: string,
    facts: Record<string, { text: string; sourceRecordIds: string[] }>,
    momentKey: string,
  ) => {
    const worded = wordSceneMove({
      move: {
        step,
        move,
        role: "asker",
        purpose: "donor-ask",
        key: "favor-asked",
      },
      facts,
      seed,
      speakerId: "person:donor",
      traits: {},
      momentKey,
      said: new Set(),
    });
    return worded && "text" in worded ? worded.text : "";
  };
  const forIt = word(
    "state",
    "request",
    {
      ...base,
      money: fact("$1,000", "gift:a"),
      gift: fact("$1,000", "gift:a"),
      employer: fact("Riverside Clinic", "org:clinic"),
      "side-for": fact("for", "view:a"),
    },
    "gift:a",
  );
  const againstIt = word(
    "state",
    "request",
    {
      ...base,
      money: fact("$50", "gift:b"),
      gift: fact("$50", "gift:b"),
      employer: fact("Harlan Mill", "org:mill"),
      "side-against": fact("against", "view:b"),
    },
    "gift:b",
  );
  process.stdout.write(`DONOR REASONS: "${forIt}" | "${againstIt}"\n`);
  expect(forIt).not.toBe(againstIt);
  for (const [text, employer] of [
    [forIt, "Riverside Clinic"],
    [againstIt, "Harlan Mill"],
  ] as const) {
    expect(text).toContain("Ordinance 2026-4");
    expect(text).toContain(employer);
    expect(text).toContain("free fares on public transit");
  }
  for (const amount of ["$1,000", "$50"]) {
    const facts = {
      ...base,
      money: fact(amount, `gift:${amount}`),
      gift: fact(amount, `gift:${amount}`),
    };
    const setup = wordSceneMove({
      move: {
        step: "narrate",
        move: "narrate",
        role: "narrator",
        purpose: "donor-ask",
        key: "favor-asked",
      },
      facts,
      seed,
      speakerId: "narrator",
      traits: {},
      momentKey: `gift:${amount}`,
      said: new Set(),
    });
    const told = setup && "text" in setup ? setup.text : "";
    process.stdout.write(`DONOR GIFT TOLD: "${told}"\n`);
    expect(told).toContain(amount);
  }
});
