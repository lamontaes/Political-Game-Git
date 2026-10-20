/* eslint-disable @typescript-eslint/no-explicit-any -- module rows are read untyped by this tooling */
/**
 * Batch 13: scenes with a purpose (owner, Oct 15, evening: "what a scene
 * is"). Development tooling; nothing here words anything.
 *
 *   OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" \
 *   npm run words:scenes -- --id batch-13 --cache /tmp/claude-0/batch-12.cache \
 *     [--profiles 5] [--per-type 3]
 *
 * It loads the one cached played world (the bench's `<cache>.world`), finds
 * real people and records for each situation type that has a purpose (council
 * members and bills, a reporter and outlet, a party chair, a donor, a
 * constituent with a recorded lost job, eviction or illness, a household, an
 * opponent), and composes each scene with `composeSceneTalk`
 * (src/director/scene-talk.ts) once per personality profile, keeping a
 * profile only when its words differ. The director fires none of these
 * situations in the cached year (their producers are awaited), so every scene
 * is a proof scene, marked as such with the records used. Whatever a scene
 * needs that the world does not hold is listed under "stood in", never
 * invented as a fact.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { stableHash } from "../../src/core2/kernel/ids";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import { corePlaceByJurisdictionId } from "../../src/core2/place-lookup";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalkLine,
} from "../../src/director/scene-talk";
import type { Fact } from "../../src/director/render";
import { properName, spoken, spokenWhen } from "../../src/director/words";
import { composeScene } from "../../src/director/scene";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { policyNames } from "../../src/bench/words";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { stancesOf } from "../../src/core2/modules/views";
import situationFile from "../../src/director/data/situation-types.json" with { type: "json" };
import rulesFile from "../../src/director/data/scene-talk-rules.json" with { type: "json" };
import profilesFile from "../../src/director/data/grading-profiles.json" with { type: "json" };
import { sentenceCount, wordCount } from "../../src/english/calibration";
import { CATALOGUE_SCALES } from "../../src/simulation/personality-catalogue.generated";
import {
  directorScenes,
  directorStaged,
  hasWorld,
  loadWorld,
  worldCachePath,
  type GradingProfile,
  type LineRow,
} from "./grading-bench";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const id = option("id", "batch-15");
const cache = option("cache", "");
const profileCount = Number(option("profiles", "5"));

if (!cache || !hasWorld(cache)) {
  console.error(
    `No cached world at ${cache ? worldCachePath(cache) : "(no --cache given)"}. Build it once with: npm run dialogue:coverage -- --id batch-12 --seed batch-12 --days 365 --cache <file>`,
  );
  process.exit(1);
}

// The people's own traits come first: the lead exchange is the one their
// records make (owner, Oct 19: personality must come into effect). The
// grading profiles follow as comparisons.
const profiles: GradingProfile[] = [
  {
    id: "own",
    why: "the people's own trait levels, from their records",
    traits: {},
  } as GradingProfile,
  ...(profilesFile as { profiles: GradingProfile[] }).profiles.slice(
    0,
    Math.max(0, profileCount - 1),
  ),
];
// Every piece an earlier review page showed: a new page says something new.
const shownPieces = new Set<string>();
for (const file of readdirSync("data/english/batches"))
  if (/^batch-\d+\.json$/.test(file) && file !== `${id}.json`)
    for (const key of readFileSync(
      `data/english/batches/${file}`,
      "utf8",
    ).match(/scene-talk\.[a-z-]+\.[a-z0-9-]+/g) ?? [])
      shownPieces.add(key);
const world = loadWorld(worldCachePath(cache));
const core = world.core as CoreState;
const api = coreAPI(core);
const rows = (module: string, table: string): any[] =>
  api.moduleState(module).table(table).rows() as any[];
const quoted = (title: string) => `"${title}"`;

/* ----------------------------------------------------------- the directory */

const offices = new Map<string, any>(
  rows("core2-offices-v1", "offices").map((row) => [row.id, row]),
);
const terms: any[] = rows("core2-offices-v1", "terms");
const termsById = new Map<string, any>(terms.map((row) => [row.id, row]));
const names = policyNames();

/** A record id that names a person in the world, whether it is a person or an official's term. */
const realPerson = (value: string | undefined | null): string | undefined => {
  if (!value) return undefined;
  if (core.people.has(value)) return value;
  const term = termsById.get(value.replace(/^official:/, ""));
  return term?.personId && core.people.has(term.personId)
    ? term.personId
    : undefined;
};
/** People serving in an office now: never cast as a plain resident (a voter, a petitioner, a witness). */
const serving17 = new Set(
  terms
    .filter((row) => row.status === "serving")
    .map((row) => realPerson(row.personId))
    .filter((id): id is string => !!id),
);
/** An adult with no office: who a plain resident's part is cast from (owner, Oct 19: the context must fit). */
const citizen = (id: string) => {
  const row = core.people.get(id);
  return (
    !!row &&
    row.alive &&
    row.tier !== "husk" &&
    !serving17.has(id) &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >= 18
  );
};
/** A person's view on one policy topic, from the views engine, or none. */
const stanceOn = (personId: string, topic: string) =>
  stancesOf(api, personId as never).find((row) => row.topic === topic);
const nameOf = (personId: string) => {
  const row = core.people.get(personId);
  return row ? `${row.givenName} ${row.familyName}` : personId;
};
const officeText = (officeId: string) => {
  const office = offices.get(officeId);
  if (!office) return undefined;
  return office.level === "county" || office.level === "local"
    ? `county ${String(office.title).toLowerCase()}`
    : String(office.title);
};
/** An office as the record names it, with its casing ("U.S. Representative", "County Commissioner"). */
const officeName = (contest: any) => {
  const office = offices.get(contest.officeId);
  const title = String(office?.title ?? contest.title);
  return (office?.level === "county" || office?.level === "local") &&
    !/county/i.test(title)
    ? `County ${title}`
    : title;
};
const serving = (officeId: string) =>
  terms
    .filter((row) => row.officeId === officeId && row.status === "serving")
    .map((row) => ({ term: row, personId: realPerson(row.personId) }))
    .filter((row): row is { term: any; personId: string } => !!row.personId);

const bills: any[] = rows("core2-legislature-v1", "bills");
const titleOf = (bill: any): string | undefined => {
  const question = bill.provisions?.find(
    (p: any) => p.kind === "policy-question",
  );
  return question ? names[question.question as string] : undefined;
};
const titled = bills.flatMap((bill) => {
  const title = titleOf(bill);
  return title ? [{ bill, title }] : [];
});
const bodies = [
  ...new Set(titled.map((row) => row.bill.bodyOfficeId as string)),
].sort();

const order = <T>(
  items: readonly T[],
  seed: string,
  key: (item: T) => string,
) =>
  [...items].sort((a, b) =>
    stableHash(`${seed}:${key(a)}`).localeCompare(
      stableHash(`${seed}:${key(b)}`),
    ),
  );

const fact = (text: string, ids: readonly string[]): Fact => ({
  text,
  sourceRecordIds: [...ids],
});
const flag = (ids: readonly string[]): Fact => fact("yes", ids);
/** The asker's office or job from the records: a serving term, a staff row, a press role, a party chair. */
const staffRows: any[] = rows("core2-staff-v1", "staff");
const pressStaff: any[] = rows("core2-press-v1", "staff");
const roleOf = (personId: string): Fact | undefined => {
  const term = terms.find(
    (row) => row.status === "serving" && realPerson(row.personId) === personId,
  );
  if (term) {
    const office = offices.get(term.officeId);
    if (office)
      return fact(
        officeName({ officeId: term.officeId, title: office.title }),
        [term.id],
      );
  }
  const aide = staffRows.find((row) => row.personId === personId);
  if (aide) return fact(String(aide.role), [aide.id]);
  const press = pressStaff.find((row) => row.id === personId);
  if (press) return fact(String(press.role), [press.id]);
  return undefined;
};
/** The yes votes on a bill and the votes it needs, from the vote records and the body's seats. */
const voteCount = (bill: any): Record<string, Fact> | undefined => {
  const cast = rows("core2-legislature-v1", "votes").filter(
    (row) => row.billId === bill.id,
  );
  const seats = offices.get(bill.bodyOfficeId)?.seats;
  if (!cast.length || !seats) return undefined;
  const yes = cast.filter((row) => row.vote === "yes").length;
  return {
    votes: fact(String(yes), cast.map((row) => row.id).slice(0, 3)),
    needed: fact(String(Math.floor(seats / 2) + 1), [bill.bodyOfficeId]),
    // Short of a majority: the count the asker reads out is still a gap.
    ...(yes < Math.floor(seats / 2) + 1
      ? { "votes-short": flag([bill.bodyOfficeId]) }
      : {}),
  };
};
const townOf = (personId: string) => {
  const place = corePlaceByJurisdictionId(
    core.people.get(personId)!.placeId as never,
  );
  return place
    ? { text: spoken(place), id: core.people.get(personId)!.placeId }
    : undefined;
};
const relatives = (personId: string) => {
  const me = core.people.get(personId)!;
  return (core.households.get(me.householdId)?.memberIds ?? [])
    .filter((other) => other !== personId && core.people.get(other)?.alive)
    .sort();
};

/** One scene to compose: who, with what facts, from which records, and what was stood in. */
interface Spec {
  typeKey: string;
  askerId: string;
  askedId: string;
  facts: Record<string, Fact>;
  records: string[];
  standIn: string[];
  /** Why the scene happens, in plain words, from its cause (a life's page). */
  why?: string[];
  /** The scene's day: the panel reads the people as they were then. */
  asOf?: string;
}

const specs: Spec[] = [];
const sharedSeats = `Proof scene: the director fires none of these situations in the cached year (their producers are awaited), and the player is a ${"17"}-year-old with no seat, so a sitting member stands in the player's seat.`;
void sharedSeats;
const SEAT = "a sitting member stands in the player's seat (proof scene)";

/* votes, carrying a bill and bargaining over a section: members of one body. */
for (const body of bodies) {
  const members = order(serving(body), body, (row) => row.personId);
  if (members.length < 2) continue;
  const billsOfBody = titled.filter((row) => row.bill.bodyOfficeId === body);
  const bodyName = officeText(body) ?? body;
  for (const [typeKey, purposeNeedsPromise] of [
    ["vote-asked", false],
    ["vote-confirmed", true],
    ["section-bargain", false],
    ["bill-carry", false],
  ] as const) {
    order(billsOfBody, typeKey, (row) => row.bill.id).forEach((row, at) => {
      const askerSeat = members[(at + 1) % members.length]!;
      const askedSeat = members[at % members.length]!;
      if (askerSeat.personId === askedSeat.personId) return;
      const sponsor = realPerson(row.bill.sponsorId);
      const asker =
        typeKey === "bill-carry" && sponsor ? sponsor : askerSeat.personId;
      if (asker === askedSeat.personId) return;
      const facts: Record<string, Fact> = {
        name: fact(nameOf(asker), [asker]),
        first: fact(core.people.get(askedSeat.personId)!.givenName, [
          askedSeat.personId,
        ]),
        bill: fact(quoted(row.title), [row.bill.id]),
        // The bill's yes votes and the votes it needs, where a vote record exists.
        ...(voteCount(row.bill) ?? {}),
      };
      const standIn = [
        SEAT,
        `the bill is shown before its vote, as ${row.bill.status} in the record`,
      ];
      const records = [row.bill.id, asker, askedSeat.personId, body];
      if (typeKey === "section-bargain") {
        const count = row.bill.provisions.length;
        facts.section = fact(String(count > 1 ? 2 : 1), [row.bill.id]);
        if (count < 2)
          standIn.push(
            "the bill has one provision, so section 1 stands for the one it bargains over",
          );
      }
      if (purposeNeedsPromise) {
        const question = row.bill.provisions.find(
          (p: any) => p.kind === "policy-question",
        )?.question;
        const promise = rows("core2-campaigns-v1", "promises").find(
          (p) =>
            p.stance?.question === question &&
            (p.candidateId === askedSeat.term.id ||
              realPerson(p.candidateId) === askedSeat.personId),
        );
        if (!promise) return;
        facts["your-promise"] = flag([promise.id]);
        records.push(promise.id);
      }
      specs.push({
        typeKey,
        askerId: asker,
        askedId: askedSeat.personId,
        facts,
        records,
        standIn: [...standIn, `body: ${bodyName}`],
      });
    });
  }
}

/* donors: a gift record names the donor and the campaign it went to. */
const filings: any[] = rows("core2-elections-v1", "filings");
const contests = new Map<string, any>(
  rows("core2-elections-v1", "contests").map((row) => [row.id, row]),
);
const filingsById = new Map(filings.map((row) => [row.id, row]));
// The contribution engine sets no size for a donor who asks a favor, so the
// three largest gift records stand for the donors in this world.
const giftsBySize = [...rows("core2-campaigns-v1", "gifts")].sort(
  (a, b) => b.totalMinor - a.totalMinor || a.id.localeCompare(b.id),
);
const donorNote = `donors are the three largest gift records in this world (${giftsBySize
  .slice(0, 3)
  .map((gift) => `$${Math.round(gift.totalMinor / 100)}`)
  .join(
    ", ",
  )}); the contribution engine sets no size at which a donor asks a favor, so these are small gifts`;
const donorFloorMinor = (
  rulesFile as unknown as { grounds: { donorFloorMinor: { value: number } } }
).grounds.donorFloorMinor.value;
const donorThreshold = (
  rulesFile as unknown as { grounds: { donorShare: { value: number } } }
).grounds.donorShare.value;
// What a campaign raised is its own record, not the sum of the gifts listed.
const campaignRaised = new Map<string, number>(
  rows("core2-campaigns-v1", "campaigns").map((row) => [
    row.id as string,
    row.raisedMinor as number,
  ]),
);
const donorShare = (gift: any) =>
  gift.totalMinor / (campaignRaised.get(gift.campaignId) || 1);
