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
import { mkdirSync, writeFileSync } from "node:fs";
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
import { properName, spoken } from "../../src/director/words";
import { policyNames } from "../../src/bench/words";
import situationFile from "../../src/director/data/situation-types.json" with { type: "json" };
import rulesFile from "../../src/director/data/scene-talk-rules.json" with { type: "json" };
import profilesFile from "../../src/director/data/grading-profiles.json" with { type: "json" };
import { sentenceCount, wordCount } from "../../src/english/calibration";
import {
  directorScenes,
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

const profiles = (
  profilesFile as { profiles: GradingProfile[] }
).profiles.slice(0, profileCount);
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
const board = "office:gus2025:101811:board";
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

/* --------------------------------------------------------------- compose */

const library = (situationFile as any).types as any[];
const typeOf = new Map(library.map((row) => [row.key, row]));
const purposeTypes = library
  .filter((row) => row.purpose)
  .map((row) => row.key as string);

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
    line: { text: r.line.text, pieceKey: r.line.parts[0], move: r.line.move },
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
  ...(node.end ? { end: { outcome: node.end.outcome } } : {}),
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
      { usage: pageUsage, strict: true },
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

const scenes: ComposedScene[] = [];
const pieceGaps = new Map<string, string[]>();
const usedCasts = new Set<string>();

for (const typeKey of purposeTypes) {
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
    purpose: type.purpose,
    askerId: best.spec.askerId,
    askedId: best.spec.askedId,
    records: best.spec.records,
    standIn: best.spec.standIn,
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
  scene.variants[(scene.i - 1) % scene.variants.length]!;
const testsOf = (scene: ComposedScene) => {
  const lead = leadOf(scene);
  return {
    purpose: scene.purpose,
    profile: lead.profile.id,
    branches: branchesOf(lead.talk),
  };
};

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
      root: slim(leadOf(scene).talk.tree, scene.sourceText),
    })),
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
  `Place: ${world.placeName} (the cached played world, seed ${world.seed}). ${json.count} scenes: ${scenes.length} with a purpose, one for each situation type, staged as proof scenes from the world's real people and records (their producers are awaited), and ${directorChosen.length} that the director fires in the cached year from a cause record, each of a different situation type. No two scenes share a narration, an open or a statement. Words come only from data/english/parts/scene-talk.json and the conversation bank.`,
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
    `## Scene ${scene.i}: ${scene.typeKey} (${scene.key}, ends in ${scene.endpoint}) — proof scene`,
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
        `${pad}- *Ends ${node.end.outcome}${node.end.close ? `: ${node.end.close.speaker}: ${node.end.close.text}` : ""}*`,
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
