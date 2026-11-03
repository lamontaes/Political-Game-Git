/**
 * Shared reading for the platform tests (campaign-platform.test.ts and
 * campaign-platform-played.test.ts): the town's electorate on each side of a
 * question, read by the readers the ballot scores a platform by (`appealFor`:
 * `agreementWith` for a named adult at `voterLean`; the counted ballot:
 * `groupAgreement` for a counted record at `personLean` with its faith and
 * degree, `countedStanceProfile`; each on a one-question platform at
 * position 1), apart from the platform engine's own count
 * (`electorateSides`), so a count, weight or tier that departs from the
 * ballot's would show. The leans are the ballot's own readers, shared by
 * design; the counting, the weights and the denominator are the kit's.
 */
import { groupAgreement, personLean } from "./campaign-views";
import { countedResidents } from "./electorate";
import type { CountedVoter } from "./electorate";
import { townLean } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { electorateRoll, voterLean } from "./modules/voting";
import type { StanceProfile } from "./campaign-views";
import type { CoreAPI, CoreState } from "./types";

/**
 * The views engine's readers, passed in by the test (the views engine's file
 * is not an entry other families may import): its agreement reader for a
 * named adult and a counted record's faith and degree profile.
 */
export interface ViewsReaders {
  readonly agreementWith: (
    api: CoreAPI,
    personId: string,
    lean: number,
    platform: readonly { question: string; position: number }[],
  ) => number;
  readonly countedStanceProfile: (
    api: CoreAPI,
    voter: CountedVoter,
  ) => StanceProfile;
}

/** The electorate on a question by the agreement readers. */
export interface AgreementSides {
  /** The share whose agreement with "yes" is above zero. */
  readonly yes: number;
  /** The share whose agreement with "yes" is below zero. */
  readonly no: number;
  /** The electorate's mean agreement with "yes", -1 to 1. */
  readonly mean: number;
  /** The people the electorate stands for. */
  readonly people: number;
}

/**
 * Each voter on the town's roll (`electorateRoll`: a named adult once, a
 * counted record as many times as the people it stands for), at the lean the
 * ballot reads them at (a named adult's `voterLean`, a counted record's place
 * in the town's lean order), read by the agreement reader of their tier on
 * the platform "yes on this question".
 */
export function sidesByAgreement(
  api: CoreAPI,
  question: string,
  views: ViewsReaders,
): AgreementSides {
  const core = api.state as CoreState;
  if (!core.modules.has(ELECTIONS_MODULE_ID))
    return { yes: 0, no: 0, mean: 0, people: 0 };
  const records = new Map(countedResidents(core).map((row) => [row.id, row]));
  const lean0 = townLean(api);
  const platform = [{ question, position: 1 }];
  let yes = 0,
    no = 0,
    sum = 0,
    all = 0;
  for (const row of electorateRoll(api)) {
    const named = row.target === "person";
    const who = named ? core.people.get(row.id) : records.get(row.id);
    if (!who) continue;
    const agree = named
      ? views.agreementWith(
          api,
          row.id,
          voterLean(api, core.people.get(row.id)!),
          platform,
        )
      : groupAgreement(
          personLean(core.people, who, lean0),
          platform,
          views.countedStanceProfile(api, who as CountedVoter),
        );
    all += row.count;
    sum += row.count * agree;
    if (agree > 0) yes += row.count;
    else if (agree < 0) no += row.count;
  }
  return all
    ? { yes: yes / all, no: no / all, mean: sum / all, people: all }
    : { yes: 0, no: 0, mean: 0, people: 0 };
}

/**
 * The electorate's mean agreement with a platform, by the same readers: the
 * mean, over its stated positions, of the position times the electorate's
 * mean agreement with "yes" on the question (agreement is the mean of view
 * times position, so the electorate's mean is this).
 */
export function electorateAgreement(
  platform: readonly { question: string; position: number }[],
  sides: (question: string) => AgreementSides,
): number {
  if (!platform.length) return 0;
  return (
    platform.reduce((t, s) => t + s.position * sides(s.question).mean, 0) /
    platform.length
  );
}