const largestShare = Math.max(0, ...giftsBySize.map(donorShare));
const typeSkipReason = new Map<string, string>([
  [
    "donor-ask",
    `no donor gave more than ${Math.round(donorThreshold * 100)}% of any campaign's money (the largest share in this world is ${Math.round(largestShare * 100)}%, a gift of $${Math.round(giftsBySize[0]!.totalMinor / 100)}), so no donor has a ground to lean on a candidate`,
  ],
]);
let donors = 0;
for (const gift of [...giftsBySize].sort(
  (a, b) => donorShare(b) - donorShare(a),
)) {
  if (donors >= 3) break;
  // A donor leans on you with the share of the money that earns it; a gift
  // under the floor is not named in dollars at all ("$11, most of what you
  // raised" reads as a joke), so the scene stands on "one of your donors".
  const sizable = gift.totalMinor >= donorFloorMinor;
  if (sizable && donorShare(gift) < donorThreshold) continue;
  const filing = filingsById.get(gift.campaignId);
  const asked = realPerson(filing?.personId);
  const donor = realPerson(gift.donorId);
  const any = order(titled, "donor-bill", (row) => row.bill.id)[0];
  if (!filing || !asked || !donor || donor === asked || !any) continue;
  donors += 1;
  specs.push({
    typeKey: "donor-ask",
    askerId: donor,
    askedId: asked,
    facts: {
      name: fact(nameOf(donor), [donor]),
      first: fact(core.people.get(asked)!.givenName, [asked]),
      ...(sizable
        ? {
            money: fact(`$${Math.round(gift.totalMinor / 100)}`, [gift.id]),
            share: fact("most of", [gift.id, gift.campaignId]),
          }
        : {}),
      bill: fact(quoted(any.title), [any.bill.id]),
    },
    records: [gift.id, filing.id, donor, asked],
    standIn: [
      donorNote,
      "the gift record names no interest, so the bill the donor cares about is chosen from the bill table",
    ],
  });
}

/* party chairs: the party record names its leader; the asked is a filer of that party. */
for (const party of rows("core2-parties-v1", "parties")) {
  const chair = realPerson(party.leaderId);
  if (!chair) continue;
  const filers = order(
    filings.filter(
      (row) => row.party === party.name && realPerson(row.personId),
    ),
    "party",
    (row) => row.id,
  );
  for (const filing of filers.slice(0, 4)) {
    const asked = realPerson(filing.personId)!;
    if (asked === chair) continue;
    const contest = contests.get(filing.contestId);
    const any = order(titled, "party-bill", (row) => row.bill.id)[0];
    if (!contest || !any) continue;
    specs.push({
      typeKey: "party-ask",
      askerId: chair,
      askedId: asked,
      facts: {
        name: fact(nameOf(chair), [chair]),
        first: fact(core.people.get(asked)!.givenName, [asked]),
        party: fact(party.name, [party.id]),
        office: fact(officeName(contest), [contest.id]),
        bill: fact(quoted(any.title), [any.bill.id]),
        recruit: flag([party.id, filing.id]),
      },
      records: [party.id, filing.id, contest.id, chair, asked],
      standIn: [
        "the party's ask is staged on the filing record; the record holds no recruiting call",
        "the bill the chair names is chosen from the bill table",
      ],
    });
  }
}

/* constituents: a recorded lost job, eviction or serious illness. */
const problemOf: Record<string, string> = {
  "money:job-ended": "problem-job",
  "feeling:event:housing.eviction": "problem-eviction",
  "feeling:event:health.serious-illness": "problem-illness",
};
// The town's own body, from the records (never a named place; owner, one rule for all 56).
const board =
  bodies.find((id) =>
    ["local", "county"].includes(String(offices.get(id)?.level)),
  ) ??
  bodies[0] ??
  "";
const members = order(serving(board), "hours", (row) => row.personId);
let memberAt = 0;
for (const label of Object.keys(problemOf)) {
  const found: { personId: string; momentId: string; causeId: string }[] = [];
  for (const [personId, book] of world.director.ledger.people)
    for (const moment of book.moments)
      if (moment.label === label && core.people.get(personId)?.alive)
        found.push({ personId, momentId: moment.id, causeId: moment.causeId });
  for (const row of order(found, label, (x) => x.momentId).slice(0, 2)) {
    const official = members[memberAt % members.length];
    memberAt += 1;
    const town = townOf(row.personId);
    if (!official || !town || official.personId === row.personId) continue;
    specs.push({
      typeKey: "office-hours",
      askerId: row.personId,
      askedId: official.personId,
      facts: {
        name: fact(nameOf(row.personId), [row.personId]),
        first: fact(core.people.get(official.personId)!.givenName, [
          official.personId,
        ]),
        place: fact(town.text, [town.id]),
        [problemOf[label]!]: flag([row.causeId, row.momentId]),
      },
      records: [row.momentId, row.causeId, row.personId, official.personId],
      standIn: [
        SEAT,
        "the constituent is a resident whose ledger holds this moment",
      ],
    });
  }
}

/* family scenes: a household member of a filer, a winner and a loser, an officeholder. */
const results: any[] = rows("core2-voting-v1", "results");
const familyOf = (askedId: string) => relatives(askedId)[0];
for (const filing of order(filings, "fam-filing", (row) => row.id)) {
  const asked = realPerson(filing.personId);
  const kin = asked ? familyOf(asked) : undefined;
  const contest = contests.get(filing.contestId);
  if (!asked || !kin || !contest) continue;
  const town = townOf(asked);
  specs.push({
    typeKey: "family-filing",
    askerId: kin,
    askedId: asked,
    facts: {
      name: fact(nameOf(kin), [kin]),
      first: fact(core.people.get(asked)!.givenName, [asked]),
      office: fact(officeName(contest), [contest.id]),
      ...(town ? { place: fact(town.text, [town.id]) } : {}),
    },
    records: [filing.id, contest.id, kin, asked],
    standIn: [
      "the relative's source is left out: no knowledge record of the filing exists yet",
      "the household member is the filer's housemate on record; the filing day's scene is not fired by the director yet",
    ],
  });
}
for (const result of order(results, "fam-result", (row) => row.id)) {
  const candidates = Object.keys(result.totals ?? {});
  const contest = contests.get(result.contestId);
  const winner = realPerson(result.winnerId);
  if (!contest) continue;
  if (winner && familyOf(winner))
    specs.push({
      typeKey: "family-win",
      askerId: familyOf(winner)!,
      askedId: winner,
      facts: {
        name: fact(nameOf(familyOf(winner)!), [familyOf(winner)!]),
        first: fact(core.people.get(winner)!.givenName, [winner]),
        office: fact(officeName(contest), [contest.id]),
      },
      records: [result.id, contest.id, winner],
      standIn: [
        "the result is the voting engine's; the director does not yet fire a result scene",
      ],
    });
  const loser = candidates
    .filter((c) => c !== result.winnerId)
    .map(realPerson)
    .find((p): p is string => !!p && !!familyOf(p));
  if (loser && winner)
    specs.push({
      typeKey: "family-loss",
      askerId: familyOf(loser)!,
      askedId: loser,
      facts: {
        name: fact(nameOf(familyOf(loser)!), [familyOf(loser)!]),
        first: fact(core.people.get(loser)!.givenName, [loser]),
        office: fact(officeName(contest), [contest.id]),
        opponent: fact(nameOf(winner), [result.id, winner]),
      },
      records: [result.id, contest.id, loser, winner],
      standIn: [
        "the result is the voting engine's; the director does not yet fire a result scene",
      ],
    });
}
// A lost race needs a loser with a household. When no loser on record has
// one, a resident's household stands in for the loser's, with another
// contest's winner as the opponent.
if (!specs.some((spec) => spec.typeKey === "family-loss")) {
  const result = order(results, "fam-loss", (row) => row.id).find(
    (row) => realPerson(row.winnerId) && contests.get(row.contestId),
  );
  const loser =
    order(
      [...core.people.keys()].filter(
        (id) => core.people.get(id)?.alive && familyOf(id) && realPerson(id),
      ),
      "loser",
      (x) => x,
    )[0] ?? world.playerId;
  const kin = familyOf(loser);
  const winner = result ? realPerson(result.winnerId) : undefined;
  const contest = result ? contests.get(result.contestId) : undefined;
  if (result && kin && winner && contest && winner !== loser)
    specs.push({
      typeKey: "family-loss",
      askerId: kin,
      askedId: loser,
      facts: {
        name: fact(nameOf(kin), [kin]),
        first: fact(core.people.get(loser)!.givenName, [loser]),
        office: fact(officeName(contest), [contest.id]),
        opponent: fact(nameOf(winner), [result.id, winner]),
      },
      records: [result.id, contest.id, loser, kin, winner],
      standIn: [
        "no loser on record has a household in this world, so a resident with one stands in for a loser; the race and its winner are another contest's",
      ],
    });
}
for (const member of members) {
  const kin = familyOf(member.personId);
  if (!kin) continue;
  specs.push({
    typeKey: "family-absence",
    askerId: kin,
    askedId: member.personId,
    facts: {
      name: fact(nameOf(kin), [kin]),
      first: fact(core.people.get(member.personId)!.givenName, [
        member.personId,
      ]),
      "in-office": flag([member.term.id]),
      absence: flag([member.term.id]),
    },
    records: [member.term.id, kin, member.personId],
    standIn: [
      "the member's absence from home is staged; the office-day engine records the meetings but no evenings away yet",
    ],
  });
}

/* rallies: a volunteer and an opponent around a filing. */
for (const filing of order(filings, "rally", (row) => row.id)) {
  const asked = realPerson(filing.personId);
  if (!asked) continue;
  const me = core.people.get(asked)!;
  const volunteer = order(
    [...me.knownIds].filter(
      (other) => core.people.get(other)?.alive && other !== asked,
    ),
    "volunteer",
    (x) => x,
  )[0];
  if (volunteer)
    specs.push({
      typeKey: "campaign-stop",
      askerId: volunteer,
      askedId: asked,
      facts: {
        name: fact(nameOf(volunteer), [volunteer]),
        first: fact(me.givenName, [asked]),
      },
      records: [filing.id, volunteer, asked],
      standIn: [
        "the volunteer is someone the candidate knows; no volunteer record exists yet",
      ],
    });
  const other = filings.find(
    (row) => row.contestId === filing.contestId && row.id !== filing.id,
  );
  const opponent =
    realPerson(other?.personId) ??
    realPerson(
      order(
        filings.filter((row) => row.contestId !== filing.contestId),
        "opponent",
        (row) => row.id,
      )[0]?.personId,
    );
  if (opponent && opponent !== asked)
    specs.push({
      typeKey: "rally-opponent",
      askerId: opponent,
      askedId: asked,
      facts: {
        name: fact(nameOf(opponent), [opponent]),
        first: fact(me.givenName, [asked]),
        opponent: fact(nameOf(opponent), [opponent]),
      },
      records: [filing.id, opponent, asked],
      standIn: other
        ? []
        : [
            "the contest has one filer on record, so another filer stands in as the opponent",
          ],
    });
}

/* the mayor's or governor's desk and the member's staff. */
const staff: any[] = rows("core2-staff-v1", "staff");
for (const desk of rows("core2-executive-v1", "desk")) {
  const billRow = titled.find((row) => row.bill.id === desk.billId);
  const exec = realPerson(desk.executiveId);
  const aide = staff.find(
    (s) => s.officialId === desk.executiveId && core.people.has(s.personId),
  );
  if (!billRow || !exec || !aide || aide.personId === exec) continue;
  specs.push({
    typeKey: "desk-bill",
    askerId: aide.personId,
    askedId: exec,
    facts: {
      name: fact(nameOf(aide.personId), [aide.personId]),
      first: fact(core.people.get(exec)!.givenName, [exec]),
      bill: fact(quoted(billRow.title), [billRow.bill.id]),
    },
    records: [desk.id, billRow.bill.id, aide.id, exec],
    standIn: [],
  });
}
const outlets: any[] = rows("core2-press-v1", "outlets");
const localOutlets = outlets.filter((row) => row.tier === "local");
for (const row of order(
  titled.filter((r) => r.bill.status === "failed"),
  "staff",
  (r) => r.bill.id,
)) {
  const sponsor = realPerson(row.bill.sponsorId);
  const aide = staff.find((s) => core.people.has(s.personId));
  const outlet = localOutlets[0];
  const org = outlet
    ? core.organizations.get(outlet.organizationId)
    : undefined;
  if (!sponsor || !aide || !org || aide.personId === sponsor) continue;
  specs.push({
    typeKey: "staff-news",
    askerId: aide.personId,
    askedId: sponsor,
    facts: {
      name: fact(nameOf(aide.personId), [aide.personId]),
      first: fact(core.people.get(sponsor)!.givenName, [sponsor]),
      bill: fact(quoted(row.title), [row.bill.id]),
      outlet: fact(properName(org.name), [org.id]),
      "bill-lost": flag([row.bill.id]),
    },
    records: [row.bill.id, aide.id, sponsor, org.id],
    standIn: [
      "the aide is the first staff record in the world, not the sponsor's own staff",
    ],
  });
}

/* the press: an interview record names the outlet, the candidate and the questions. */
for (const interview of order(
  rows("core2-press-v1", "interviews"),
  "press",
  (row) => row.id,
)) {
  const outlet = outlets.find((row) => row.id === interview.outletId);
  const reporter = realPerson(outlet?.reporterIds?.[0]);
  const asked = realPerson(interview.candidateId);
  const org = outlet
    ? core.organizations.get(outlet.organizationId)
    : undefined;
  const question = String(interview.questions?.[0] ?? "");
  const title = names[question];
  if (!outlet || !reporter || !asked || !org || !title || reporter === asked)
    continue;
  specs.push({
    typeKey: "press-interview",
    askerId: reporter,
    askedId: asked,
    facts: {
      name: fact(nameOf(reporter), [reporter]),
      first: fact(core.people.get(asked)!.givenName, [asked]),
      outlet: fact(properName(org.name), [org.id]),
      bill: fact(quoted(title), [interview.id]),
    },
    records: [interview.id, outlet.id, reporter, asked],
    standIn: [],
  });
}

/* ---------------------------------------------------- the sixteen new types */
/*
 * Facts these scenes supply, named as the catalog's stakes name them: bill,
 * what-happened, kid, job, deceased, cause, stake, event, crowd, office,
 * petition, minutes, story, tally, years, home, rent, plus name, first,
 * place, money, outlet, when. Each comes from a record named in the spec's
 * `records`; whatever is stood in is listed in its `standIn`.
 */
