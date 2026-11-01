/**
 * Shared reading for the platform tests (campaign-platform.test.ts and
 * campaign-platform-played.test.ts): the town's electorate on each side of a
 * question, read by the readers the vote and the campaign engines score a
 * platform by (`agreementWith` for a named adult, `groupAgreement` for a
 * counted record, each on a one-question platform at position 1), apart from
 * the platform engine's own count (`electorateSides`), so a stance rule that
 * departs from the vote's would show.
 */
import { groupAgreement, personLean } from "./campaign-views";
import { countedResidents } from "./electorate";
import type { CountedVoter } from "./electorate";
import { townLean } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { electorateRoll } from "./modules/voting";
import {
  agreementWith,
  countedStanceProfile,
  VIEWS_MODULE_ID,
} from "./modules/views";
import type { CoreAPI, CoreState } from "./types";

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
 * counted record as many times as the people it stands for), at their place
 * in the town's lean order, read by the agreement reader of their tier on
 * the platform "yes on this question".
 */
export function sidesByAgreement(
  api: CoreAPI,
  question: string,
): AgreementSides {
  const core = api.state as CoreState;
  if (!core.modules.has(ELECTIONS_MODULE_ID))
    return { yes: 0, no: 0, mean: 0, people: 0 };
  const records = new Map(countedResidents(core).map((row) => [row.id, row]));
  const views = core.modules.has(VIEWS_MODULE_ID);
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
    const lean = personLean(core.people, who, lean0);
    const agree = named
      ? agreementWith(api, row.id, lean, platform)
      : groupAgreement(
          lean,
          platform,
          views ? countedStanceProfile(api, who as CountedVoter) : null,
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
