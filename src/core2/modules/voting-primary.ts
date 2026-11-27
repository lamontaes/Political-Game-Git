/**
 * Primaries: who files, the nominees, and the primary's count.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import {
  countPlaces,
  countedAppeal,
  countedChoice,
  countedShareRule,
  countedEndorsed,
  type CountedVoter,
} from "../electorate";
import { barredFromVoting } from "../laws-in-force";
import { interestOf } from "../turnout";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { basePlaces } from "../race-places";
import {
  announce,
  checkEligibility,
  filingRulesFor,
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
  filledByTickets,
} from "./elections";
import { townLean } from "./campaigns";
import {
  type TermRow,
  servingTermsOnSeat,
  termById,
  seatById,
} from "./offices";
import { officialCandidate } from "./officials";
import { PARTIES_MODULE_ID, joinParty, partiesHere, partyTie } from "./parties";
import { partyFieldsNominee } from "./candidacy";
import { historyMode } from "../electorate-century";
import { countedStanceProfile } from "./views";
import { trustWeight } from "./news";
import {
  appealFor,
  countedDivision,
  countedField,
  countedPledges,
  countedWarmths,
  incumbentLeanOf,
} from "./voting-appeal";
import {
  ageOn,
  nationalParty,
  partySide,
  slug,
  table,
  town,
} from "./voting-base";
import { countedVoters, winningPersonId } from "./voting-count";
import {
  contactsOf,
  heldPledge,
  localOnBallot,
  townContacts,
} from "./voting-polling-day";
import { electorateSample, racePlaces } from "./voting-returns";
import { formTickets } from "./voting-tickets";
import { decideTurnout } from "./voting-turnout";

/**
 * When filing closes: who runs is candidacy's, from people's own records
 * (installed in every world by `openVoting`). A statewide partisan race (no
 * district) still draws each major party's nominee where no one of that side
 * filed, since parties field statewide tickets: a named official, or a person
 * filled in to run for the party (SG-GOV-who-runs-stand-in).
 */
export function fileStandingCandidates(api: CoreAPI, contestId: string): void {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  // A running mate's office is filled by the governor candidates' tickets.
  if (filledByTickets(api, contest)) return;
  fileNominees(api, contest);
  formTickets(api, contest, "filing");
}

/** A contest's right two-party share: its places' votes-weighted lean, the town's own where none is counted. */
export function contestRightShare(api: CoreAPI, contest: ContestRow): number {
  const { places } = basePlaces(api, contest);
  const votes = places.reduce((s, p) => s + p.votes2024, 0);
  return votes
    ? places.reduce((s, p) => s + p.votes2024 * p.rightShare, 0) / votes
    : (1 + townLean(api)) / 2;
}