const ledgerMoments = (label: string) => {
  const found: { personId: string; moment: any }[] = [];
  for (const [personId, book] of world.director.ledger.people)
    for (const moment of book.moments)
      if (moment.label === label && core.people.get(personId)?.alive)
        found.push({ personId, moment });
  return order(found, label, (row) => row.moment.id);
};
const whenText = (iso: string) => spokenWhen(iso, core.date);
const firstName = (personId: string) => core.people.get(personId)!.givenName;
const newSpec = (
  typeKey: string,
  askerId: string,
  askedId: string,
  facts: Record<string, Fact>,
  records: string[],
  standIn: string[],
) => {
  if (askerId === askedId) return;
  specs.push({
    typeKey,
    askerId,
    askedId,
    facts: {
      name: fact(nameOf(askerId), [askerId]),
      first: fact(firstName(askedId), [askedId]),
      ...facts,
    },
    records,
    standIn,
  });
};
/** A bill from the bill table, for a scene that names one the record does not. */
const usedBills = new Set<string>();
const billFact = (seed: string): Record<string, Fact> => {
  // A bill no other scene on the page has named, while one is left (owner,
  // Oct 19: "why is it always the same two or three bills?").
  const ordered = order(titled, seed, (r) => r.bill.id);
  const row =
    ordered.find((r) => !usedBills.has(String(r.title))) ?? ordered[0];
  if (row) usedBills.add(String(row.title));
  return row ? { bill: fact(quoted(row.title), [row.bill.id]) } : {};
};
const aMember = (seed: string, not?: string) =>
  order(
    [...serving(board), ...bodies.flatMap((body) => serving(body))].filter(
      (row) => row.personId !== not,
    ),
    seed,
    (row) => row.personId,
  )[0];

// funeral: a death on a mourner's ledger and a housemate who is alive.
for (const { personId, moment } of ledgerMoments("feeling:event:life.death")) {
  const dead = moment.counterpartIds[0];
  const relation = (core.people.get(personId)!.pastFacts ?? []).find(
    (row: any) =>
      row.kind.startsWith("family:") && row.facts?.otherPersonId === dead,
  );
  const person = core.people.get(personId)!;
  const kin =
    relatives(personId)[0] ??
    [...person.familyIds]
      .sort()
      .find((id) => id !== dead && core.people.get(id)?.alive) ??
    [...person.knownIds]
      .sort()
      .find((id) => id !== dead && core.people.get(id)?.alive);
  if (!dead || !kin || !core.people.get(dead)) continue;
  void relation;
  newSpec(
    "funeral",
    kin,
    personId,
    {
      deceased: fact(nameOf(dead), [dead, moment.id]),
      when: fact(whenText(moment.date), [moment.id]),
    },
    [moment.id, moment.causeId, dead, kin, personId],
    [
      "the death is the mourner's recorded moment; the asker is a housemate who is alive",
      "the death record names no cause, so `cause` is left out",
    ],
  );
  break;
}

// layoff: a job that ended, and someone still employed where it ended.
for (const { personId, moment } of ledgerMoments("money:job-ended")) {
  const job = core.jobs.get(moment.causeId);
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (!job || !org) continue;
  const colleague = [...(core.finance.jobsByOrganization.get(org.id) ?? [])]
    .map((jobId: string) => core.jobs.get(jobId)!)
    .filter((row: any) => row.endsAt === undefined && row.personId !== personId)
    .map((row: any) => row.personId as string)
    .sort()[0];
  if (!colleague || !core.people.get(colleague)?.alive) continue;
  const years = (job as any).startedAt
    ? Math.max(
        1,
        Number(core.date.slice(0, 4)) -
          Number(String((job as any).startedAt).slice(0, 4)),
      )
    : undefined;
  newSpec(
    "layoff",
    colleague,
    personId,
    {
      job: fact(properName(org.name), [org.id, job.id]),
      employer: fact(properName(org.name), [org.id, job.id]),
      when: fact(whenText(moment.date), [moment.id]),
      ...(years ? { years: fact(String(years), [job.id]) } : {}),
    },
    [moment.id, job.id, org.id, colleague, personId],
    [
      "the asker is someone still employed where the job ended; no boss record exists",
    ],
  );
  break;
}

// eviction notice: a household's eviction record, told by a housemate.
for (const { personId, moment } of ledgerMoments(
  "feeling:event:housing.eviction",
)) {
  const kin = relatives(personId)[0];
  const town = townOf(personId);
  if (!kin || !town) continue;
  const household = core.people.get(personId)!.householdId;
  const dwelling = rows("housing", "dwellings").find(
    (row) => row.householdId === household,
  );
  const lease = rows("housing", "renewals").find(
    (row) => row.id === `lease:${household}`,
  );
  newSpec(
    "eviction-notice",
    kin,
    personId,
    {
      place: fact(town.text, [town.id]),
      when: fact(whenText(moment.date), [moment.id]),
      ...(dwelling
        ? {
            home: fact(String(dwelling.kind).replace(/-/g, " "), [dwelling.id]),
          }
        : {}),
      ...(lease
        ? {
            rent: fact(`$${Math.round(lease.rentMinor / 100)} a month`, [
              lease.id,
            ]),
          }
        : {}),
    },
    [moment.id, moment.causeId, kin, personId],
    [
      "the notice is the household's eviction record, told by a housemate; no landlord person exists",
    ],
  );
  break;
}

// scandal: a reporter's remark on a member's bill.
const remarks = rows("core2-meetings-v1", "remarks");
const outletsByReporter = new Map<string, any>();
for (const outlet of rows("core2-press-v1", "outlets"))
  for (const reporter of outlet.reporterIds ?? [])
    outletsByReporter.set(reporter, outlet);
for (const remark of order(remarks, "remark", (row) => row.id)) {
  const reporter = realPerson(remark.personId);
  // The reporter's id names the outlet: person:press:<outlet id>:reporter:<n>.
  const outlet =
    outletsByReporter.get(remark.personId) ??
    rows("core2-press-v1", "outlets").find(
      (row) =>
        row.id ===
        String(remark.personId)
          .replace(/^person:press:/, "")
          .replace(/:(reporter|head|owner):\d+$/, ""),
    );
  const bill = bills.find((row) => row.id === remark.billId);
  const sponsor = bill ? realPerson(bill.sponsorId) : undefined;
  const title = bill ? titleOf(bill) : undefined;
  const org = outlet
    ? core.organizations.get(outlet.organizationId)
    : undefined;
  if (!reporter || !sponsor || !title || !org) continue;
  newSpec(
    "scandal",
    reporter,
    sponsor,
    {
      outlet: fact(properName(org.name), [org.id]),
      bill: fact(quoted(title), [bill.id]),
      story: fact(`the "${title}" bill`, [remark.id, bill.id]),
    },
    [remark.id, bill.id, outlet.id, reporter, sponsor],
    [
      "the reporter's remark on the bill is the record; the scandal itself is staged on the sponsor's bill",
    ],
  );
  break;
}

// recall: a resident asks a board member (no petition record exists).
{
  const member = aMember("recall");
  const resident = order(
    [...core.people.values()].filter(
      (row: any) =>
        citizen(row.id) &&
        row.id !== member?.personId &&
        row.placeId === core.people.get(member?.personId ?? "")?.placeId,
    ),
    "recall-resident",
    (row: any) => row.id,
  )[0] as any;
  if (member && resident)
    newSpec(
      "recall",
      resident.id,
      member.personId,
      {
        office: fact(
          officeName({
            officeId: member.term.officeId,
            title: offices.get(member.term.officeId)?.title,
          }),
          [member.term.id],
        ),
        petition: fact("the recall petition", [member.term.id]),
        ...(() => {
          const voted =
            titled.find(
              (row) => realPerson(row.bill.sponsorId) === member.personId,
            ) ?? order(titled, "recall-bill", (row) => row.bill.id)[0];
          return voted
            ? { bill: fact(quoted(voted.title), [voted.bill.id]) }
            : {};
        })(),
      },
      [member.term.id, resident.id, member.personId],
      [
        "no recall petition record exists in this world, so a resident stands in as the petitioner",
      ],
    );
}

// public hearing: a town hall a member held, and a resident who attended.
for (const hall of order(
  rows("core2-meetings-v1", "townHalls"),
  "hall",
  (row) => row.id,
)) {
  const host = realPerson(hall.hostId);
  const guest = (hall.attendeeIds ?? [])
    .map((x: string) => realPerson(x))
    .find((x: string | undefined) => x && x !== host && citizen(x));
  const billFacts = billFact("hearing");
  if (!host || !guest || !billFacts.bill) continue;
  newSpec(
    "public-hearing",
    host,
    guest,
    {
      ...billFacts,
      self: fact(nameOf(guest), [guest]),
      ...(townOf(guest)
        ? { place: fact(townOf(guest)!.text, [townOf(guest)!.id]) }
        : {}),
    },
    [hall.id, ...billFacts.bill.sourceRecordIds, host, guest],
    [
      "the hearing is a recorded town hall; the bill on the agenda is chosen from the bill table",
      "no speaking-time record exists, so `minutes` is left out",
    ],
  );
  break;
}

/** What a law made a person do, as people say it: "have to", not "must" (owner, Oct 19). */
const spokenWhat = (what: string) =>
  what
    .replace(/^must not\b/, "can't")
    .replace(/^must\b/, "have to")
    .replace(/^cannot\b/, "can't")
    .replace(/^may\b/, "can");
// law takes effect: a person a law reached, told by a member. The reach record
// says what the law did for that person ("may buy cannabis from a licensed retailer").
const reaches = order(
  rows("core2-law-reach-a-v1", "reach").flatMap((reach) => {
    const affected = realPerson(reach.targetId);
    const title = names[String(reach.key)];
    const what = String(reach.what ?? "");
    if (
      !affected ||
      !citizen(affected) ||
      !title ||
      !/^(may|must|can|cannot)\b/.test(what)
    )
      return [];
    return [{ reach, affected, title, what }];
  }),
  "reach-a",
  (row) => row.reach.id,
);
for (const row of reaches.slice(0, 1)) {
  const member = aMember("law");
  if (!member) break;
  newSpec(
    "law-takes-effect",
    member.personId,
    row.affected,
    {
      bill: fact(quoted(row.title), [row.reach.id, row.reach.lawId]),
      effect: fact(`I ${spokenWhat(row.what)}`, [row.reach.id]),
    },
    [row.reach.id, row.reach.lawId, row.affected, member.personId],
    [
      "a member stands as the person who tells; the law and what it did for the person are the law-reach record's",
    ],
  );
}
// argument: a person a law reached confronts a member who voted for it, in
// public. What it changed is said only when it is a burden ("must", "cannot"),
// and only someone whose own view is against the law complains (owner, Oct
// 19: a city attorney would not care about a photo ID); the strongest view first.
const opposed = reaches
  .slice(1)
  .map((row) => ({
    row,
    stance: stanceOn(row.affected, String(row.reach.key)),
  }))
  .filter((x) => x.stance?.desiredChange === "repeal")
  .sort((a, b) => b.stance!.strength - a.stance!.strength)
  .map((x) => x.row);
/**
 * What turned a person against (or for) something, as slot facts from the
 * view's strongest cause: a story in a named outlet, a speech someone retold
 * to them, a campaign's message (owner, Oct 19: memories come into effect).
 */
const memoryFacts = (
  stance: ReturnType<typeof stanceOn>,
): Record<string, Fact> => {
  const cause = [...(stance?.causes ?? [])].sort(
    (a, b) => Math.abs(b.change) - Math.abs(a.change),
  )[0];
  if (!cause) return {};
  const outletId = /outlet:[a-z-]+:\d+:[^:]+/.exec(cause.eventId)?.[0];
  const outlet = outletId
    ? outlets.find((row) => row.id === outletId)
    : undefined;
  const org = outlet
    ? core.organizations.get(outlet.organizationId)
    : undefined;
  if (cause.eventId.startsWith("news.read") && org)
    return { outlet: fact(properName(org.name), [cause.eventId, org.id]) };
  const teller = /:retold:([^:]+)$/.exec(cause.eventId)?.[1];
  if (teller && core.people.has(teller))
    return { teller: fact(nameOf(teller), [cause.eventId, teller]) };
  const campaigner = cause.eventId.startsWith("campaign-message")
    ? realPerson(cause.speakerId)
    : undefined;
  if (campaigner)
    return {
      campaigner: fact(nameOf(campaigner), [cause.eventId, campaigner]),
    };
  return {};
};
for (const row of opposed) {
  const neighbor = aMember(`argument:${row.reach.id}`, row.affected);
  if (!neighbor) continue;
  // An argument needs a burden to argue about; a permission is not one.
  const burden = /^(must|cannot)\b/.test(row.what);
  if (!burden) continue;
  newSpec(
    "argument",
    row.affected,
    neighbor.personId,
    {
      bill: fact(quoted(row.title), [row.reach.id, row.reach.lawId]),
      ...(burden
        ? { effect: fact(`I ${spokenWhat(row.what)}`, [row.reach.id]) }
        : {}),
      ...memoryFacts(stanceOn(row.affected, String(row.reach.key))),
    },
    [row.reach.id, row.reach.lawId, neighbor.personId, row.affected],
    [
      "a member stands as the one who voted for it; the law and whom it reached are the law-reach record's",
    ],
  );
  break;
}

// the votes: a sponsor, a member who voted no, and the bill, one pair for each type.
{
  const tuples = order(
    rows("core2-legislature-v1", "votes").flatMap((vote) => {
      const billRow = titled.find((row) => row.bill.id === vote.billId);
      const voter = realPerson(vote.memberId);
      const sponsor = billRow ? realPerson(billRow.bill.sponsorId) : undefined;
      if (
        !billRow ||
        !voter ||
        !sponsor ||
        voter === sponsor ||
        vote.vote !== "no"
      )
        return [];
      return [{ vote, billRow, voter, sponsor }];
    }),
    "tuples",
    (row) => row.vote.id,
  );
  const usedPairs = new Set<string>();
  const next = () => {
    const row = tuples.find(
      (t) => !usedPairs.has(t.voter) && !usedPairs.has(t.sponsor),
    );
    if (row) {
      usedPairs.add(row.voter);
      usedPairs.add(row.sponsor);
    }
    return row;
  };
  for (const typeKey of [
    "betrayal",
    "floor-vote",
    "accusation",
    "apology",
    "reconciliation",
  ]) {
    const row = next();
    if (!row) continue;
    const counts = voteCount(row.billRow.bill);
    const bill = fact(quoted(row.billRow.title), [row.billRow.bill.id]);
    const happened = fact(`your vote on ${quoted(row.billRow.title)}`, [
      row.vote.id,
      row.billRow.bill.id,
    ]);
    const tally = counts
      ? fact(
          `${counts.votes.text} to ${Number(counts.needed.text) * 2 - 1 - Number(counts.votes.text)}`,
          [...counts.votes.sourceRecordIds],
        )
      : undefined;
    const seat = row.voter;
    const stake = fact(
      `your seat on the ${officeName({ officeId: serving(board).find((m) => m.personId === seat)?.term.officeId ?? board, title: "board" }).toLowerCase()}`,
      [row.vote.id],
    );
    const [askerId, askedId] =
      typeKey === "apology"
        ? [row.sponsor, row.voter]
        : typeKey === "argument"
          ? [row.sponsor, row.voter]
          : [row.sponsor, row.voter];
    newSpec(
      typeKey,
      askerId,
      askedId,
      {
        bill,
        "what-happened": happened,
        ...(tally ? { tally } : {}),
        ...(typeKey === "accusation" ? { stake } : {}),
        ...(counts ?? {}),
      },
      [row.vote.id, row.billRow.bill.id, row.sponsor, row.voter],
      [
        "the recorded no vote on the sponsor's bill is the record; the promise or insult it answers is not on record",
        ...(typeKey === "floor-vote" ? [SEAT] : []),
      ],
    );
  }
}

