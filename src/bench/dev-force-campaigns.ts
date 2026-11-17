/**
 * Dev mode forces the campaigns' scenes through the campaigns engine's own writers (pool item
 * dev-force-every-scene-through-its-writer; owner, Nov 15: "a part of the dev mode should be able to
 * trace and force every scene to play"). A campaign's scenes follow a filing, so each recipe starts
 * from one: the player's own (the elections' recipe, dev-force-elections.ts: the world runs to a
 * race that takes their filing and they file at the counter), or, for an ask to endorse, the filing
 * of the person closest to the player who may run. Then the campaign does what it does in play:
 *  - `offer` (volunteer-offer, manager-offer): the world runs while the people the player knows
 *    weigh helping, until one offers in the role the type is about (volunteer-offered);
 *  - `rival` (rival-word): the world runs until someone tells the player what a rival said
 *    (rival-word);
 *  - `gift` (donor-ask): the player calls donors through the campaign day's own raise-money choice
 *    (`DevMode.raiseMoney`) until one gives (campaign-gift);
 *  - `endorse` (endorsement-ask): the closest person to the player who may run files at the counter
 *    (`fileCandidacy` with the stands their own views give), and the world runs until their campaign
 *    asks the player to endorse them (endorsement-asked).
 * The people in it decide by their own reasons: where nobody does within the run, the force says so.
 * The caller marks every write `scene-forced`; a forced scene never counts as played.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { platformForContest } from "../core2/modules/candidacy";
import {
  fileCandidacy,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreAPI, PersonId } from "../core2/types";
import { fileSoonest, waitingFiling } from "./dev-force-elections";
import type { DevMode } from "./dev-mode";

type Way = "offer" | "rival" | "gift" | "endorse";

/** The campaigns' situation types dev mode can force, by recipe. */
export const CAMPAIGNS_SCENES: Readonly<Record<string, Way>> = {
  "volunteer-offer": "offer",
  "manager-offer": "offer",
  "rival-word": "rival",
  "donor-ask": "gift",
  "endorsement-ask": "endorse",
};

/** The campaigns' types no recipe can force, with why (a reason key of the scene view's labels). */
export const CAMPAIGNS_REASONS: Readonly<Record<string, string>> = {};

/** Why a recipe could not run, or ran and did not bring the cause, a reason key of the view's labels. */
export type CampaignsRefusal =
  | "no-race"
  | "no-runner"
  | "no-offer"
  | "no-rival-word"
  | "no-gift"
  | "no-endorse-ask"
  | "no-player";

export interface CampaignsForce {
  readonly recipe: "campaigns";
  readonly way: Way;
  readonly personId: string | null;
  readonly written: readonly string[];
  readonly causeRecords: readonly string[];
  readonly staged: boolean;
  readonly outcome: string | null;
  readonly heldBack: readonly { typeKey: string; reason: string }[];
  readonly refused?: CampaignsRefusal;
}

/** How long the world may run for the campaign's people to act: two months of days. */
const RUN = 60;
/** How long it may run for a race that takes a filing: two years of days. */
const CAP = 730;

/** The kind of record each recipe waits for, and the facts that make it the type's. */
const WAITS: Readonly<
  Record<Exclude<Way, "gift">, { kind: string; refusal: CampaignsRefusal }>
> = {
  offer: { kind: "volunteer-offered", refusal: "no-offer" },
  rival: { kind: "rival-word", refusal: "no-rival-word" },
  endorse: { kind: "endorsement-asked", refusal: "no-endorse-ask" },
};

/**
 * The person closest to the player who files for a race that takes their filing: family first, then
 * the people the player knows, each in id order, the world running a day at a time until a race
 * takes one of them (their own stands, as a runner's filing carries).
 */
function runnerFiles(
  mode: DevMode,
  api: CoreAPI,
  playerId: string,
): FilingRow | undefined {
  const player = mode.core.people.get(playerId)!;
  const alive = (ids: Iterable<string>) =>
    [...ids]
      .filter((id) => id !== playerId && mode.core.people.get(id)?.alive)
      .sort();
  const close = [...alive(player.familyIds), ...alive(player.knownIds)];
  if (!close.length) return undefined;
  for (let day = 0; day <= CAP; day += 1) {
    const races = [...openContests(api)].sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );
    for (const personId of close)
      for (const contest of races) {
        const result = fileCandidacy(api, {
          personId,
          contestId: contest.id,
          platform: platformForContest(
            api,
            personId as PersonId,
            null,
            contest,
          ),
          party: null,
        });
        if (result.status !== "refused") return result.filing;
      }
    mode.advance(addDays(makeIsoDate(mode.core.date), 1));
  }
  return undefined;
}