/** Each major party's nominee for a statewide partisan race where none of that side filed. */
function fileNominees(api: CoreAPI, contest: ContestRow): void {
  const contestId = contest.id;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  // Whoever holds the seat when filing closes: an appointee to a vacancy,
  // never a holder who died or moved away.
  const incumbent =
    (servingTermsOnSeat(api, contest.seatId)[0] as unknown as
      TermRow | undefined) ??
    (contest.incumbentTermId
      ? (termById(api, contest.incumbentTermId) as unknown as
          TermRow | undefined)
      : undefined);
  // Each nominee stands where the place's records say filings go, on the
  // same rules any candidate meets, and the filing is announced. A full
  // person who doesn't meet the rules isn't put on the ballot. The party's
  // nomination is made when filing closes, so its filing counts as on time.
  const put = (personId: string, party: string) => {
    if (ballot(api, contestId).some((f) => f.personId === personId)) return;
    if (
      api.state.people.has(personId) &&
      checkEligibility(api, personId, contestId, party).some(
        (c) => !c.met && c.rule !== "filing-deadline",
      )
    )
      return;
    // stopgapId: SG-GOV-who-runs-stand-in
    api.stopgap("SG-GOV-who-runs-stand-in");
    const filing: FilingRow = {
      id: `filing:${contestId}:${personId}`,
      contestId,
      personId,
      filedOn: api.state.date,
      filedWith: filingRulesFor(api, contest, "party").filedWith,
      platform: [],
      party,
      status: "on-ballot",
      how: "party nominee",
    };
    filings.put(filing as unknown as ModuleRow);
    announce(api, filing, contest);
  };
  const partisan =
    incumbent?.party ??
    (
      seatById(api, contest.seatId) as unknown as
        { party?: string | null } | undefined
    )?.party;
  if (
    (contest.level !== "federal" && contest.level !== "state") ||
    contest.district ||
    !partisan
  )
    return;
  // In a century world a party stands its nominee only where its chance in
  // the seat covers what standing one costs (`partyFieldsNominee`).
  const century = historyMode(api.state.seed) === "century";
  const right = century ? contestRightShare(api, contest) : 0.5;
  for (const party of [-1, 1].map((side) => partyOnSide(api, side)))
    if (
      (!century || partyFieldsNominee(api, partySide(party), right)) &&
      !ballot(api, contestId).some(
        (f) => partySide(f.party ?? null) === partySide(party),
      )
    ) {
      const nominee =
        officialCandidate(api, contest, party) ??
        officialCandidateId(`nominee:${party}:${contest.id}`);
      // The party's nominee is its member: a person filled in to run for it
      // joins it the day they file.
      const partyHere = api.state.modules.has(PARTIES_MODULE_ID)
        ? partiesHere(api).find((row) => row.name === party)
        : undefined;
      if (partyHere && api.state.people.has(nominee) && !partyTie(api, nominee))
        joinParty(api, nominee, partyHere.id);
      put(nominee, party);
    }
}

/**
 * The party that stands for a side of the scale in the town's state: the
 * largest party on that side in the state's own record (its 2024 ballot or
 * legislature), else the national party of that side (party-sides data).
 */
function partyOnSide(api: CoreAPI, side: number): string {
  const best = partiesHere(api)
    .filter((p) => p.side === side)
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))[0];
  return best?.name ?? nationalParty(side);
}

/** A named official on the ballot who isn't a full person in the world yet. */
export function officialCandidateId(key: string): string {
  return `official:${key}`;
}

/**
 * The primary, by the state's method. A party primary picks one nominee per
 * party from that party's voters (and independents where the state lets
 * them in); a top-two or top-four primary puts every candidate before every
 * voter and sends the top finishers on. Candidates who don't advance leave
 * the November ballot. Counted from the named voters, the sample of the
 * party's electorate the world names.
 */
export function holdPrimary(
  api: CoreAPI,
  contestId: string,
): {
  /** Every candidate's votes, named, counted and wider electorate together. */
  readonly votes: Readonly<Record<string, number>>;
  /** The named voters' share of them. */
  readonly namedVotes: number;
} {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  // A running mate's office is nominated with its governor's ticket.
  if (filledByTickets(api, contest)) return { votes: {}, namedVotes: 0 };
  const counted = countPrimary(api, contest);
  formTickets(api, contest, "primary");
  return counted;
}