/** A post as people say it: one name, lowercase ("finance secretary", not "Budget Director / Finance Secretary"; owner, Oct 19). */
const spokenPost = (title: unknown) =>
  String(title).split(" / ").at(-1)!.trim().toLowerCase();
// appointment: an appointment the executive made, offered by a staffer in
// the appointer's office (the appointer is named by post: "the mayor").
const postOf = (personId: string) => {
  const term = terms.find(
    (row) => row.status === "serving" && realPerson(row.personId) === personId,
  );
  const title = term ? offices.get(term.officeId)?.title : undefined;
  return term && title ? { term, title: spokenPost(title) } : undefined;
};
for (const row of order(
  rows("core2-executive-v1", "appointments"),
  "appoint",
  (r) => r.id,
)) {
  const appointer = realPerson(row.appointedBy);
  const holder = realPerson(row.holderId);
  const post = appointer ? postOf(appointer) : undefined;
  // Only an executive appoints (a governor, a mayor, a county executive).
  if (!post || !/governor|mayor|executive|manager/.test(post.title)) continue;
  const aide = staff.find(
    (s) =>
      realPerson(s.officialId) === appointer &&
      core.people.has(s.personId) &&
      s.personId !== holder,
  );
  // The post is filled already, so the one offered it is a member who does
  // not hold it (a stand-in for the player being asked).
  const offered = aMember(`appointee:${row.id}`, appointer);
  if (!appointer || !aide || !offered || offered.personId === holder) continue;
  newSpec(
    "appointment",
    aide.personId,
    offered.personId,
    {
      office: fact(spokenPost(row.title), [row.id]),
      executive: fact(post.title, [post.term.id]),
      ...billFact("appointment"),
    },
    [row.id, aide.id, appointer, offered.personId],
    [
      "the appointment is the executive's record and the caller is on the executive's staff; a member stands in as the one offered the post, and a bill from the bill table as the vote that drew the executive's eye",
    ],
  );
  break;
}
if (!specs.some((spec) => spec.typeKey === "appointment")) {
  const appointment = rows("core2-executive-v1", "appointments")[0];
  const appointer = aMember("appointer");
  const appointee = aMember("appointee", appointer?.personId);
  if (appointment && appointer && appointee)
    newSpec(
      "appointment",
      appointer.personId,
      appointee.personId,
      {
        office: fact(spokenPost(appointment.title), [appointment.id]),
        executive: fact("governor", [appointment.id]),
        ...billFact("appointment"),
      },
      [appointment.id, appointer.personId, appointee.personId],
      [
        "no appointer in this world has staff on record, so a member stands in as the governor's caller and another as the appointee",
      ],
    );
}

// reach-out: a neighbor asks a worker for a job for a young person in their household.
{
  const kid = order(
    [...core.people.values()].filter((row: any) => {
      const age = ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date));
      return (
        row.alive &&
        age >= 16 &&
        age < 25 &&
        !row.jobId &&
        relatives(row.id).length
      );
    }),
    "kid",
    (row: any) => row.id,
  )[0] as any;
  const parent = kid ? relatives(kid.id)[0] : undefined;
  const worker = order(
    [...core.people.values()].filter(
      (row: any) =>
        row.alive && row.jobId && row.householdId !== kid?.householdId,
    ),
    "worker",
    (row: any) => row.id,
  )[0] as any;
  const org = worker
    ? core.organizations.get(core.jobs.get(worker.jobId)!.organizationId)
    : undefined;
  if (kid && parent && worker && org)
    newSpec(
      "reach-out",
      parent,
      worker.id,
      {
        kid: fact(kid.givenName, [kid.id]),
        job: fact(properName(org.name), [org.id, worker.jobId]),
      },
      [kid.id, parent, worker.id, org.id],
      [
        "the young person is out of work on record; that the parent asks this worker is staged",
      ],
    );
}

// warning: the sheriff warns a member who held a town hall of the crowd it drew.
for (const hall of order(
  rows("core2-meetings-v1", "townHalls"),
  "warn-hall",
  (row) => row.id,
)) {
  const host = realPerson(hall.hostId);
  const sheriff = serving("office:gus2025:101811:sheriff")[0];
  if (!host || !sheriff || sheriff.personId === host) continue;
  newSpec(
    "warning",
    sheriff.personId,
    host,
    {
      event: fact(`the town hall on ${whenText(hall.date)}`, [hall.id]),
      crowd: fact(`${(hall.attendeeIds ?? []).length} people`, [hall.id]),
      office: fact("county sheriff", [sheriff.term.id]),
    },
    [hall.id, sheriff.term.id, host],
    [
      "the town hall is the record; that the sheriff warns its host about the crowd is staged",
    ],
  );
  break;
}

/* ----------------------------------------------- the eight of batch 17 */
// first day, last day: a job started or left, and someone who works there.
for (const [typeKey, label] of [
  ["first-day", "money:job-started"],
  ["last-day", "money:job-left"],
] as const) {
  for (const { personId, moment } of ledgerMoments(label)) {
    const job = core.jobs.get(moment.causeId);
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    if (!job || !org) continue;
    const colleague = [...(core.finance.jobsByOrganization.get(org.id) ?? [])]
      .map((jobId: string) => core.jobs.get(jobId)!)
      .filter(
        (row: any) => row.endsAt === undefined && row.personId !== personId,
      )
      .map((row: any) => row.personId as string)
      .sort()[0];
    if (!colleague || !core.people.get(colleague)?.alive) continue;
    const [askerId, askedId] = [colleague, personId];
    newSpec(
      typeKey,
      askerId,
      askedId,
      {
        // "the Town of Briarcliffe Acres treasury", not "Town of ... treasury".
        office: fact(
          /\s[a-z]/.test(properName(org.name))
            ? `the ${properName(org.name)}`
            : properName(org.name),
          [org.id, job.id],
        ),
        when: fact(whenText(moment.date), [moment.id]),
      },
      [moment.id, job.id, org.id, askerId, askedId],
      [
        `the ${typeKey === "first-day" ? "start" : "leaving"} is the person's recorded moment; the asker is someone who works where it happened (no manager record exists)`,
      ],
    );
    break;
  }
}

// race results: the winner and a loser of a contest, with their supporters.
{
  const closeRaces = rows("core2-voting-v1", "results").filter(
    (row) => Object.keys(row.totals ?? {}).length > 1,
  );
  const results17 = order(
    closeRaces.length ? closeRaces : results,
    "race17",
    (row) => row.id,
  );
  // Someone the candidate knows runs the campaign; a stranger only when
  // nobody they know is in the world (owner, Oct 19: the context must fit).
  const supporterOf = (personId: string) =>
    order(
      [
        ...(core.people.get(personId)?.knownIds ?? []),
        ...(core.people.get(personId)?.familyIds ?? []),
        ...relatives(personId),
      ].filter(
        (id) => id !== personId && citizen(id) && core.people.get(id)?.alive,
      ),
      "supporter",
      (x) => x,
    )[0] ??
    order(
      [
        ...[...core.people.values()]
          .filter(
            (row: any) =>
              row.tier !== "husk" &&
              row.placeId === core.people.get(personId)?.placeId,
          )
          .map((row: any) => row.id as string),
      ].filter((id) => id !== personId && core.people.get(id)?.alive),
      "supporter",
      (x) => x,
    )[0];
  for (const result of results17) {
    const contest = contests.get(result.contestId);
    const winner = realPerson(result.winnerId);
    const loserIds = Object.keys(result.totals ?? {}).filter(
      (c) => c !== result.winnerId,
    );
    const loser = loserIds.map(realPerson).find((x): x is string => !!x);
    if (!contest || !winner) continue;
    const office = fact(officeName(contest), [contest.id]);
    if (!specs.some((spec) => spec.typeKey === "race-won")) {
      const supporter = supporterOf(winner);
      const other =
        loser ??
        realPerson(
          filings.find(
            (f) =>
              f.contestId === contest.id && realPerson(f.personId) !== winner,
          )?.personId,
        );
      if (supporter && other)
        newSpec(
          "race-won",
          supporter,
          winner,
          { office, opponent: fact(nameOf(other), [result.id, other]) },
          [result.id, contest.id, supporter, winner, other],
          [
            "the result is the voting engine's; the supporter is someone the winner knows",
          ],
        );
    }
    if (!specs.some((spec) => spec.typeKey === "race-lost")) {
      const standIn =
        loser ??
        realPerson(
          filings.find(
            (f) => realPerson(f.personId) && realPerson(f.personId) !== winner,
          )?.personId,
        );
      const supporter = standIn ? supporterOf(standIn) : undefined;
      if (standIn && supporter)
        newSpec(
          "race-lost",
          supporter,
          standIn,
          { office, opponent: fact(nameOf(winner), [result.id, winner]) },
          [result.id, contest.id, supporter, standIn, winner],
          [
            loser
              ? "the result is the voting engine's; the supporter is someone the loser knows"
              : "no loser of this result is a person in the world, so another candidate stands in for the loser; the race and its winner are the result's",
          ],
        );
    }
    if (
      specs.some((spec) => spec.typeKey === "race-won") &&
      specs.some((spec) => spec.typeKey === "race-lost")
    )
      break;
  }
}

// signing and vetoes: the desk record names the executive, the bill and its sponsor.
for (const [typeKey, status] of [
  ["bill-signed", "signed"],
  ["veto", "vetoed"],
] as const) {
  for (const desk of order(
    rows("core2-executive-v1", "desk").filter((row) => row.status === status),
    typeKey,
    (row) => row.id,
  )) {
    const billRow = titled.find((row) => row.bill.id === desk.billId);
    const executive = realPerson(desk.executiveId);
    const sponsor =
      (billRow ? realPerson(billRow.bill.sponsorId) : undefined) ??
      aMember(typeKey)?.personId;
    if (!billRow || !executive || !sponsor || executive === sponsor) continue;
    // Who the executive is, as people call them ("the governor", "the mayor").
    const term =
      termsById.get(desk.executiveId) ??
      terms.find(
        (row) =>
          row.status === "serving" && realPerson(row.personId) === executive,
      );
    const post = term ? offices.get(term.officeId)?.title : undefined;
    if (!post) continue;
    usedBills.add(String(billRow.title));
    newSpec(
      typeKey,
      executive,
      sponsor,
      {
        bill: fact(quoted(billRow.title), [billRow.bill.id]),
        executive: fact(spokenPost(post), [term.id]),
      },
      [desk.id, billRow.bill.id, executive, sponsor],
      [
        sponsor === realPerson(billRow.bill.sponsorId)
          ? "the desk record is the executive's; the sponsor is the bill's sponsor"
          : "the desk record is the executive's; the bill's sponsor is not a person in the world, so a member stands in",
      ],
    );
    break;
  }
}

// polling place: a voter and a stand-in poll worker (the polling-place record names no workers).
{
  const place = rows("core2-voting-v1", "pollingPlaces")[0];
  // The voter is an adult; a candidate on record where one lives here, so
  // "I'm on the ballot" is only said by someone who filed.
  const residents = [...core.people.values()].filter(
    (row: any) => row.placeId === place?.placeId && citizen(row.id),
  );
  const filers = new Set(
    filings.map((f) => realPerson(f.personId)).filter(Boolean),
  );
  const voter = (order(
    residents.filter((row: any) => filers.has(row.id)),
    "voter",
    (row: any) => row.id,
  )[0] ?? order(residents, "voter", (row: any) => row.id)[0]) as any;
  const filed = voter
    ? filings.find((f) => realPerson(f.personId) === voter.id)
    : undefined;
  const worker = order(
    residents.filter((row: any) => row.id !== voter?.id),
    "worker17",
    (row: any) => row.id,
  )[0] as any;
  const town = voter ? townOf(voter.id) : undefined;
  if (place && voter && worker && town)
    newSpec(
      "polling-place",
      worker.id,
      voter.id,
      {
        place: fact(`the polling place in ${town.text}`, [place.id, town.id]),
        ...(filed ? { candidate: fact(nameOf(voter.id), [filed.id]) } : {}),
      },
      [place.id, worker.id, voter.id],
      [
        "the polling place is the voting engine's; it records no poll workers, so a resident stands in as one",
      ],
    );
}

// advice: a member advises someone they know who is deciding about running.
{
  const adviser = aMember("advice");
  const deciding = adviser
    ? order(
        [
          ...(core.people.get(adviser.personId)?.knownIds ?? []),
          ...(core.people.get(adviser.personId)?.familyIds ?? []),
          ...[...core.people.values()]
            .filter(
              (row: any) =>
                row.tier !== "husk" &&
                row.placeId === core.people.get(adviser.personId)?.placeId,
            )
            .map((row: any) => row.id as string),
        ].filter((id) => citizen(id) && id !== adviser.personId),
        "deciding",
        (x) => x,
      )[0]
    : undefined;
  if (adviser && deciding)
    newSpec(
      "advice",
      adviser.personId,
      deciding,
      {
        office: fact(
          officeName({
            officeId: adviser.term.officeId,
            title: offices.get(adviser.term.officeId)?.title,
          }),
          [adviser.term.id],
        ),
      },
      [adviser.term.id, adviser.personId, deciding],
      [
        "no mentorship record exists in this world, so a member advises someone they know",
      ],
    );
}

