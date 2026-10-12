import type {
  NominationPlan,
  NominationMethod,
} from "../../simulation/nominations/nomination-rules";
import { ELECTION_PARAMETERS } from "./parameters";
export interface NominationEntrant {
  readonly personId: string;
  readonly party: string;
  readonly incumbent: boolean;
  readonly partyBacked: boolean;
}

type Status =
  | "unopposed"
  | "nominated"
  | "advanced"
  | "runoff"
  | "lost"
  | "conceded"
  | "tied";

interface Tally {
  readonly entrant: NominationEntrant;
  readonly permille: number;
}

function pullOf(
  entrant: NominationEntrant,
  partyShare: ((party: string) => number | null) | null,
): number {
  const base = entrant.incumbent
    ? ELECTION_PARAMETERS.nominationPull.value.incumbent
    : entrant.partyBacked
      ? ELECTION_PARAMETERS.nominationPull.value.partyBacked
      : ELECTION_PARAMETERS.nominationPull.value.other;
  const share = partyShare
    ? (partyShare(entrant.party) ?? ELECTION_PARAMETERS.missingPartyShare.value)
    : 1;
  return base * Math.max(share, ELECTION_PARAMETERS.partyShareFloor.value);
}

function tally(
  entrants: readonly NominationEntrant[],
  pull: (entrant: NominationEntrant) => number,
): readonly Tally[] {
  const pulls = entrants.map((entrant) => ({
    entrant,
    pull: pull(entrant),
  }));
  const total = pulls.reduce((sum, row) => sum + row.pull, 0);
  return pulls
    .map((row) => ({
      entrant: row.entrant,
      permille: Math.round((row.pull / total) * 1000),
    }))
    .sort(
      (a, b) =>
        b.permille - a.permille ||
        a.entrant.personId.localeCompare(b.entrant.personId),
    );
}

function tiedAtLine(tallies: readonly Tally[], goOn: number): number | null {
  const last = tallies[goOn - 1];
  const next = tallies[goOn];
  return last && next && last.permille === next.permille ? last.permille : null;
}

function reachesThreshold(
  permille: number,
  runoff: NonNullable<
    Extract<
      NominationPlan,
      {
        known: true;
      }
    >["runoff"]
  >,
): boolean {
  const threshold = runoff.thresholdPercent * 10;
  return runoff.outright === "at-least"
    ? permille >= threshold
    : permille > threshold;
}

function isAllParty(method: NominationMethod): boolean {
  return method !== "party-primary";
}

export function holdNominationPrimary(input: PrimaryFacts): PrimaryOutcome {
  const { plan } = input;
  const rows: {
    tally: Tally;
    status: Status;
    party: string;
  }[] = [];
  const runoffParties: string[] = [];
  const groups = isAllParty(plan.method)
    ? [{ party: "all", entrants: input.entrants }]
    : [...new Set(input.entrants.map((entrant) => entrant.party))]
        .sort()
        .map((party) => ({
          party,
          entrants: input.entrants.filter((entrant) => entrant.party === party),
        }));
  for (const group of groups) {
    const tallies = tally(group.entrants, (entrant) =>
      pullOf(entrant, isAllParty(plan.method) ? input.partyShare : null),
    );
    if (isAllParty(plan.method)) {
      const majority =
        plan.method === "all-party-majority" &&
        tallies.length > 0 &&
        tallies[0]!.permille > 500;
      const goOn = majority ? 1 : plan.advance;
      const tied = tiedAtLine(tallies, goOn);
      tallies.forEach((row, index) =>
        rows.push({
          tally: row,
          party: row.entrant.party,
          status:
            tallies.length === 1
              ? "unopposed"
              : tied !== null && row.permille === tied
                ? "tied"
                : index < goOn
                  ? majority
                    ? "nominated"
                    : "advanced"
                  : "lost",
        }),
      );
      continue;
    }
    if (tallies.length === 1) {
      rows.push({
        tally: tallies[0]!,
        party: group.party,
        status: "unopposed",
      });
      continue;
    }
    const [leader] = tallies as [Tally, Tally, ...Tally[]];
    const runoff = plan.runoff;
    let needsRunoff =
      runoff !== null &&
      runoff.date !== null &&
      !reachesThreshold(leader.permille, runoff) &&
      (runoff.minimumCandidates === null ||
        tallies.length >= runoff.minimumCandidates);
    if (needsRunoff && runoff!.onRequest) {
      needsRunoff = input.runoffRequested(group.party);
    }
    const tied = tiedAtLine(tallies, needsRunoff ? 2 : 1);
    tallies.forEach((row, index) =>
      rows.push({
        tally: row,
        party: group.party,
        status:
          tied !== null && row.permille === tied
            ? "tied"
            : needsRunoff
              ? index < 2
                ? "runoff"
                : "lost"
              : index === 0
                ? "nominated"
                : runoff?.onRequest &&
                    index === 1 &&
                    !reachesThreshold(leader.permille, runoff)
                  ? "conceded"
                  : "lost",
      }),
    );
    if (needsRunoff) runoffParties.push(group.party);
  }
  const runoffDate = runoffParties.length ? plan.runoff!.date : null;
  return { rows, runoffParties, runoffDate };
}
export interface PrimaryFacts {
  readonly plan: Extract<NominationPlan, { known: true }>;
  readonly entrants: readonly NominationEntrant[];
  readonly partyShare: (party: string) => number | null;
  readonly runoffRequested: (party: string) => boolean;
}
export interface PrimaryOutcome {
  readonly rows: readonly { tally: Tally; status: Status; party: string }[];
  readonly runoffParties: readonly string[];
  readonly runoffDate: string | null;
}

/** Pure KEEP portion of holdNominationRunoff; record lookup and living facts are caller-owned. */
export function countNominationRunoff(
  primary: {
    readonly tags: readonly string[];
    readonly participants: readonly {
      personId: string;
      detail: string | null;
    }[];
  },
  aliveOn: (personId: string) => boolean,
) {
  const parties = primary.tags
    .filter((tag) => tag.startsWith("runoff-party:"))
    .map((tag) => tag.slice("runoff-party:".length));
  const rows: {
    personId: string;
    detail: string;
  }[] = [];
  let tiedParties: string[] = [];
  for (const party of parties) {
    const primaryShare = new Map<string, number>();
    const entrants: NominationEntrant[] = primary.participants.flatMap(
      (participant) => {
        const [p, permille, status] = (participant.detail ?? "").split("|");
        if (p !== party || status !== "runoff") return [];
        primaryShare.set(participant.personId, Number(permille));
        return [
          {
            personId: participant.personId,
            party,
            incumbent: false,
            partyBacked: false,
          },
        ];
      },
    );
    const living = entrants.filter((entrant) => aliveOn(entrant.personId));
    const tallies = tally(living, (entrant) =>
      Math.max(
        primaryShare.get(entrant.personId) ?? 0,
        ELECTION_PARAMETERS.runoffPullFloor.value,
      ),
    );
    const tied = tiedAtLine(tallies, 1);
    if (tied !== null) tiedParties = [...tiedParties, party];
    tallies.forEach((row, index) =>
      rows.push({
        personId: row.entrant.personId,
        detail: `${party}|${row.permille}|${
          tied !== null && row.permille === tied
            ? "tied"
            : index === 0
              ? "nominated"
              : "lost"
        }`,
      }),
    );
  }

  return { rows, tiedParties };
}
