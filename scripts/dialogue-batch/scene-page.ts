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
const id = option("id", "batch-13");
const cache = option("cache", "");
const profileCount = Number(option("profiles", "5"));
const perType = Number(option("per-type", "3"));

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
  // A donor leans on you only with the share of the money that earns it.
  if (donorShare(gift) < donorThreshold) continue;
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
      money: fact(`$${Math.round(gift.totalMinor / 100)}`, [gift.id]),
      share: fact("most of", [gift.id, gift.campaignId]),
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
  lines: node.lines.map((l: SceneTalkLine) => ({
    speaker: l.speaker,
    text: l.text,
    pieceKey: l.parts[0],
    ...(l.auto ? { auto: true } : {}),
  })),
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

const scenes: ComposedScene[] = [];
const skippedTypes: { typeKey: string; reason: string }[] = [];
const seenCast = new Set<string>();
const pageUsage = new Map<string, number>();
const pieceGaps = new Map<string, number>();
const seenReplySets = new Set<string>();
const dropped = {
  sameCast: 0,
  sameReplies: 0,
  identicalProfile: 0,
  composeSkipped: 0,
};

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
  let kept = 0;
  let lastReason = "";
  for (const spec of candidates) {
    if (kept >= perType) break;
    // No two scenes of a type share a cast: the same pair, or the same
    // asker or the same asked seat, is one scene.
    const castKey = `${typeKey}|${[spec.askerId, spec.askedId].sort().join("|")}`;
    if (
      seenCast.has(castKey) ||
      seenCast.has(`${typeKey}|asker|${spec.askerId}`) ||
      seenCast.has(`${typeKey}|asked|${spec.askedId}`)
    ) {
      dropped.sameCast += 1;
      continue;
    }
    // A lie is caught only where the asker holds the record that contradicts
    // it: a person they know stands as the source (no knowledge record says
    // yet that they know the truth, so this is listed as stood in).
    const asker = core.people.get(spec.askerId)!;
    const contact = order(
      [...asker.knownIds].filter(
        (other) =>
          other !== spec.askedId &&
          other !== spec.askerId &&
          core.people.get(other)?.alive,
      ),
      `source:${spec.askerId}:${spec.askedId}`,
      (x) => x,
    )[0];
    const role = roleOf(spec.askerId);
    const stagedFacts: Record<string, Fact> = {
      ...spec.facts,
      ...(role && !spec.facts.asker_role ? { asker_role: role } : {}),
      ...(contact && !spec.facts.source
        ? {
            source: fact(nameOf(contact), [contact]),
            "knows-truth": flag([contact]),
          }
        : {}),
    };
    if (contact && !spec.facts.source)
      spec.standIn.push(
        "where a lie is caught, the source is a person the asker knows; no knowledge record says yet that they know the truth",
      );
    const variants: ComposedScene["variants"] = [];
    const seenWords = new Set<string>();
    let outcome = "";
    for (const profile of profiles) {
      const result = composeSceneTalk(
        core,
        world.director,
        { askerId: spec.askerId, askedId: spec.askedId },
        type as PurposeType,
        stagedFacts,
        { askerTraits: profile.traits, askedTraits: profile.traits },
        // Openers, statements and closers used least so far on the page are
        // said; the page grades the parts held until the owner grades them.
        { usage: pageUsage, includeHeld: true },
      );
      if (result.kind === "skipped") {
        lastReason = result.reason;
        dropped.composeSkipped += 1;
        break;
      }
      const words = result.talk.lines.map((line) => line.text).join("|");
      if (seenWords.has(words)) {
        dropped.identicalProfile += 1;
        continue;
      }
      seenWords.add(words);
      outcome = result.talk.outcome;
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
    for (const gap of variants[0]?.talk.gaps ?? [])
      pieceGaps.set(gap, (pieceGaps.get(gap) ?? 0) + 1);
    if (!variants.length) continue;
    // No two scenes share a reply set (the first round's four replies).
    const replySet = variants[0]!.talk.rounds[0].replies
      .map((reply: SceneTalkLine) => reply.text)
      .join(" / ");
    if (seenReplySets.has(replySet)) {
      dropped.sameReplies += 1;
      continue;
    }
    seenReplySets.add(replySet);
    seenCast.add(castKey);
    seenCast.add(`${typeKey}|asker|${spec.askerId}`);
    seenCast.add(`${typeKey}|asked|${spec.askedId}`);
    // What this scene said as setup, open, statement and close counts as used.
    for (const line of variants[0]!.talk.lines as SceneTalkLine[])
      if (["narrate", "open", "state", "close"].includes(line.step))
        for (const piece of line.parts)
          pageUsage.set(piece, (pageUsage.get(piece) ?? 0) + 1);
    kept += 1;
    scenes.push({
      i: scenes.length + 1,
      typeKey,
      key: type.tag.key,
      endpoint: type.tag.endpoint,
      purpose: type.purpose,
      askerId: spec.askerId,
      askedId: spec.askedId,
      records: spec.records,
      standIn: spec.standIn,
      ...(stagedFacts.source ? { sourceText: stagedFacts.source.text } : {}),
      variants,
    });
    void outcome;
  }
  if (!kept)
    skippedTypes.push({
      typeKey,
      reason: lastReason || "no cast of the world could word it",
    });
}