/* ------------------------------------------------- the new ones of batch 18 */
// filing: a candidate files where the place files, and the clerk on record
// has already taken a rival's filing for the same race.
for (const filing of order(filings, "filing18", (row) => row.id)) {
  const candidate = realPerson(filing.personId);
  const contest = contests.get(filing.contestId);
  const rival = filings
    .filter(
      (row) =>
        row.contestId === filing.contestId &&
        row.personId !== filing.personId &&
        row.filedOn <= filing.filedOn &&
        // In this cycle: a filing within a season of this one, not an old one.
        Date.parse(filing.filedOn) - Date.parse(row.filedOn) <=
          120 * 86_400_000 &&
        realPerson(row.personId),
    )
    .sort((a, b) => a.filedOn.localeCompare(b.filedOn))[0];
  if (!candidate || !contest || !rival || !filing.filedWith) continue;
  // A world cached before the executive's agency table existed cannot name a
  // state's election chief; the clerk is then stood in.
  let clerk: ReturnType<typeof filingClerkFor> = null;
  try {
    clerk = filingClerkFor(api, filing.contestId);
  } catch {
    clerk = null;
  }
  const clerkId = clerk ? realPerson(clerk.personId) : undefined;
  const standIn = clerkId
    ? undefined
    : order(
        [...core.people.values()].filter(
          (row: any) =>
            citizen(row.id) &&
            row.id !== candidate &&
            row.placeId === core.people.get(candidate)?.placeId,
        ),
        "clerk18",
        (row: any) => row.id,
      )[0]?.id;
  const asker = clerkId ?? standIn;
  if (!asker || asker === candidate) continue;
  const opponent = realPerson(rival.personId)!;
  newSpec(
    "filing",
    asker,
    candidate,
    {
      office: fact(officeName(contest), [contest.id]),
      where: fact(String(filing.filedWith), [filing.id]),
      opponent: fact(nameOf(opponent), [rival.id, opponent]),
      // Said on the day the candidate files, so "this morning", "last week".
      when: fact(spokenWhen(rival.filedOn, filing.filedOn), [rival.id]),
    },
    [filing.id, rival.id, contest.id, asker, candidate, opponent],
    [
      clerkId
        ? "the filing and the rival's filing are the elections engine's; the clerk is the one the records name for this race"
        : "the filing and the rival's filing are the elections engine's; the records name no clerk for this race, so a resident stands in",
    ],
  );
  break;
}

// care: someone seriously ill (the health engine's onset event) asks a
// relative who visits to tell another relative.
for (const event of order(
  [...core.durableLog.values()].filter(
    (row: any) => row.kind === "health.serious-illness",
  ),
  "care18",
  (row: any) => row.id,
) as any[]) {
  const ill = realPerson(event.personIds?.[0]);
  if (!ill || !core.people.get(ill)?.alive) continue;
  const [visitor, relative] = order(
    [
      ...new Set([
        ...(core.people.get(ill)!.familyIds ?? []),
        ...relatives(ill),
      ]),
    ].filter((id) => id !== ill && core.people.get(id)?.alive),
    "care18",
    (x) => x,
  );
  if (!visitor || !relative) continue;
  newSpec(
    "care",
    ill,
    visitor,
    { relative: fact(nameOf(relative), [relative]) },
    [event.id, ill, visitor, relative],
    [
      "the illness is the health engine's onset record; the visitor and the one still to be told are both in the ill person's family",
    ],
  );
  break;
}

// a new baby: someone close to the new parent comes by.
for (const { personId, moment } of ledgerMoments(
  "feeling:event:person-birth",
)) {
  const kid = moment.counterpartIds
    .map((id: string) => core.people.get(id))
    .find(
      (row: any) =>
        row?.alive &&
        ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) < 2,
    );
  if (!kid) continue;
  const visitor = order(
    [
      ...(core.people.get(personId)!.familyIds ?? []),
      ...core.people.get(personId)!.knownIds,
    ].filter(
      (id) =>
        id !== personId &&
        id !== kid.id &&
        !relatives(personId).includes(id) &&
        core.people.get(id)?.alive,
    ),
    "baby18",
    (x) => x,
  )[0];
  if (!visitor) continue;
  newSpec(
    "new-baby",
    visitor,
    personId,
    { kid: fact(kid.givenName, [kid.id]) },
    [moment.id, kid.id, visitor, personId],
    [
      "the birth is the people engine's record; the visitor is family or someone the parent knows, outside the household",
    ],
  );
  break;
}

/* ------------------------------------------------- the new ones of batch 19 */
// a cause shared: the one who shared it asks the other to come along.
for (const { personId, moment } of ledgerMoments(
  "feeling:event:cause.shared",
)) {
  const recruiter = moment.counterpartIds[0];
  const topic = /cause:(us-policy-positions:[a-z-]+\.[a-z0-9-]+)/.exec(
    moment.causeId,
  )?.[1];
  if (!recruiter || !topic || !names[topic]) continue;
  if (!citizen(personId) || !citizen(recruiter)) continue;
  const theirs = stanceOn(recruiter, topic);
  const mine = stanceOn(personId, topic);
  newSpec(
    "cause-invite",
    recruiter,
    personId,
    {
      cause: fact(quoted(names[topic]!), [moment.causeId]),
      ...(mine && theirs && mine.desiredChange !== theirs.desiredChange
        ? { asked_against: flag([mine.id]) }
        : {}),
    },
    [moment.id, moment.causeId, recruiter, personId],
    [
      "the shared cause is the views engine's record; who shared it and with whom are its own",
    ],
  );
  break;
}

/* --------------------------------------------------------------- compose */

const library = (situationFile as any).types as any[];
const typeOf = new Map(library.map((row) => [row.key, row]));
// The sixteen purposes of batch 15; `--types new` stages the other purpose types.
const BATCH_15 = new Set([
  "ask-vote",
  "confirm-vote",
  "carry-bill",
  "donor-ask",
  "party-ask",
  "press-comment",
  "constituent-help",
  "family-filing",
  "family-win",
  "family-loss",
  "family-absence",
  "rally-volunteer",
  "rally-opponent",
  "desk-bill",
  "staff-news",
  "section-bargain",
]);
const typesOption = option("types", "all");
const purposeTypes = library
  .filter((row) => row.purpose)
  .filter((row) =>
    typesOption === "all"
      ? true
      : typesOption === "new"
        ? !BATCH_15.has(row.purpose as string)
        : typesOption.split(",").includes(row.key as string),
  )
  .map((row) => row.key as string);

// Situations the director fires with no purpose play their key's generic arc
// ("fallback"). Up to `--fallback` of them, each of a different type.
const fallbackWanted = Number(
  option("fallback", typesOption === "new" ? "6" : "0"),
);
const fallbackKeys: string[] = [];
if (fallbackWanted > 0) {
  const noPurpose = new Set(
    library.filter((row) => !row.purpose).map((row) => row.key as string),
  );
  for (const row of directorStaged(cache)) {
    if (fallbackKeys.length >= fallbackWanted) break;
    if (!noPurpose.has(row.typeKey) || !row.talkToId) continue;
    const asker = row.talkToId;
    const asked = row.personId;
    if (asker === asked || !core.people.get(asker) || !core.people.get(asked))
      continue;
    const town = townOf(asked);
    const job = core.jobs.get(row.causeId);
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    const dead =
      row.label === "feeling:event:life.death"
        ? row.counterpartIds[0]
        : undefined;
    newSpec(
      row.typeKey,
      asker,
      asked,
      {
        ...(town ? { place: fact(town.text, [town.id]) } : {}),
        when: fact(whenText(row.date), [row.momentId]),
        ...(org ? { employer: fact(properName(org.name), [org.id]) } : {}),
        ...(dead && core.people.get(dead)
          ? { deceased: fact(nameOf(dead), [dead]) }
          : {}),
      },
      [row.momentId, row.causeId, asker, asked],
      [
        `fallback: the director fired ${row.typeKey} from ${row.label}; no purpose or authored pieces exist for it, so it plays the generic arc for its key`,
      ],
    );
    fallbackKeys.push(row.typeKey);
  }
}

interface ComposedScene {
  /** Who tells the asker the truth, where a caught lie is staged. */
  sourceText?: string;
  i: number;
  typeKey: string;
  key: string;
  endpoint: string;
  purpose: string;
  askerId: string;
  askedId: string;
  records: string[];
  standIn: string[];
  why?: string[];
  asOf?: string;
  /** One entry per kept profile: its lines (narration first). */
  variants: {
    profile: GradingProfile;
    lines: LineRow[];
    outcome: string;
    talk: any;
  }[];
}

const toRow = (
  line: SceneTalkLine,
  profile: GradingProfile,
  previous?: string,
): LineRow => {
  const role =
    line.role === "narrator"
      ? "narrator"
      : line.role === "asker"
        ? "speaker"
        : "reply";
  return {
    n: line.n,
    turn: line.round,
    role: role as LineRow["role"],
    speaker: line.speaker,
    text: line.text,
    move: line.move,
    ...(previous ? { previousMove: previous } : {}),
    register: line.register,
    ...(line.bearing ? { bearing: line.bearing } : {}),
    key: line.key,
    endpoint: "",
    speakerTraits: line.role === "narrator" ? {} : profile.traits,
    lie: false,
    words: wordCount(line.text),
    sentences: sentenceCount(line.text),
    parts: line.parts,
    slotRecordIds: line.slotRecordIds,
    // The step, round and whether the page follows this reply ride along.
    ...({
      step: line.step,
      round: line.round,
      chosen: !!line.chosen,
      purpose: line.purpose,
    } as object),
  } as LineRow;
};

/** A node as the coordinator's tree format has it: the words and the piece that said them. */
const slim = (node: any, source?: string): any => ({
  // The asker's closing line belongs to the end node: the page shows it last.
  lines: [...node.lines, ...(node.end?.close ? [node.end.close] : [])].map(
    (l: SceneTalkLine) => ({
      speaker: l.speaker,
      text: l.text,
      pieceKey: l.parts[0],
      ...(l.auto ? { auto: true } : {}),
    }),
  ),
  replies: node.replies.map((r: any) => ({
    line: {
      text: r.line.text,
      pieceKey: r.line.parts[0],
      move: r.line.move,
      ...(r.line.tag ? { tag: r.line.tag } : {}),
    },
    next: r.next ? slim(r.next, source) : null,
  })),
  ...(node.branches
    ? {
        branches: node.branches.map((b: any) => ({
          label: b.label,
          knows: b.knows,
          // Where a caught lie's knowledge comes from, as the staging names it.
          ...(b.knows && source ? { source } : {}),
          node: slim(b.node, source),
        })),
      }
    : {}),
  ...(node.end
    ? {
        end: {
          outcome: node.end.outcome,
          ...(node.end.ending ? { ending: node.end.ending } : {}),
        },
      }
    : {}),
});

/* ----------------------------------------------------------------- batch */

const pageUsage = new Map<string, number>();
// The people already cited as a caught lie's source on this page.
const usedSources = new Set<string>();
const SETUP_STEPS = ["narrate", "open", "state"];
const skippedTypes: { typeKey: string; reason: string }[] = [];
const dropped = { sameCast: 0, identicalProfile: 0, composeSkipped: 0 };
const candidatesPerType = Number(option("candidates", "8"));

/** Problems a finished page may not have (batch 15: no rough output). */
const problems: string[] = [];

/** Every text on each path from the root to an end, to find a line said twice in one talk. */
function repeatsOnPaths(talk: any): string[] {
  const found: string[] = [];
  const head: string[] = [
    ...talk.narration.map((l: SceneTalkLine) => l.text),
    ...(talk.open ? [talk.open.text] : []),
    ...talk.intro.map((l: SceneTalkLine) => l.text),
    talk.state.text,
  ];
  const walk = (node: any, seen: string[]) => {
    let here = [...seen];
    const add = (text: string) => {
      if (here.includes(text)) found.push(text);
      here = [...here, text];
    };
    for (const l of node.lines) add(l.text);
    for (const r of node.replies) {
      const afterReply = [...here, r.line.text];
      if (here.includes(r.line.text)) found.push(r.line.text);
      if (r.next) walk(r.next, afterReply);
    }
    for (const b of node.branches ?? []) walk(b.node, here);
    if (node.end?.close && here.includes(node.end.close.text))
      found.push(node.end.close.text);
  };
  walk(talk.tree, head);
  return [...new Set(found)];
}

/** What a scene tests: its purpose, the asker's profile and the branches the tree holds. */
function branchesOf(talk: any): string[] {
  const asked = new Set<string>();
  const asker = new Set<string>();
  const walk = (node: any) => {
    for (const l of node.lines) asker.add(l.move);
    for (const r of node.replies) {
      asked.add(r.line.move);
      if (r.next) walk(r.next);
    }
    for (const b of node.branches ?? []) walk(b.node);
  };
  walk(talk.tree);
  const out: string[] = [];
  if (asked.has("lie")) out.push("a lie, caught and believed");
  if (asked.has("bargain")) out.push("a bargain");
  if (["press", "plea", "threaten", "confront"].some((m) => asker.has(m)))
    out.push("push-back");
  if (asked.has("leave")) out.push("walking away");
  if (talk.intro.length) out.push("the player's character answering first");
  return out;
}

interface Chosen {
  spec: Spec;
  variants: ComposedScene["variants"];
  gaps: string[];
  repeats: string[];
}

/**
 * What the records say about a person's life right now, as slot facts the
 * pieces may speak to (owner, Oct 19: "take in everything that would affect
 * people"). `who` is "asker" or "asked"; a flag has no words, only a source.
 */
const circumstancesOf = (who: string, id: string): Record<string, Fact> => {
  const person = core.people.get(id);
  if (!person) return {};
  const out: Record<string, Fact> = {};
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (job && org && !job.endsAt)
    out[`${who}_employer`] = fact(properName(org.name), [job.id, org.id]);
  const lost = [...(world.director.ledger.people.get(id)?.moments ?? [])]
    .reverse()
    .find(
      (m: any) =>
        /^money:job-(left|ended)$/.test(m.label) &&
        Date.parse(core.date) - Date.parse(m.date) < 365 * 86_400_000,
    );
  if (lost && !(job && !job.endsAt))
    out[`${who}_out_of_work`] = flag([lost.id]);
  const liquid = (person as any).liquidMinor;
  const daily = (person as any).livingCostDailyMinor;
  if (typeof liquid === "number" && daily && liquid < daily * 30)
    out[`${who}_short_on_money`] = flag([id]);
  // Age that changes what can be said to someone (owner, Oct 19: nobody tells
  // an 80-year-old to wait a cycle or that they'll land on their feet).
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  if (age >= 70) out[`${who}_elder`] = flag([id]);
  else if (age < 30) out[`${who}_young`] = flag([id]);
  const home = (
    core.households.get(person.householdId)?.memberIds ?? []
  ).filter((other) => other !== id && core.people.get(other)?.alive);
  const kinOf = (other: string) =>
    (person.pastFacts ?? []).find(
      (row: any) =>
        row.kind.startsWith("family:") && row.facts?.otherPersonId === other,
    )?.kind;
  const partner = home.find((other) => kinOf(other) === "family:partner");
  if (partner)
    out[`${who}_partner`] = fact(core.people.get(partner)!.givenName, [
      partner,
    ]);
  const kids = home
    .filter((other) => kinOf(other) === "family:child")
    .sort((a, b) =>
      String(core.people.get(b)!.birthDate).localeCompare(
        String(core.people.get(a)!.birthDate),
      ),
    );
  if (kids[0])
    out[`${who}_kid`] = fact(core.people.get(kids[0])!.givenName, [kids[0]]);
  const traits = ((person as any).traits ?? {}) as Record<string, number>;
  const high = (key: string) =>
    (traits[`personality-v1:facet-${key}`] ?? 0) >= 2;
  if (high("blunt")) out[`${who}_blunt`] = flag([id]);
  if (high("friendly") || high("affectionate")) out[`${who}_warm`] = flag([id]);
  if (high("guarded")) out[`${who}_guarded`] = flag([id]);
  if (high("argumentative")) out[`${who}_argumentative`] = flag([id]);
  return out;
};