/** Forces one of the campaigns' situation types for the player through the campaigns' own writers. */
export function forceCampaignsScene(
  mode: DevMode,
  typeKey: string,
): CampaignsForce {
  const way = CAMPAIGNS_SCENES[typeKey];
  if (!way) throw new Error("No such situation type.");
  const api = coreAPI(mode.core);
  const playerId = mode.core.playerId as PersonId | undefined;
  const written: string[] = [];
  const refuse = (refused: CampaignsRefusal): CampaignsForce => ({
    recipe: "campaigns",
    way,
    personId: playerId ?? null,
    written,
    causeRecords: [],
    staged: false,
    outcome: null,
    heldBack: [],
    refused,
  });
  if (!playerId || !mode.director || !mode.core.people.get(playerId)?.alive)
    return refuse("no-player");
  if (!mode.director.ledger.people.has(playerId))
    mode.director.watch(mode.core, playerId);
  const book = mode.director.ledger.people.get(playerId)!;
  const day = () => mode.advance(addDays(makeIsoDate(mode.core.date), 1));

  // The filing the campaign runs on.
  let filing: FilingRow | undefined;
  if (way === "endorse") {
    filing = runnerFiles(mode, api, playerId);
    if (!filing) return refuse("no-runner");
  } else {
    filing =
      waitingFiling(api, playerId, mode.core.date) ??
      fileSoonest(mode, api, playerId);
    if (!filing) return refuse("no-race");
  }
  written.push(filing.id);
  const scheduled = book.schedule.length;

  if (way === "gift") {
    const raised = mode.raiseMoney(filing.id);
    const gift = [...(mode.core.logByKind.get("campaign-gift") ?? [])].find(
      (id) =>
        mode.core.durableLog.get(id)?.facts?.candidateId === playerId &&
        mode.core.durableLog.get(id)?.date === mode.core.date,
    );
    if (!raised.gave.length || !gift) return refuse("no-gift");
    written.push(gift);
    day();
  } else {
    // The record the type is about: one naming the player, with the role the type asks for.
    const { kind, refusal } = WAITS[way];
    const role =
      typeKey === "manager-offer"
        ? "manager"
        : typeKey === "volunteer-offer"
          ? "volunteer"
          : undefined;
    const seen = new Set(mode.core.logByKind.get(kind) ?? []);
    const fresh = () =>
      [...(mode.core.logByKind.get(kind) ?? [])].filter((id) => {
        if (seen.has(id)) return false;
        const record = mode.core.durableLog.get(id);
        const named =
          way === "endorse"
            ? record?.facts?.askedId === playerId
            : record?.facts?.invitedId === playerId;
        return named && (!role || record?.facts?.role === role);
      });
    let found: string | undefined;
    for (let n = 0; !found && n < RUN; n += 1) {
      day();
      found = fresh()[0];
    }
    if (!found) return refuse(refusal);
    written.push(found);
    // A scene from a record written today is staged at the day's end; one more day where it is not yet.
    if (
      !book.schedule
        .slice(scheduled)
        .some((row) => book.momentsById.get(row.momentId)?.causeId === found)
    )
      day();
  }

  const fresh = book.schedule.slice(scheduled);
  const bound = fresh.find((row) =>
    row.bindings.some((binding) => binding.typeKey === typeKey),
  );
  const moment = bound ? book.momentsById.get(bound.momentId) : undefined;
  return {
    recipe: "campaigns",
    way,
    personId: playerId,
    written,
    causeRecords: moment ? [moment.causeId] : [],
    staged: !!bound,
    outcome: bound?.outcome ?? null,
    heldBack: fresh.flatMap((row) =>
      (row.heldBack ?? []).filter((held) => held.typeKey === typeKey),
    ),
  };
}