function countPrimary(
  api: CoreAPI,
  contest: ContestRow,
): {
  readonly votes: Readonly<Record<string, number>>;
  readonly namedVotes: number;
} {
  const contestId = contest.id;
  const filings = ballot(api, contestId);
  const parties = partiesHere(api);
  const method = parties[0]?.nominationMethod ?? "party-primary";
  const access = parties[0]?.voterAccess ?? "";
  const date = api.state.date;
  // One trip to the polls covers the whole ballot: a local race on it counts.
  const localDay = localOnBallot(api, date);
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  const lean0 = townLean(api);
  const named = [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        ageOn(p, date) >= adultAge &&
        !barredFromVoting(api, p.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const counted = countedVoters(api).filter(
    (v) => v.placeId === townPlaceId && ageOn(v, date) >= adultAge,
  );
  // Who identifies with a party: the firmest leans in town, at the real
  // identifier share (the same rule the parties engine ties named people by).
  const leanOf = new Map<string, number>(
    [...named, ...counted].map((v) => [
      v.id,
      personLean(api.state.people, v, lean0),
    ]),
  );
  const firm = [...leanOf.values()].map(Math.abs).sort((a, b) => b - a);
  const cut =
    firm[
      Math.max(
        0,
        Math.round(firm.length * campaignParameter("partyIdentifierShare")) - 1,
      )
    ] ?? 0;
  const extraCost = campaignParameter("primaryTurnoutCost");
  const votes: Record<string, number> = {};
  let namedVotes = 0;
  // Named voters: what reached them, as on election day.
  const countNamed = (
    field: readonly FilingRow[],
    who: readonly PersonState[],
  ) => {
    const candidates = new Set(field.map((f) => f.personId));
    for (const voter of who) {
      // The player's ballot is the player's own (`castBallot`): counted only
      // where they chose a candidate in this field.
      if (voter.id === (api.state as CoreState).playerId) {
        const chosen = (
          table(api, "chosen").get(`${contestId}|${voter.id}`) as unknown as
            { candidateId: string | null } | undefined
        )?.candidateId;
        if (chosen && field.some((f) => f.personId === chosen)) {
          votes[chosen] = (votes[chosen] ?? 0) + 1;
          namedVotes += 1;
        }
        continue;
      }
      const { appeal } = appealFor(api, voter, contest, field);
      const t = decideTurnout(api, voter, {
        date,
        interest: interestOf(appeal),
        extraCost,
        contacts: contactsOf(api, voter.id, candidates),
        local: localDay,
        pledged: heldPledge(appeal),
      });
      if (!t.votes) continue;
      const choice = field.some((f) => f.personId === voter.id)
        ? voter.id
        : countedChoice(appeal);
      if (choice) {
        votes[choice] = (votes[choice] ?? 0) + 1;
        namedVotes += 1;
      }
    }
  };
  // The wider electorate sees the field as the town's counted voters do: the
  // candidates' public standing, the incumbent's name and record, and their
  // places on the ballot (CTO, Oct 14: a race is never left blank by most
  // voters for want of a platform to tell candidates apart).
  const primaryField = (field: readonly FilingRow[]) =>
    countedField(api, contest, field);
  const countCounted = (
    field: readonly FilingRow[],
    who: readonly CountedVoter[],
  ) => {
    // The same view of the field the town's named voters have.
    const entries = countedField(api, contest, field);
    const reached = townContacts(
      api,
      date,
      new Set(field.map((f) => f.personId)),
    );
    // How a record's people divide in this race, read once for the count.
    const shares = countedShareRule(entries);
    for (const [form, voter] of who.entries()) {
      const trust = trustWeight(api, leanOf.get(voter.id) ?? 0);
      const where = {
        inTown: true,
        local: true,
        incumbentLean: incumbentLeanOf(api, voter),
        trust,
        // The town's people hold each form of a rotated ballot in turn.
        ballotForm: form,
        profile: countedStanceProfile(api, voter),
        warmths: countedWarmths(api, voter, entries),
        endorsed: countedEndorsed(
          leanOf.get(voter.id) ?? 0,
          entries,
          countedStanceProfile(api, voter),
        ),
        divides: true,
      };
      const pledges = countedPledges(api, voter.id, trust, contest.id, entries);
      const appeal = countedAppeal(leanOf.get(voter.id) ?? 0, entries, {
        ...where,
        pledges,
      });
      // Each counted voter stands for the town's people like them: their
      // vote counts at the share of them who turn out.
      const t = decideTurnout(api, voter, {
        date,
        interest: interestOf(appeal),
        extraCost,
        contacts: reached,
        pledged: heldPledge(appeal) / Math.max(1, voter.weight),
        recordedWeeklyMinutes: voter.weeklyMinutes,
        local: localDay,
      });
      // A record stands for `weight` real voters like it, who divide by the
      // race's rule (one model, two tiers).
      const division = countedDivision(
        appeal,
        pledges,
        voter.weight,
        () => countedAppeal(leanOf.get(voter.id) ?? 0, entries, where),
        shares,
      );
      for (const [backed, weight] of Object.entries(division.votes))
        votes[backed] = (votes[backed] ?? 0) + t.propensity * weight;
    }
  };
  // The primary's wider electorate (the rest of the town, county, district
  // or state) on the same engine: its places' party identifiers (and others
  // where the primary is open) at primary turnout.
  const townEligible = {
    named: named.length,
    counted: counted.reduce((n, v) => n + v.weight, 0),
  };
  const addWider = (field: readonly FilingRow[], side: number | null) => {
    const places = racePlaces(api, contest, filings, townEligible);
    if (!places.length) return;
    const wider = countPlaces(
      electorateSample(api, date, extraCost),
      places,
      primaryField(field),
      {
        side,
        cut,
        open: side === null || /open|unaffiliated|independ/i.test(access),
      },
    );
    for (const [id, n] of Object.entries(wider.votes))
      votes[id] = (votes[id] ?? 0) + n;
  };
  // Who the primary puts out, named on its record so each hears it.
  const out: string[] = [];
  const lose = (filing: FilingRow) => {
    out.push(filing.personId);
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({ ...filing, status: "withdrawn" } as unknown as ModuleRow);
  };
  const advancing = method === "top-two" ? 2 : method === "top-four" ? 4 : 0;
  if (advancing) {
    countNamed(filings, named);
    countCounted(filings, counted);
    addWider(filings, null);
    filings
      .slice()
      .sort(
        (a, b) =>
          (votes[b.personId] ?? 0) - (votes[a.personId] ?? 0) ||
          a.personId.localeCompare(b.personId),
      )
      .slice(advancing)
      .forEach(lose);
  } else {
    const byParty = new Map<string, FilingRow[]>();
    for (const f of filings)
      if (f.party) byParty.set(f.party, [...(byParty.get(f.party) ?? []), f]);
    for (const [party, field] of byParty) {
      // A party's one name is counted like any other field: the nominee
      // stands unopposed with the votes that came out for them.
      const open = /open|unaffiliated|independ/i.test(access);
      const side = partySide(party);
      countNamed(
        field,
        named.filter((v) => {
          const tie = partyTie(api, v.id);
          return (
            (tie?.partyId?.endsWith(slug(party)) ?? false) ||
            (open && tie?.tie !== "party")
          );
        }),
      );
      countCounted(
        field,
        counted.filter((v) => {
          const lean = leanOf.get(v.id) ?? 0;
          const identifies = Math.abs(lean) >= cut && lean !== 0;
          return (
            (identifies && side !== 0 && Math.sign(lean) === side) ||
            (open && !identifies)
          );
        }),
      );
      addWider(field, side);
      const ranked = field
        .slice()
        .sort(
          (a, b) =>
            (votes[b.personId] ?? 0) - (votes[a.personId] ?? 0) ||
            a.personId.localeCompare(b.personId),
        );
      // An exact tie at the top eliminates no one (the law's tie rule is
      // applied by the officials, not modeled yet); a sole name has no one to eliminate.
      if (
        ranked.length < 2 ||
        (votes[ranked[0]!.personId] ?? 0) === (votes[ranked[1]!.personId] ?? 0)
      )
        continue;
      const winner = ranked[0]!;
      field.filter((f) => f !== winner).forEach(lose);
    }
  }
  // Votes are whole: a record standing for many voters counts them at its
  // turnout share, and the total is rounded once at the end.
  for (const id of Object.keys(votes)) votes[id] = Math.round(votes[id]!);
  api.emit({
    id: `primary-result:${contestId}`,
    date,
    kind: "primary-result",
    personIds: filings
      .map((f) => winningPersonId(api, f.personId))
      .filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Primary count of ${contestId}`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: {
      contestId,
      office: contest.title,
      method,
      // The primary's own day: a race closed before the record began holds a
      // past primary on its first day (`closeAtOpening`).
      ...(contest.primaryDate ? { primaryDate: contest.primaryDate } : {}),
      votes: JSON.stringify(votes),
      namedVotes: String(namedVotes),
      outIds: JSON.stringify(
        out
          .map((id) => winningPersonId(api, id))
          .filter((id) => api.state.people.has(id))
          .sort(),
      ),
    },
  });
  return { votes, namedVotes };
}