/** A person's view on the scene's issue, as a flag a piece may speak to. */
const viewFacts = (
  who: string,
  id: string,
  topic: string | undefined,
): Record<string, Fact> => {
  const stance = topic ? stanceOn(id, topic) : undefined;
  if (!stance) return {};
  // A view only speaks as strongly as it is held (owner, Oct 19: "it said
  // barely, but then it said that he really wants it gone"). A firm view
  // takes a side out loud; a weak one only leans, and no side-taking line
  // reads a lean.
  const side = stance.desiredChange === "repeal" ? "gone" : "kept";
  return stance.strength >= FIRM_VIEW
    ? { [`${who}_wants_${side}`]: flag([stance.id]) }
    : { [`${who}_leans_${side}`]: flag([stance.id]) };
};

function tryCast(type: any, spec: Spec): Chosen | { reason: string } {
  const asker = core.people.get(spec.askerId)!;
  // A lie is caught only where the asker holds the record that contradicts
  // it: a person they know stands as the source.
  // No two scenes on a page cite the same source.
  const known = order(
    [...asker.knownIds].filter(
      (other) =>
        other !== spec.askedId &&
        other !== spec.askerId &&
        core.people.get(other)?.alive,
    ),
    `source:${spec.askerId}`,
    (x) => x,
  );
  const contact = known.find((id) => !usedSources.has(id)) ?? known[0];
  if (contact) usedSources.add(contact);
  const role = roleOf(spec.askerId);
  const facts: Record<string, Fact> = {
    ...circumstancesOf("asker", spec.askerId),
    ...circumstancesOf("asked", spec.askedId),
    ...viewFacts("asker", spec.askerId, topicOf(spec.records)),
    ...viewFacts("asked", spec.askedId, topicOf(spec.records)),
    ...spec.facts,
    ...(role && !spec.facts.asker_role ? { asker_role: role } : {}),
    ...(contact && !spec.facts.source
      ? {
          source: fact(nameOf(contact), [contact]),
          "knows-truth": flag([contact]),
        }
      : {}),
  };
  const variants: ComposedScene["variants"] = [];
  const seenWords = new Set<string>();
  let reason = "";
  for (const profile of profiles) {
    const result = composeSceneTalk(
      core,
      world.director,
      { askerId: spec.askerId, askedId: spec.askedId },
      type as PurposeType,
      facts,
      { askerTraits: profile.traits, askedTraits: profile.traits },
      // No scene says what another scene on the page said as setup, open or statement.
      { usage: pageUsage, strict: true, shown: shownPieces, freshOnly: true },
    );
    if (result.kind === "skipped") {
      reason = result.reason;
      break;
    }
    const words = result.talk.lines.map((line) => line.text).join("|");
    if (seenWords.has(words)) {
      dropped.identicalProfile += 1;
      continue;
    }
    seenWords.add(words);
    let previous: string | undefined;
    const lines = result.talk.lines.map((line) => {
      const row = toRow(line, profile, previous);
      row.endpoint = type.tag.endpoint;
      if (line.role !== "narrator" && (line.role === "asker" || line.chosen))
        previous = line.move;
      return row;
    });
    variants.push({
      profile,
      lines,
      outcome: result.talk.outcome,
      talk: result.talk,
    });
  }
  if (!variants.length) return { reason: reason || "nothing composed" };
  const gaps = [...new Set(variants.flatMap((v) => v.talk.gaps as string[]))];
  const repeats = [...new Set(variants.flatMap((v) => repeatsOnPaths(v.talk)))];
  return {
    spec: { ...spec, facts },
    variants,
    gaps,
    repeats,
  };
}

/* --------------------------------------------------- context for the grader */
// Who the two people are and what links them, from the records, so the owner
// can judge whether a line fits the relationship (owner, Oct 19: "you might
// say something to your mom that you would never say to a coworker").
// Development tooling: the page's context panel, never game text.
const dollars = (minor: number) =>
  `$${Math.round(minor / 100).toLocaleString("en-US")}`;
// A trait in the catalog's own words ("Loyal", "Duty-bound"; owner, Oct 19:
// "bond loyalty" is not English). One-sided facets show only when marked.
const traitLabel = new Map(
  CATALOGUE_SCALES.map((row) => [row.key, row] as const),
);
const MIND_WORDS: Record<string, readonly [string, string]> = {
  "people-mind-v1:deliberation": ["acts on impulse", "thinks things through"],
  "people-mind-v1:sociability": ["keeps to themself", "outgoing"],
  "people-mind-v1:conflict": ["avoids a fight", "ready for a fight"],
  "people-mind-v1:reliability": ["unreliable", "reliable"],
  "people-mind-v1:risk": ["careful", "willing to take risks"],
};
const traitWords = (traits: Record<string, number> | undefined) =>
  Object.entries(traits ?? {})
    .filter(([, level]) => Math.abs(level) >= 2)
    .flatMap(([key, level]) => {
      const mind = MIND_WORDS[key];
      if (mind) return [mind[level > 0 ? 1 : 0]];
      const row = traitLabel.get(key.replace(/^[a-z-]+-v1:/, ""));
      if (!row) return [];
      if (row.sides === "one" && level < 0) return [];
      return [(level > 0 ? row.high : row.low).label.toLowerCase()];
    })
    .slice(0, 6);
/** The policy topic a scene is about, from its records (a law reach, a bill). */
const topicOf = (records: readonly string[]): string | undefined => {
  for (const id of records) {
    const named = /us-policy-positions:[a-z-]+\.[a-z0-9-]+/.exec(id)?.[0];
    if (named) return named;
    const bill = titled.find((row) => row.bill.id === id)?.bill;
    const question = bill?.provisions?.find(
      (p: any) => p.kind === "policy-question",
    )?.question;
    if (question) return String(question);
  }
  return undefined;
};
/** A date as people read it: "November 1, 2026" (owner, Oct 19). */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const dateSaid = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
};
/** What a moment in someone's life was, in plain words (owner, Oct 19). */
const LIFE_WORDS: readonly [RegExp, string][] = [
  [/^cause:event:office\.replied$/, "heard back from a town office"],
  [/^cause:event:office\.introduced$/, "introduced a bill"],
  [/^cause:event:office\.voted$/, "voted on a bill"],
  [/^cause:event:executive-action$/, "acted on a bill at the desk"],
  [/^cause:event:veto-override$/, "a veto went to an override vote"],
  [/^cause:event:town-hall$/, "a town hall"],
  [/^cause:event:president\.address$/, "gave the address"],
  [/^cause:event:candidate-filed$/, "filed to run for office"],
  [/^cause:event:election-result$/, "an election result"],
  [/^cause:event:took-office$/, "took office"],
  [/^cause:event:official-appointed$/, "appointed to a town post"],
  [/^cause:event:public-comment$/, "spoke at a public meeting"],
  [/^cause:event:law\.effect-learned$/, "learned what a law did to them"],
  [/^money:job-left$/, "left a job"],
  [/^money:job-ended$/, "lost a job"],
  [/^money:/, "a change in money"],
  [/^past:school:/, "started at a new school"],
  [/^past:family:child$/, "a child was born"],
  [/^past:work:/, "started work"],
  [/^feeling:event:person-birth$/, "a baby was born in the family"],
  [/^feeling:event:life\.death$/, "a death close to them"],
  [/^feeling:event:housing\./, "a change at home"],
  [/^feeling:event:person\.moved-away$/, "someone close moved away"],
];
const lifeWords = (label: string) =>
  LIFE_WORDS.find(([pattern]) => pattern.test(label))?.[1];
/** How a view came about, in plain words, from its causes (the memory behind it). */
const causeWords = (cause: { eventId: string; date: string }) => {
  const outletId = /outlet:[a-z-]+:\d+:[^:]+/.exec(cause.eventId)?.[0];
  const outlet = outletId
    ? outlets.find((row) => row.id === outletId)
    : undefined;
  const org = outlet
    ? core.organizations.get(outlet.organizationId)
    : undefined;
  if (cause.eventId.startsWith("news.read"))
    return `read about it in ${org ? properName(org.name) : "the news"} (${dateSaid(cause.date)})`;
  const teller = /:retold:([^:]+)$/.exec(cause.eventId)?.[1];
  if (teller)
    return `${nameOf(teller)} told them about a speech on it (${dateSaid(cause.date)})`;
  if (cause.eventId.startsWith("campaign-message"))
    return `a campaign's message on it reached them (${dateSaid(cause.date)})`;
  if (cause.eventId.startsWith("speech"))
    return `heard a speech on it (${dateSaid(cause.date)})`;
  return `on record since ${dateSaid(cause.date)}`;
};
/** The strength (0 to 1) at which a view is said out loud as a side ("firmly"). */
const FIRM_VIEW = 0.35;
/** How strongly someone holds a view, in words (owner, Oct 19: "what is the scale?"). */
const strengthWords = (strength: number) =>
  strength < 0.1
    ? "barely"
    : strength < FIRM_VIEW
      ? "somewhat"
      : strength < 0.7
        ? "firmly"
        : "strongly";
/** Everything the records say that shapes this person, for the grader (dev mode). */
const contextOf = (
  id: string,
  topic: string | undefined,
  asOf: string = core.date,
): string[] => {
  const person = core.people.get(id);
  if (!person) return ["no person record"];
  const out: string[] = [];
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(asOf));
  const town = townOf(id);
  out.push(`${age} years old${town ? `, lives in ${town.text}` : ""}`);
  const home = (
    core.households.get(person.householdId)?.memberIds ?? []
  ).filter((other) => other !== id && core.people.get(other)?.alive);
  if (home.length)
    out.push(
      `lives with ${home
        .map((other) => {
          const kin = (person.pastFacts ?? []).find(
            (row: any) =>
              row.kind.startsWith("family:") &&
              row.facts?.otherPersonId === other,
          );
          return `${nameOf(other)}${kin ? ` (${kin.kind.slice("family:".length)})` : ""}`;
        })
        .join(", ")}`,
    );
  else out.push("lives alone");
  const post = postOf(id);
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  if (post) out.push(`serves as ${post.title}`);
  else if (job?.id.startsWith("job:office:"))
    // A state or federal official: their office is their job.
    out.push(`holds office (${spokenPost(job.title.replace(/-/g, " "))})`);
  else if (job && org) {
    // A press or staff post says what the person does; an occupation's
    // census name ("news analysts, reporters, and journalists") does not.
    const post = roleOf(id);
    out.push(
      post
        ? `works at ${properName(org.name)} as ${/^[aeiou]/i.test(post.text) ? "an" : "a"} ${post.text}, about ${dollars(job.wageDailyMinor * 21)} a month`
        : `works as ${job.title.toLowerCase()} at ${properName(org.name)}, about ${dollars(job.wageDailyMinor * 21)} a month`,
    );
  } else if (roleOf(id)) {
    const role = roleOf(id)!.text;
    out.push(`works as ${/^[aeiou]/i.test(role) ? "an" : "a"} ${role}`);
  } else {
    const left = [...(world.director.ledger.people.get(id)?.moments ?? [])]
      .reverse()
      .find((m: any) => /^money:job-(left|ended)$/.test(m.label));
    out.push(
      left
        ? `${left.label.endsWith("left") ? "left" : "lost"} their job on ${dateSaid(left.date)}`
        : age >= 67
          ? "retired"
          : "not working",
    );
  }
  // Money only where it presses: savings under three months of costs.
  const liquid = (person as any).liquidMinor;
  const daily = (person as any).livingCostDailyMinor;
  if (typeof liquid === "number" && daily && liquid < daily * 90)
    out.push(
      `short on money: savings of ${dollars(liquid)} cover about ${Math.max(0, liquid / (daily * 30)).toFixed(1)} months of bills`,
    );
  const traits = traitWords((person as any).traits);
  if (traits.length) out.push(`traits: ${traits.join(", ")}`);
  const stance = topic ? stanceOn(id, topic) : undefined;
  // What had formed the view by the scene's day.
  const formed = stance
    ? [...stance.causes]
        .filter((cause) => cause.date <= asOf)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 2)
        .map(causeWords)
    : [];
  if (topic)
    out.push(
      stance
        ? `on ${names[topic] ?? topic}: ${strengthWords(stance.strength)} wants it ${stance.desiredChange === "repeal" ? "gone" : "in place"} (${stance.strength.toFixed(2)} on a scale from 0, no view, to 1, as strong as a view gets); ${formed.length ? formed.join("; ") : "nothing on record had shaped it yet by that day"}`
        : `no view on record on ${names[topic] ?? topic}`,
    );
  const moments = [...(world.director.ledger.people.get(id)?.moments ?? [])]
    .filter(
      (m: any) =>
        m.date <= asOf &&
        !/cause\.shared|speech\.(heard|retold)|news\.read/.test(m.label),
    )
    .flatMap((m: any) => {
      const words = lifeWords(m.label);
      return words ? [`${words} (${dateSaid(m.date)})`] : [];
    })
    .filter((line, at, all) => all.indexOf(line) === at)
    .slice(-4);
  if (moments.length) out.push(`recent life: ${moments.join("; ")}`);
  return out;
};
const relationOf = (a: string, b: string): string => {
  const pa = core.people.get(a);
  const pb = core.people.get(b);
  if (!pa || !pb) return "no record links them";
  const kin = (pa.pastFacts ?? []).find(
    (row: any) =>
      row.kind.startsWith("family:") && row.facts?.otherPersonId === b,
  );
  if (kin)
    return `family: ${nameOf(b)} is ${nameOf(a)}'s ${kin.kind.slice("family:".length)}`;
  const kinBack = (pb.pastFacts ?? []).find(
    (row: any) =>
      row.kind.startsWith("family:") && row.facts?.otherPersonId === a,
  );
  if (kinBack)
    return `family: ${nameOf(a)} is ${nameOf(b)}'s ${kinBack.kind.slice("family:".length)}`;
  if (pa.householdId && pa.householdId === pb.householdId)
    return "they live in the same household";
  const ja = pa.jobId ? core.jobs.get(pa.jobId) : undefined;
  const jb = pb.jobId ? core.jobs.get(pb.jobId) : undefined;
  if (ja && jb && ja.organizationId === jb.organizationId)
    return "coworkers: they work for the same employer";
  if (postOf(a) && postOf(b)) return "colleagues: both hold office";
  if (pa.knownIds.has(b) || pb.knownIds.has(a))
    return "they know each other (an acquaintance on record, no closer tie)";
  return "strangers: no record links them";
};