/* ----------------------------------------------------------------- output */

const stoodIn = [
  ...new Set([
    ...scenes.flatMap((scene) => scene.standIn),
    "bill names come from the government engine's records as they are",
  ]),
].sort();
const json = {
  id,
  title: `Scenes with a purpose, ${id}`,
  place: world.placeName,
  seed: world.seed,
  profiles: profiles.map((p) => ({ id: p.id, traits: p.traits })),
  count: scenes.length,
  situations: [...new Set(scenes.map((s) => s.typeKey))],
  skipped: skippedTypes,
  dropped,
  stoodIn,
  pieceGaps: Object.fromEntries([...pieceGaps]),
  // One tree per scene, in the shape the page builder reads: the first profile's
  // exchange, every reply's branch, a lie's caught and believed outcomes.
  scenes: scenes.map((scene) => ({
    id: `${scene.typeKey}:${scene.askerId}:${scene.askedId}`,
    purpose: scene.purpose,
    type: scene.typeKey,
    place: world.placeName,
    seed: world.seed,
    cast: [scene.askerId, scene.askedId],
    proof: true,
    narration: scene.variants[0]!.talk.narration.map(
      (l: SceneTalkLine) => l.text,
    ),
    longestPath: scene.variants[0]!.talk.depth,
    nodes: scene.variants[0]!.talk.nodes,
    root: slim(scene.variants[0]!.talk.tree, scene.sourceText),
  })),
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
      // The trait-led path, flat, for the bench features and apply-grades.
      lines: variant.lines,
      // The whole exchange: every reply's branch, after a lie both outcomes.
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
mkdirSync("data/english/batches", { recursive: true });
writeFileSync(
  `data/english/batches/${id}.json`,
  `${JSON.stringify(json, null, 2)}\n`,
);

const out: string[] = [];
out.push(
  `# Scenes with a purpose, ${id}`,
  "",
  `Place: ${world.placeName} (the cached played world, seed ${world.seed}). ${scenes.length} scenes of ${json.situations.length} situation types, composed by \`composeSceneTalk\` (src/director/scene-talk.ts) once per personality profile (${profiles.map((p) => p.id).join(", ")}); a profile is shown only where its words differ. Every scene is a **proof scene**: the director fires none of these situations in the cached year (their producers are awaited), so each is staged from the real people and records listed under it. Words come only from data/english/parts/scene-talk.json.`,
  "",
  "Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.",
  "",
  `Situations: ${json.situations.join(", ")}.`,
  "",
);
if (skippedTypes.length) {
  out.push("## Situations not staged", "");
  for (const row of skippedTypes) out.push(`- ${row.typeKey}: ${row.reason}`);
  out.push("");
}
if (pieceGaps.size) {
  out.push("## Pieces the bank lacks (purpose / step / move)", "");
  for (const [gap, count] of [...pieceGaps].sort())
    out.push(`- ${gap} (${count} scene${count === 1 ? "" : "s"})`);
  out.push("");
}
out.push("## What was stood in", "");
for (const row of stoodIn) out.push(`- ${row}`);
out.push(
  "",
  `Dropped: ${dropped.sameCast} repeated casts, ${dropped.sameReplies} repeated reply sets, ${dropped.identicalProfile} profiles whose words matched another, ${dropped.composeSkipped} compositions skipped for a missing fact.`,
  "",
);
for (const scene of scenes) {
  out.push(
    `## Scene ${scene.i}: ${scene.typeKey} (${scene.key}, ends in ${scene.endpoint}) — proof scene`,
    "",
    `*Purpose ${scene.purpose}. Records: ${scene.records.join(", ")}.*`,
    "",
  );
  scene.variants.forEach((variant, at) => {
    const narration = variant.lines.filter((l) => l.role === "narrator");
    if (at === 0 && narration.length)
      out.push(`> ${narration.map((l) => l.text).join(" ")}`, "");
    out.push(
      `**Profile ${variant.profile.id}** (outcome ${variant.outcome})`,
      "",
    );
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
    show(variant.lines.filter((l) => l.role !== "narrator"));
    // The whole exchange as a tree, once per scene, for the first profile shown.
    if (at === 0) {
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
        `**The whole exchange** (${variant.talk.nodes} nodes; endings: ${variant.talk.endings.join(", ")}; ★ is the branch this profile's traits lean toward):`,
        "",
      );
      outline(variant.talk.tree, 0);
      out.push("");
    }
    out.push(
      `<sub>${variant.lines
        .map(
          (l) =>
            `L${l.n} ${(l as any).step}/${l.move}/${l.register}/${l.bearing ?? "none"}/${l.words}w${l.sentences}s [${l.parts.join(", ")}]`,
        )
        .join("; ")}</sub>`,
      "",
    );
  });
}
mkdirSync("docs/grading", { recursive: true });
writeFileSync(`docs/grading/words-${id}.md`, `${out.join("\n")}\n`);
console.log(
  `${scenes.length} scenes (${json.items.length} profile talks) of ${json.situations.length} types; skipped ${skippedTypes.length} types: ${skippedTypes.map((s) => s.typeKey).join(", ") || "none"}; dropped ${JSON.stringify(dropped)}`,
);