// A life's own scenes (owner, Oct 19: "start as the president ... see what
// the simulation does for their life ... not authoring scenes"): with
// `--life <person id>`, the page stages only what the director scheduled for
// that person in the cached year, cast as the director bound it, each scene's
// facts read from its cause record. The proof scenes above are set aside.
/**
 * What the cause record says happened, as facts a line can rest on: the
 * desk's action, a bill just introduced, the office filed for and whether
 * the one filing holds it now, and the question a resident asked at a town
 * hall. Each names its record.
 */
const lifeCauseFacts = (
  moment: any,
  cause: any,
  askerId: string,
  askedId: string,
): Record<string, Fact> => {
  if (!moment) return {};
  const id = String(moment.causeId);
  const out: Record<string, Fact> = {};
  const facts = cause?.facts ?? {};
  if (cause?.kind === "executive-action" && facts.action)
    out[String(facts.action)] = flag([id]);
  if (cause?.kind === "veto-override")
    out[facts.passed === "true" ? "overridden" : "veto-held"] = flag([id]);
  if (id.startsWith("office.introduced:")) out.introduced = flag([id]);
  // How a reporter calls out to the officeholder: "Mayor", "Madam President".
  const held = postOf(askedId);
  if (held) {
    const word = held.title.replace(/^\w/, (c) => c.toUpperCase());
    const gender = (core.people.get(askedId) as any)?.looks?.gender;
    out.title = fact(
      /president/i.test(word)
        ? `${gender === "female" ? "Madam" : "Mr."} ${word}`
        : word,
      [held.term.id],
    );
  }
  if (cause?.kind === "candidate-filed" && facts.office) {
    out.office = fact(spokenPost(facts.office), [id]);
    if (held && held.title === spokenPost(facts.office))
      out.incumbent = flag([id, held.term.id]);
  }
  if (cause?.kind === "cause.shared") {
    // The cause, in plain words, and where the one asking first heard it:
    // from the person they are asking, at that person's own town hall.
    const entries = Object.entries(facts as Record<string, string>);
    const drive = entries.find(([key]) => key.endsWith(":drive"))?.[1];
    const question = drive?.replace(/^cause:/, "");
    const name = question ? names[question] : undefined;
    if (name)
      out.cause = fact(name.charAt(0).toLowerCase() + name.slice(1), [
        id,
        String(question),
      ]);
    const origin = entries.find(([key]) => key.endsWith(":origin"))?.[1];
    if (origin?.includes(":town-hall:") && origin.includes(askedId))
      out["heard-you"] = flag([id, origin]);
  }
  if (cause?.kind === "town-hall") {
    out.townhall = flag([id]);
    const hall = rows("core2-meetings-v1", "townHalls").find(
      (row) => row.id === facts.townHallId,
    );
    const asked = hall?.questions?.find((q: any) => q.askedBy === askerId);
    const issue = asked ? names[String(asked.question)] : undefined;
    if (issue)
      out.issue = fact(issue.charAt(0).toLowerCase() + issue.slice(1), [
        String(hall.id),
        String(asked.question),
      ]);
  }
  return out;
};
/** Why a life's scene happens, from its cause record, for the panel (owner, Oct 19: "but why?"). */
const lifeWhy = (
  moment: any,
  cause: any,
  askerId: string,
  askedId: string,
  bill: any,
  title: string | undefined,
  outletName: string | undefined,
): string[] => {
  if (!moment) return [];
  const facts = cause?.facts ?? {};
  const when = dateSaid(moment.date);
  const billWords = bill
    ? `${bill.number ?? "a bill"}${title ? ` (${title})` : ""}`
    : "a bill";
  const asked = nameOf(askedId);
  const asker = nameOf(askerId);
  const id = String(moment.causeId);
  const lines: string[] = [];
  if (cause?.kind === "executive-action")
    lines.push(`${asked} ${facts.action} ${billWords} on ${when}.`);
  else if (cause?.kind === "veto-override")
    lines.push(
      `The council voted on overriding ${asked}'s veto of ${billWords} on ${when}; ${facts.passed === "true" ? "the override passed" : "the veto held"}.`,
    );
  else if (id.startsWith("office.introduced:"))
    lines.push(`${asked} introduced ${billWords} on ${when}.`);
  else if (cause?.kind === "candidate-filed")
    lines.push(
      `${asked} filed to run for ${spokenPost(facts.office ?? "office")} on ${when}, with the ${String(
        facts.filedWith ?? "filing office",
      )
        .replace(/ \(.*\)$/, "")
        .toLowerCase()}.`,
    );
  else if (cause?.kind === "president.address")
    lines.push(
      `${asked} gave the ${String(facts["address:kind"] ?? "")} address on ${when}; the English engine composed it from the world's records.`.replace(
        "the  address",
        "the address",
      ),
    );
  else if (cause?.kind === "town-hall")
    lines.push(
      `${asked} held a town hall on ${when}; ${facts.attendees ?? "some"} residents came, and ${asker} asked a question.`,
    );
  else {
    const words = lifeWords(String(moment.label));
    if (words) lines.push(`${words} (${when}).`);
  }
  if (outletName)
    lines.push(`${asker} reports for ${outletName}, which covers ${asked}.`);
  else if (roleOf(askerId))
    lines.push(
      `${asker} is ${/^[aeiou]/i.test(roleOf(askerId)!.text) ? "an" : "a"} ${roleOf(askerId)!.text} to ${asked}.`,
    );
  lines.push(
    `The director staged this from ${asked}'s own records; nobody wrote the situation.`,
  );
  return lines;
};
const lifeIds = option("life", "").split(",").filter(Boolean);
if (lifeIds.length) {
  const lived: Spec[] = [];
  for (const lifeId of lifeIds) {
    const book = world.director.ledger.people.get(lifeId as never) as any;
    if (!book) {
      console.error(`The director did not watch ${lifeId} in ${cache}.`);
      process.exit(1);
    }
    for (const entry of book.schedule ?? [])
      for (const binding of entry.bindings ?? []) {
        const type = typeOf.get(binding.typeKey);
        if (!type?.purpose) continue;
        const cast = (role: unknown) =>
          binding.roles.find((row: any) => row.role === role)
            ?.personIds?.[0] as string | undefined;
        const askerId = cast(type.asker);
        const askedId = cast(type.asked);
        if (!askerId || !askedId || askerId === askedId) continue;
        const moment = book.momentsById.get(entry.momentId);
        const cause = moment ? core.durableLog.get(moment.causeId) : undefined;
        const billId =
          cause?.facts?.billId ??
          /(?:^|:)(?<bill>bill:.+)$/.exec(String(moment?.causeId ?? ""))?.groups
            ?.bill;
        const bill = bills.find((row) => row.id === billId);
        const title = bill ? titleOf(bill) : undefined;
        const outlet = outlets.find((row) =>
          (row.reporterIds ?? []).includes(askerId),
        );
        const org = outlet
          ? core.organizations.get(outlet.organizationId)
          : undefined;
        lived.push({
          typeKey: binding.typeKey,
          askerId,
          askedId,
          facts: {
            name: fact(nameOf(askerId), [askerId]),
            first: fact(firstName(askedId), [askedId]),
            ...(bill
              ? {
                  bill: fact(
                    title ? quoted(title) : String(bill.number ?? billId),
                    [bill.id],
                  ),
                }
              : {}),
            ...(org ? { outlet: fact(properName(org.name), [org.id]) } : {}),
            ...(moment
              ? { when: fact(whenText(moment.date), [moment.causeId]) }
              : {}),
            ...lifeCauseFacts(moment, cause, askerId, askedId),
          },
          records: [
            ...(moment ? [moment.causeId] : []),
            // The question a resident asked, so the scene reads their view on it.
            ...Object.values(lifeCauseFacts(moment, cause, askerId, askedId))
              .flatMap((row) => row.sourceRecordIds)
              .filter((id) => id.startsWith("us-policy-positions:")),
            entry.momentId,
            ...(bill ? [bill.id] : []),
            ...(outlet ? [outlet.id] : []),
          ],
          standIn: [],
          why: lifeWhy(
            moment,
            cause,
            askerId,
            askedId,
            bill,
            title,
            org ? properName(org.name) : undefined,
          ),
          ...(moment ? { asOf: String(moment.date) } : {}),
        });
      }
  }
  specs.splice(0, specs.length, ...lived);
}

const scenes: ComposedScene[] = [];
const pieceGaps = new Map<string, string[]>();
const usedCasts = new Set<string>();

// A life's page stages each distinct cast the director bound (a president's
// press scene and a mayor's are both theirs); a proof page one per type.
const pageTypes = lifeIds.length
  ? purposeTypes.flatMap((typeKey) => {
      const casts = new Set(
        specs
          .filter((spec) => spec.typeKey === typeKey)
          .map((spec) => [spec.askerId, spec.askedId].sort().join("|")),
      );
      // Two at most of one situation, so one busy purpose doesn't fill the page.
      return Array.from(
        { length: Math.min(2, Math.max(1, casts.size)) },
        () => typeKey,
      );
    })
  : [...purposeTypes, ...fallbackKeys];
for (const typeKey of pageTypes) {
  const type = typeOf.get(typeKey)!;
  const candidates = order(
    specs.filter((spec) => spec.typeKey === typeKey),
    typeKey,
    (spec) => `${spec.askerId}:${spec.askedId}`,
  );
  if (!candidates.length) {
    skippedTypes.push({
      typeKey,
      reason:
        typeSkipReason.get(typeKey) ??
        "the cached world holds no records to stage it with",
    });
    continue;
  }
  // One scene per type: the cast whose talk has the fewest gaps and repeats.
  let best: (Chosen & { cost: number }) | undefined;
  let lastReason = "";
  for (const spec of candidates.slice(0, candidatesPerType)) {
    const castKey = [spec.askerId, spec.askedId].sort().join("|");
    if (usedCasts.has(castKey)) {
      dropped.sameCast += 1;
      continue;
    }
    const tried = tryCast(type, spec);
    if ("reason" in tried) {
      lastReason = tried.reason;
      dropped.composeSkipped += 1;
      continue;
    }
    const cost = tried.gaps.length * 10 + tried.repeats.length;
    if (!best || cost < best.cost) best = { ...tried, cost };
    if (cost === 0) break;
  }
  if (!best) {
    skippedTypes.push({
      typeKey,
      reason: lastReason || "no cast of the world could word it",
    });
    if (/piece gap/.test(lastReason))
      problems.push(`${typeKey}: ${lastReason}`);
    continue;
  }
  usedCasts.add([best.spec.askerId, best.spec.askedId].sort().join("|"));
  for (const gap of best.gaps) {
    pieceGaps.set(gap, [...(pieceGaps.get(gap) ?? []), typeKey]);
    problems.push(`piece gap: ${gap}`);
  }
  // A scene with a purpose reaches at least 3 distinct endings; a fallback
  // scene at least 2. Endings only need to close naturally (owner, Oct 16).
  const fewest = typeOf.get(typeKey)?.purpose ? 3 : 2;
  for (const variant of best.variants) {
    const counts = Object.values(
      variant.talk.endingCounts as Record<string, number>,
    );
    if (counts.length < fewest)
      problems.push(
        `${typeKey}: ${variant.profile.id} reaches only ${counts.length} named ending${counts.length === 1 ? "" : "s"}`,
      );
  }
  for (const text of best.repeats)
    problems.push(`${typeKey}: "${text}" is said twice on one path`);
  // What this scene said as setup, open and statement is used, for every profile.
  for (const variant of best.variants)
    for (const line of variant.talk.lines as SceneTalkLine[])
      if (SETUP_STEPS.includes(line.step))
        for (const piece of line.parts)
          pageUsage.set(piece, (pageUsage.get(piece) ?? 0) + 1);
  scenes.push({
    i: scenes.length + 1,
    typeKey,
    key: type.tag.key,
    endpoint: type.tag.endpoint,
    purpose: type.purpose ?? `fallback:${type.tag.key}`,
    askerId: best.spec.askerId,
    askedId: best.spec.askedId,
    records: best.spec.records,
    standIn: best.spec.standIn,
    ...(best.spec.why ? { why: best.spec.why } : {}),
    ...(best.spec.asOf ? { asOf: best.spec.asOf } : {}),
    ...(best.spec.facts.source
      ? { sourceText: best.spec.facts.source.text }
      : {}),
    variants: best.variants,
  });
}

/* ---- the scenes the director actually fires in the cached year ---------- */

interface DirectorScene {
  typeKey: string;
  causeRecordId: string;
  item: any;
}
const directorChosen: DirectorScene[] = [];
{
  const taken = new Set<string>(
    scenes.flatMap((scene) =>
      scene.variants.flatMap((v) =>
        (v.talk.lines as SceneTalkLine[])
          .filter((l) => SETUP_STEPS.includes(l.step))
          .map((l) => l.text),
      ),
    ),
  );
  const all = directorScenes(cache, profiles[0]!, 6);
  const wanted = Number(option("director", "14"));
  const seenTypes = new Set<string>();
  for (const row of all) {
    if (directorChosen.length >= wanted) break;
    if (seenTypes.has(row.typeKey)) continue;
    const item = row.item;
    const narration = item.lines
      .filter((l: LineRow) => l.role === "narrator")
      .map((l: LineRow) => l.text)
      .join(" ");
    const opening = item.lines.find((l: LineRow) => l.role === "speaker")?.text;
    const texts = [narration, opening].filter((t): t is string => !!t);
    // No two scenes on the page share a narration or an opening line.
    if (texts.some((t) => taken.has(t))) continue;
    const said = item.lines.map((l: LineRow) => l.text);
    if (new Set(said).size !== said.length) continue;
    for (const t of texts) taken.add(t);
    seenTypes.add(row.typeKey);
    directorChosen.push({
      typeKey: row.typeKey,
      causeRecordId: row.causeRecordId,
      item,
    });
  }
}

/* ----------------------------------------------------------------- output */

const stoodIn = [
  ...new Set([
    ...scenes.flatMap((scene) => scene.standIn),
    "bill names come from the government engine's records as they are",
  ]),
].sort();
const leadOf = (scene: ComposedScene) =>
  scene.variants.find((variant) => variant.profile.id === "own") ??
  scene.variants[(scene.i - 1) % scene.variants.length]!;
const testsOf = (scene: ComposedScene) => {
  const lead = leadOf(scene);
  return {
    purpose: scene.purpose,
    profile: lead.profile.id,
    branches: branchesOf(lead.talk),
  };
};

/**
 * A life's narrated scenes (no purpose, no exchange): the narrator's
 * paragraph, and a speech in the speaker's own words where the scene is about
 * one (the President's address). One per situation type.
 */
const narrated = lifeIds.flatMap((lifeId) => {
  const book = world.director.ledger.people.get(lifeId as never) as any;
  const seenTypes = new Set<string>();
  return (book?.schedule ?? []).flatMap((entry: any) => {
    if (entry.outcome === "journal-line") return [];
    const binding = entry.bindings?.[0];
    const type = binding ? typeOf.get(binding.typeKey) : undefined;
    if (!binding || !type || type.purpose || seenTypes.has(binding.typeKey))
      return [];
    const scene = composeScene(core, world.director, lifeId as never, entry);
    if (!scene?.narration.length) return [];
    seenTypes.add(binding.typeKey);
    const moment = book.momentsById.get(entry.momentId);
    const lines = [
      ...scene.narration.map((line) => ({
        role: "narrator",
        speaker: "Narrator",
        text: line.text,
        move: "narrate",
      })),
      ...(scene.speech
        ? [
            {
              role: "asker",
              speaker: nameOf(lifeId),
              text: scene.speech.text,
              move: "speech",
            },
          ]
        : []),
    ];
    return [
      {
        id: `narrated:${entry.momentId}`,
        kind: "narrated",
        type: binding.typeKey,
        purpose: "",
        place: world.placeName,
        seed: world.seed,
        context: {
          asker: {
            name: nameOf(lifeId),
            facts: contextOf(lifeId, undefined, moment?.date),
          },
          asked: { name: nameOf(lifeId), facts: [] },
          relation: "",
          why: lifeWhy(
            moment,
            moment ? core.durableLog.get(moment.causeId) : undefined,
            lifeId,
            lifeId,
            undefined,
            undefined,
            undefined,
          ).filter((line) => !/ is (a|an) /.test(line)),
          records: [moment?.causeId ?? entry.momentId],
        },
        narration: [],
        root: { lines, replies: [], end: { outcome: "resolved" } },
      },
    ];
  });
});

const json = {
  id,
  title: `Scenes with a purpose, ${id}`,
  place: world.placeName,
  seed: world.seed,
  profiles: profiles.map((p) => ({ id: p.id, traits: p.traits })),
  count: scenes.length + directorChosen.length,
  situations: [
    ...scenes.map((s) => s.typeKey),
    ...directorChosen.map((s) => s.typeKey),
  ],
  skipped: skippedTypes,
  dropped,
  stoodIn,
  pieceGaps: Object.fromEntries([...pieceGaps]),
  problems,
  // One tree per purpose scene, in the shape the page builder reads: the lead
  // profile's exchange, every reply's branch, a lie's caught and believed outcomes.
  scenes: [
    ...scenes.map((scene) => ({
      id: `${scene.typeKey}:${scene.askerId}:${scene.askedId}`,
      kind: "purpose",
      purpose: scene.purpose,
      type: scene.typeKey,
      place: world.placeName,
      seed: world.seed,
      cast: [scene.askerId, scene.askedId],
      proof: true,
      tests: testsOf(scene),
      narration: leadOf(scene).talk.narration.map((l: SceneTalkLine) => l.text),
      intro: leadOf(scene).talk.intro.map((l: SceneTalkLine) => ({
        speaker: l.speaker,
        text: l.text,
        pieceKey: l.parts[0],
        auto: true,
      })),
      longestPath: leadOf(scene).talk.depth,
      nodes: leadOf(scene).talk.nodes,
      context: {
        asker: {
          name: nameOf(scene.askerId),
          facts: contextOf(scene.askerId, topicOf(scene.records), scene.asOf),
        },
        asked: {
          name: nameOf(scene.askedId),
          facts: contextOf(scene.askedId, topicOf(scene.records), scene.asOf),
        },
        relation: relationOf(scene.askerId, scene.askedId),
        why: scene.why ?? scene.standIn,
        records: scene.records,
      },
      root: slim(leadOf(scene).talk.tree, scene.sourceText),
    })),
    ...narrated,
    ...directorChosen.map((row) => ({
      id: row.item.sceneId,
      kind: "director",
      type: row.typeKey,
      place: world.placeName,
      seed: world.seed,
      cast: row.item.castIds,
      proof: false,
      causeRecordId: row.causeRecordId,
      lines: row.item.lines,
    })),
  ],
  items: scenes.flatMap((scene) =>
    scene.variants.map((variant, at) => ({
      i: Number(`${scene.i}${at}`),
      scene: scene.i,
      situationType: scene.typeKey,
      key: scene.key,
      endpoint: scene.endpoint,
      purpose: scene.purpose,
      proof: true,
      profile: variant.profile.id,
      outcome: variant.outcome,
      nodes: variant.talk.nodes,
      endings: variant.talk.endings,
      castRecordIds: [scene.askerId, scene.askedId],
      records: scene.records,
      parts: [...new Set(variant.lines.flatMap((l) => l.parts))],
      lines: variant.lines,
      depth: variant.talk.depth,
      tree: {
        id: `${scene.typeKey}:${scene.askerId}:${scene.askedId}`,
        purpose: scene.purpose,
        type: scene.typeKey,
        place: world.placeName,
        seed: world.seed,
        cast: [scene.askerId, scene.askedId],
        narration: variant.talk.narration.map((l: SceneTalkLine) => l.text),
        root: slim(variant.talk.tree, scene.sourceText),
      },
    })),
  ),
};

const out: string[] = [];
out.push(
  `# Scenes, ${id}`,
  "",
  lifeIds.length
    ? `Place: ${world.placeName} (a played year, seed ${world.seed}). ${scenes.length} scenes, every one staged by the director from these lives' own records (${lifeIds.map((id) => nameOf(id)).join(" and ")}), cast as the director bound it, with the record that caused it. No two scenes share a narration, an open or a statement. Words come only from data/english/parts/scene-talk.json.`
    : `Place: ${world.placeName} (the cached played world, seed ${world.seed}). ${json.count} scenes: ${scenes.length} with a purpose, one for each situation type, staged as proof scenes from the world's real people and records (their producers are awaited), and ${directorChosen.length} that the director fires in the cached year from a cause record, each of a different situation type. No two scenes share a narration, an open or a statement. Words come only from data/english/parts/scene-talk.json and the conversation bank.`,
  "",
  "Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.",
  "",
  "## What each scene tests",
  "",
);
for (const scene of scenes) {
  const t = testsOf(scene);
  out.push(
    `- Scene ${scene.i}, ${scene.typeKey} (${scene.purpose}): the asker is ${t.profile}; ${t.branches.length ? t.branches.join(", ") : "a plain ask and answer"}.`,
  );
}
directorChosen.forEach((row, at) =>
  out.push(
    `- Scene ${scenes.length + at + 1}, ${row.typeKey} (fired by the director from ${row.causeRecordId}): a talk the conversation engine composes from the records.`,
  ),
);
out.push("");
if (skippedTypes.length) {
  out.push("## Situations not staged", "");
  for (const row of skippedTypes) out.push(`- ${row.typeKey}: ${row.reason}`);
  out.push("");
}
out.push("## What was stood in", "");
for (const row of stoodIn) out.push(`- ${row}`);
out.push("");

const show = (lines: LineRow[]) => {
  let run: LineRow[] = [];
  const flush = () => {
    if (!run.length) return;
    out.push("You could say:", "");
    run.forEach((l, k) =>
      out.push(
        `${k + 1}. ${l.text}${(l as any).chosen ? "  *(the page follows this one)*" : ""}`,
      ),
    );
    out.push("");
    run = [];
  };
  for (const l of lines) {
    if (l.role === "reply") {
      run.push(l);
      continue;
    }
    flush();
    out.push(`**${l.speaker}:** ${l.text}`, "");
  }
  flush();
};

for (const scene of scenes) {
  const lead = leadOf(scene);
  const t = testsOf(scene);
  out.push(
    `## Scene ${scene.i}: ${scene.typeKey} (${scene.key}, ends in ${scene.endpoint}) — ${scene.purpose.startsWith("fallback:") ? "fallback (the generic arc for its key; fired by the director)" : lifeIds.length ? "staged by the director" : "proof scene"}`,
    "",
    `*Tests ${t.purpose}; the asker is ${t.profile}; ${t.branches.length ? t.branches.join(", ") : "a plain ask and answer"}. Records: ${scene.records.join(", ")}.*`,
    "",
    `> ${lead.talk.narration.map((l: SceneTalkLine) => l.text).join(" ")}`,
    "",
    `**Profile ${lead.profile.id}** (outcome ${lead.outcome})`,
    "",
  );
  show(lead.lines.filter((l) => l.role !== "narrator"));
  const outline = (node: any, depth: number) => {
    const pad = "  ".repeat(depth);
    for (const line of node.lines)
      out.push(
        `${pad}- ${line.speaker}${line.auto ? " (without a choice)" : ""}: ${line.text}`,
      );
    for (const reply of node.replies) {
      out.push(
        `${pad}- You${reply.line.chosen ? " ★" : ""}: ${reply.line.text}`,
      );
      if (reply.next) outline(reply.next, depth + 1);
      else out.push(`${pad}  - (the tree is cut here)`);
    }
    for (const branch of node.branches ?? []) {
      out.push(`${pad}- *${branch.label}:*`);
      outline(branch.node, depth + 1);
    }
    if (node.end)
      out.push(
        `${pad}- *Ends: ${node.end.ending ? node.end.ending.label : node.end.outcome}${node.end.close ? `: ${node.end.close.speaker}: ${node.end.close.text}` : ""}*`,
      );
  };
  out.push(
    `**The whole exchange** (${lead.talk.nodes} nodes; longest path ${lead.talk.depth} replies; ★ is the branch ${lead.profile.id}'s traits lean toward):`,
    "",
  );
  outline(
    lead.talk.intro.length
      ? {
          ...lead.talk.tree,
          lines: [...lead.talk.intro, ...lead.talk.tree.lines],
        }
      : lead.talk.tree,
    0,
  );
  out.push("");
  const others = scene.variants.filter((v) => v !== lead);
  if (others.length)
    out.push(
      `Other personalities: ${others
        .map(
          (v) =>
            `${v.profile.id} leans to “${v.talk.rounds[0]?.chosen.text ?? "?"}” and it ends ${v.outcome}`,
        )
        .join("; ")}.`,
      "",
    );
  out.push(
    `<sub>${lead.lines
      .map(
        (l) =>
          `L${l.n} ${(l as any).step}/${l.move}/${l.register}/${l.bearing ?? "none"}/${l.words}w${l.sentences}s [${l.parts.join(", ")}]`,
      )
      .join("; ")}</sub>`,
    "",
  );
}
directorChosen.forEach((row, at) => {
  const item = row.item;
  out.push(
    `## Scene ${scenes.length + at + 1}: ${row.typeKey} (${item.key}, ends in ${item.endpoint}) — fired by the director`,
    "",
    `*Fired by ${row.causeRecordId}. Cast: ${item.castIds.join(", ")}.*`,
    "",
  );
  const narration = item.lines.filter((l: LineRow) => l.role === "narrator");
  if (narration.length)
    out.push(`> ${narration.map((l: LineRow) => l.text).join(" ")}`, "");
  show(
    item.lines.filter(
      (l: LineRow) => l.role !== "narrator" && l.role !== "journal",
    ),
  );
  for (const l of item.lines.filter((x: LineRow) => x.role === "journal"))
    out.push(`*Journal:* ${l.text}`, "");
  out.push(
    `<sub>${item.lines
      .map(
        (l: LineRow) =>
          `L${l.n} ${l.role}/${l.move}/${l.register}/${l.bearing ?? "none"}/${l.words}w${l.sentences}s [${l.parts.join(", ")}]`,
      )
      .join("; ")}</sub>`,
    "",
  );
});

/* ------------------------------------------------- what is new on this page */
// Every batch reads new (owner, Oct 19): a line the owner saw on an earlier
// page counts against the page, and too many refuse it.
const NEW_SHARE = 0.8;
let linesOnPage = 0;
let linesSeen = 0;
for (const scene of scenes) {
  const keys = new Set(
    JSON.stringify(leadOf(scene).talk.tree).match(
      /scene-talk\.[a-z-]+\.[a-z0-9-]+/g,
    ) ?? [],
  );
  const seen = [...keys].filter((key) => shownPieces.has(key));
  linesOnPage += keys.size;
  linesSeen += seen.length;
  if (keys.size && seen.length / keys.size > 1 - NEW_SHARE)
    problems.push(
      `${scene.typeKey}: ${seen.length} of ${keys.size} lines were on an earlier page`,
    );
}
console.error(
  `new on this page: ${linesOnPage - linesSeen} of ${linesOnPage} lines`,
);

/* ------------------------------------------------------------- the gate */

if (problems.length) {
  // Rough output is not written to the repository: a draft goes to the scratch folder.
  mkdirSync("/tmp/claude-0", { recursive: true });
  writeFileSync(`/tmp/claude-0/${id}-draft.md`, `${out.join("\n")}\n`);
  writeFileSync(
    `/tmp/claude-0/${id}-draft.json`,
    `${JSON.stringify(json, null, 2)}\n`,
  );
  console.error(
    `${id} is not ready: ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n- ${[...new Set(problems)].join("\n- ")}\n(draft in /tmp/claude-0/${id}-draft.md; ${scenes.length} purpose scenes and ${directorChosen.length} director scenes)`,
  );
  process.exit(1);
}
mkdirSync("data/english/batches", { recursive: true });
writeFileSync(
  `data/english/batches/${id}.json`,
  `${JSON.stringify(json, null, 2)}\n`,
);
mkdirSync("docs/grading", { recursive: true });
writeFileSync(`docs/grading/words-${id}.md`, `${out.join("\n")}\n`);
console.log(
  `${json.count} scenes (${scenes.length} purpose, ${directorChosen.length} director) of ${new Set(json.situations).size} types; skipped ${skippedTypes.length}: ${skippedTypes.map((s) => s.typeKey).join(", ") || "none"}; dropped ${JSON.stringify(dropped)}`,
);
