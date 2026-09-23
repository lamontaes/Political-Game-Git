/**
 * Mass play: one game driven through the functions the player's buttons call.
 *
 * Nothing here writes a World directly. Every change goes through the same
 * presentation writers the play shell invokes (the creator's Begin, the time
 * buttons, story choices, Work, Campaigns, party work, the continuation
 * screen), chosen by a seeded "persona" so each game presses different things.
 *
 * What it records is defects, not scores: a writer that throws on a choice its
 * own projection offered, a clock that will not move, a save that does not
 * survive a round trip, an integrity failure, and machinery or broken values
 * reaching text the player reads.
 */
import { writeFileSync } from "node:fs";
import { createOpeningLifeController } from "../../../src/presentation/opening-life";
import { explicitNewGameSetup } from "../../../src/presentation/new-game-geography";
import { openOrdinaryLife } from "../../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../../src/presentation/time-command";
import type { TimeCommand } from "../../../src/presentation/time-command";
import { DEFAULT_INTERRUPTIONS } from "../../../src/presentation/shell-navigation";
import {
  chooseStoryOption,
  projectStoryMoment,
} from "../../../src/presentation/life-story";
import { projectToday } from "../../../src/presentation/day-overview";
import { openingNeighborhoodWalkOffer } from "../../../src/presentation/life-scene-flow";
import {
  performVenueActivity,
  venueActivities,
} from "../../../src/presentation/venue-activity";
import {
  abandonUnperformableCommitment,
  declineVenueActivity,
} from "../../../src/presentation/scheduled-activity-choice";
import { projectPartyAndCommunityWork } from "../../../src/presentation/campaign-life-surface";
import {
  acceptPartyWork,
  attendPartyWork,
  declinePartyWork,
  requestPartyWork,
} from "../../../src/presentation/campaign-life-actions";
import { projectCampaignOffices } from "../../../src/presentation/campaign-office-discovery";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../../src/presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordedDistrictForOffice,
} from "../../../src/presentation/district-selection";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
} from "../../../src/presentation/nationwide-candidacy";
import { CAREER_PROVIDERS } from "../../../src/presentation/career-path7-provider";
import {
  continueAs,
  projectLifeContinuation,
} from "../../../src/presentation/people-continuation";
import { shellReadOnly } from "../../../src/presentation/life-continuation-shell";
import {
  careerEligibility,
  performCareerWork,
  respondCareerOffer,
  resignCareer,
  seekCareerOffer,
  startCareerWork,
  careerOfferAccepted,
} from "../../../src/simulation/career-path7";
import {
  LIFE_PATHS2_HANDLERS,
  pathForRelationship,
} from "../../../src/simulation/life-paths2";
import {
  assertWorldIntegrity,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  serializeWorld,
  workStatusAt,
} from "../../../src/simulation";
import type { EntityId, World } from "../../../src/simulation";
import { searchLifePlaces } from "../../../src/simulation/life-places";

export type Persona =
  "random" | "terrible" | "ambitious" | "idle" | "chaotic" | "dynasty";

export interface GameSpec {
  readonly id: string;
  readonly seed: string;
  readonly placeKey: string;
  readonly placeName: string;
  readonly usps: string;
  readonly persona: Persona;
  readonly startAge: number;
  readonly years: number;
  /** Stop after this many generations have been played. */
  readonly generations: number;
  readonly wallMs: number;
}

export interface Finding {
  readonly kind:
    | "crash"
    | "offered-action-threw"
    | "stuck-clock"
    | "stuck-scene"
    | "time-refused"
    | "roundtrip"
    | "integrity"
    | "text"
    | "impossible"
    | "no-successor"
    | "slow";
  readonly signature: string;
  readonly detail: string;
  readonly date: string;
  readonly action: string | null;
}

export interface GameResult {
  readonly spec: GameSpec;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly steps: number;
  readonly actions: Readonly<Record<string, number>>;
  readonly generationsPlayed: number;
  readonly ended: string;
  readonly offices: readonly string[];
  readonly ms: number;
  readonly findings: readonly Finding[];
}

/* ------------------------------------------------------------------------ */

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Text a player must never read. */
const MACHINERY = [
  [/\bundefined\b/, "undefined"],
  [/\bNaN\b/, "NaN"],
  [/\[object /, "[object"],
  [/\bnull\b/, "null"],
  [/Infinity/, "Infinity"],
  [/\b\d{4}-\d{2}-\d{2}\b/, "ISO date"],
  [/Written for development|Fictional working proposal/i, "development text"],
  [/\bfixture\b/i, "fixture"],
  [/\bTODO\b|\bFIXME\b|\bplaceholder\b/i, "placeholder"],
  [/\bus-[a-z]{2}-[a-z0-9-]+:|\b(?:cse|cmsg|ent)_[A-Za-z0-9]{6,}/, "raw key"],
  [/\bnot (?:been )?compiled\b|\bnot coded\b/i, "machinery"],
  [/\{\{|\}\}|\$\{/, "template"],
] as const;

function scanText(text: string): string[] {
  const hits: string[] = [];
  for (const [pattern, name] of MACHINERY) {
    const match = pattern.exec(text);
    if (match) {
      const at = match.index;
      hits.push(
        `${name}: …${text.slice(Math.max(0, at - 60), at + 60).replace(/\s+/g, " ")}…`,
      );
    }
  }
  return hits;
}

/** Fields the play surfaces print. Provenance anchors and inputs are not shown. */
const SHOWN =
  /^(prose|label|description|sentence|now|opening|title|heading|summary|stateLabel|when|placeLabel|travelNote|attendNote|outcomeLines|guidanceFacts|text|dateLabel|timeLabel|eligibility|timing|connections|personName|placeName|name|introduction|relation|line|lines|headline|body|detail|message|outcome|hostName|organizationName|familyLabel|recap|narration)$/;
const HIDDEN_PATH =
  /anchors|sources|causalInputs|bindings|satisfiedBy|provenance|evidence/;

/** Only the strings a screen would print: labels, prose, sentences. */
function visibleStrings(
  value: unknown,
  out: string[] = [],
  key = "",
  path = "",
): string[] {
  if (typeof value === "string") {
    if (SHOWN.test(key) && !HIDDEN_PATH.test(path))
      out.push(`${path}= ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => visibleStrings(item, out, key, `${path}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value))
      visibleStrings(v, out, k, `${path}.${k}`);
  }
  return out;
}

/** Each hit names the field it came from, so a finding can be traced. */
function scanFields(value: unknown): string[] {
  const hits: string[] = [];
  for (const line of visibleStrings(value)) {
    const at = line.indexOf("= ");
    const field = line.slice(0, at).replace(/\[\d+\]/g, "[]");
    for (const hit of scanText(line.slice(at + 2)))
      hits.push(`${field} ${hit}`);
  }
  return hits;
}

function signatureOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const frame =
    error instanceof Error
      ? (error.stack ?? "")
          .split("\n")
          .slice(1)
          .find((line) => line.includes("/src/"))
          ?.replace(/^.*\/src\//, "src/")
          .replace(/:\d+\)?$/, "")
          .replace(/\)$/, "")
      : "";
  return `${message.replace(/\b[0-9a-f]{8,}\b|\d{4}-\d{2}-\d{2}|\d+/g, "#").slice(0, 160)} @ ${frame ?? ""}`;
}

interface Choice {
  readonly name: string;
  /** Offered by a projection as available (a throw is then a defect). */
  readonly offered: boolean;
  readonly weight: number;
  readonly run: (world: World) => World;
}

/* ------------------------------------------------------------------------ */

export function playGame(spec: GameSpec): GameResult {
  const started = performance.now();
  const random = rng(spec.seed);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length)]!;
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const actions: Record<string, number> = {};
  const offices: string[] = [];
  let world: World | null = null;
  let personId: EntityId = "";
  let current = "create";
  let steps = 0;
  let generations = 1;
  let ended = "years";
  let startDate: string | null = null;

  const note = (f: Omit<Finding, "date" | "action">) => {
    const key = `${f.kind}|${f.signature}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      ...f,
      date: world?.currentDate ?? "",
      action: current,
    });
  };
  const handlers = createCampaignElectionTransitionRegistry();

  try {
    const setup = explicitNewGameSetup({
      placeKey: spec.placeKey,
      seed: spec.seed,
      startAge: spec.startAge as never,
      depth:
        spec.startAge <= 12 && random() < 0.5
          ? "play-formative-years"
          : "summarize-earlier-life",
      gender: pick(["female", "male", "unstated", "nonbinary"] as const),
    });
    const game = createOpeningLifeController(setup).finishTransition().game!;
    personId = game.playerPersonId;
    world = openOrdinaryLife(game.world, personId);
    startDate = world.currentDate;
  } catch (error) {
    note({
      kind: "crash",
      signature: `create: ${signatureOf(error)}`,
      detail: String((error as Error)?.stack ?? error).slice(0, 1500),
    });
    return {
      spec,
      startDate,
      endDate: null,
      steps,
      actions,
      generationsPlayed: 0,
      ended: "create-failed",
      offices,
      ms: performance.now() - started,
      findings,
    };
  }

  const endBy = addYears(world.currentDate, spec.years);
  let lastDate = world.currentDate;
  let sameDateCommands = 0;
  let lastSceneKey = "";
  let sameScene = 0;
  const recent: string[] = [];
  let blocked = false;

  const persona = spec.persona;
  const w = (base: number, table: Partial<Record<Persona, number>>) =>
    table[persona] ?? base;

  function choices(world: World): Choice[] {
    const list: Choice[] = [];
    // Story moment: the main play surface.
    let story: ReturnType<typeof projectStoryMoment> | null = null;
    try {
      story = projectStoryMoment(world, personId);
    } catch (error) {
      note({
        kind: "crash",
        signature: `projectStoryMoment: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }
    if (story) {
      for (const hit of scanFields(story))
        note({
          kind: "text",
          signature: `story ${hit.split(":")[0]}`,
          detail: hit,
        });
      if (
        story.scene.kind !== "ordinary-stretch" &&
        story.scene.options.length === 0
      )
        note({
          kind: "impossible",
          signature: `story scene ${story.scene.kind} has no options`,
          detail: story.scene.prose.slice(0, 300),
        });
      if (story.scene.kind !== "ordinary-stretch" && !story.scene.prose.trim())
        note({
          kind: "text",
          signature: `empty prose ${story.scene.kind}`,
          detail: "",
        });
      const options = story.scene.options;
      const hostile = options.filter((o) =>
        /refuse|decline|ignore|argue|walk away|quit|lie|skip|no\b|leave|shout|blame|not/i.test(
          `${o.label} ${o.description}`,
        ),
      );
      const scene = story.scene;
      for (const option of persona === "terrible" && hostile.length
        ? hostile
        : options) {
        if (!option.label.trim())
          note({
            kind: "text",
            signature: "blank option label",
            detail: scene.prose.slice(0, 200),
          });
        list.push({
          name: `story:${scene.kind}`,
          offered: true,
          weight: 6 / Math.max(1, options.length),
          run: (world) =>
            chooseStoryOption(world, {
              personId,
              scene,
              optionKey: option.key,
              transitionHandlers: handlers,
            }),
        });
      }
      const sceneKey = `${scene.kind}|${scene.prose.slice(0, 120)}|${options.map((o) => o.key).join(",")}|${JSON.stringify(world.currentMoment)}`;
      if (scene.kind !== "ordinary-stretch" && sceneKey === lastSceneKey)
        sameScene += 1;
      else sameScene = 0;
      lastSceneKey = sceneKey;
      if (sameScene === 12)
        note({
          kind: "stuck-scene",
          signature: `same ${scene.kind} scene offered 12 times with the clock not moving`,
          detail: `${scene.prose.slice(0, 200)} | options: ${options.map((o) => o.label).join(" / ")}`,
        });
    }

    // Today, read for text only.
    try {
      const today = projectToday(world, personId);
      for (const hit of scanFields(today))
        note({
          kind: "text",
          signature: `today ${hit.split(":")[0]}`,
          detail: hit,
        });
    } catch (error) {
      note({
        kind: "crash",
        signature: `projectToday: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }

    // Places: scheduled activities.
    try {
      const boost = blocked ? 30 : 1;
      for (const entry of venueActivities(world, personId, handlers)) {
        const activity = entry.activity;
        if (!entry.refusal || persona === "chaotic")
          list.push({
            name: `venue:${activity.kind === "travel" ? "journey" : "carry-out"}`,
            offered: !entry.refusal,
            weight: boost * w(1.5, { idle: 0.6, terrible: 0.4 }),
            run: (world) =>
              performVenueActivity(world, personId, activity.id, handlers),
          });
        if (entry.abandonable)
          list.push({
            name: "venue:give-up",
            offered: true,
            weight: boost * w(0.5, { terrible: 2 }),
            run: (world) =>
              abandonUnperformableCommitment(world, personId, activity.id),
          });
        if (activity.kind === "tentative")
          list.push({
            name: "venue:decline",
            offered: true,
            weight: w(0.3, { terrible: 2 }),
            run: (world) => declineVenueActivity(world, personId, activity.id),
          });
      }
    } catch (error) {
      note({
        kind: "crash",
        signature: `venueActivities: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }

    // Party and community work.
    try {
      const party = projectPartyAndCommunityWork(world, personId, handlers);
      for (const hit of scanFields(party))
        note({
          kind: "text",
          signature: `party ${hit.split(":")[0]}`,
          detail: hit,
        });
      for (const row of party.rows.slice(0, 6))
        for (const action of row.actions)
          list.push({
            name: `party:${action}`,
            offered: true,
            weight: w(0.6, {
              ambitious: 1.5,
              terrible: action === "decline" ? 2 : 0.3,
              idle: 0.05,
            }),
            run: (world) =>
              action === "accept"
                ? acceptPartyWork(world, personId, row.lifeActivityId)
                : action === "decline"
                  ? declinePartyWork(world, personId, row.lifeActivityId)
                  : attendPartyWork(
                      world,
                      personId,
                      row.lifeActivityId,
                      action === "attend-condensed" ? "condensed" : "attended",
                      handlers,
                    ),
          });
      for (const option of party.requestable.slice(0, 3))
        list.push({
          name: `party:request`,
          offered: true,
          weight: w(0.2, { ambitious: 0.8, idle: 0 }),
          run: (world) =>
            requestPartyWork(
              world,
              personId,
              option.form,
              option.hostOrganizationId,
            ),
        });
    } catch (error) {
      note({
        kind: "crash",
        signature: `projectPartyAndCommunityWork: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }

    // Campaigns.
    try {
      const campaign = projectCampaign(world, personId);
      for (const hit of scanFields(campaign))
        note({
          kind: "text",
          signature: `campaign ${hit.split(":")[0]}`,
          detail: hit,
        });
      if (campaign.phase === "active") {
        for (const kind of ["fundraising", "outreach", "advertising"] as const)
          list.push({
            name: `campaign:${kind}`,
            offered: false,
            weight: w(0.4, {
              ambitious: 2.5,
              terrible: kind === "advertising" ? 3 : 0.3,
              idle: 0,
            }),
            run: (world) => spendAnAfternoon(world, personId, kind),
          });
      } else {
        const offices = projectCampaignOffices(world, personId);
        for (const office of offices) {
          if (
            !office.eligible &&
            persona !== "terrible" &&
            persona !== "chaotic"
          )
            continue;
          list.push({
            name: `file:${office.governmentLevel}`,
            offered: office.eligible,
            weight: w(0.03, {
              ambitious: 0.6,
              dynasty: 0.25,
              terrible: 0.3,
              chaotic: 0.2,
              idle: 0,
            }),
            run: (world) => {
              const person = world.people[personId]!;
              const recorded = recordedDistrictForOffice(
                world,
                personId,
                office.officeKey,
              );
              const districts = offeredDistricts(
                world,
                person.homeJurisdictionId,
                office.officeKey,
              );
              const binding = recorded
                ? recorded.binding
                : districts.length
                  ? bindingForDistrict(pick(districts))
                  : null;
              return fileForOffice(world, personId, binding, office.officeKey);
            },
          });
        }
        const executive = stateExecutiveCandidacyForPerson(
          world,
          personId,
          false,
        );
        if (executive)
          list.push({
            name: "file:governor",
            offered: false,
            weight: w(0.01, {
              ambitious: 0.2,
              dynasty: 0.08,
              terrible: 0.2,
              idle: 0,
            }),
            run: (world) => fileForStateExecutiveOffice(world, personId),
          });
      }
      const status = stateExecutiveEntryStatus(world, personId);
      if (
        status &&
        (status as { qualificationBlocks?: unknown[] }).qualificationBlocks
          ?.length === 0
      )
        list.push({
          name: "qualify:governor",
          offered: true,
          weight: w(3, { terrible: 0.2 }),
          run: (world) => qualifyForStateExecutiveTerm(world, personId),
        });
    } catch (error) {
      note({
        kind: "crash",
        signature: `campaign surface: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }

    // Work.
    try {
      const provider = pick(CAREER_PROVIDERS);
      if (!careerEligibility(world, provider))
        list.push({
          name: "work:seek",
          offered: true,
          weight: w(0.15, { idle: 0.02, dynasty: 0.3 }),
          run: (world) => seekCareerOffer(world, provider).world,
        });
      for (const r of world.history.workRelationships) {
        if (r.personId !== personId) continue;
        const path = pathForRelationship(world, r.id);
        const p = path && CAREER_PROVIDERS.find((c) => c.pathId === path.id);
        if (!p) continue;
        const status = workStatusAt(world, r.id)?.status;
        if (status === "expected" && !careerOfferAccepted(world, r.id)) {
          list.push({
            name: "work:accept",
            offered: true,
            weight: w(1, { terrible: 0.3 }),
            run: (world) => respondCareerOffer(world, r.id, p, true).world,
          });
          list.push({
            name: "work:refuse",
            offered: true,
            weight: w(0.2, { terrible: 1 }),
            run: (world) => respondCareerOffer(world, r.id, p, false).world,
          });
        } else if (status === "expected" && r.startedAt <= world.currentDate) {
          list.push({
            name: "work:begin",
            offered: true,
            weight: 1,
            run: (world) => startCareerWork(world, r.id, p).world,
          });
        } else if (status === "active") {
          list.push({
            name: "work:shift",
            offered: true,
            weight: w(0.8, { terrible: 0.1, idle: 0.05 }),
            run: (world) =>
              performCareerWork(world, r.id, p, LIFE_PATHS2_HANDLERS).world,
          });
          list.push({
            name: "work:resign",
            offered: true,
            weight: w(0.01, { terrible: 0.3, chaotic: 0.1 }),
            run: (world) => resignCareer(world, r.id, p).world,
          });
        }
      }
    } catch (error) {
      note({
        kind: "crash",
        signature: `work surface: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }
    return list;
  }

  function walkOffered(destination: "home" | "neighborhood"): boolean {
    try {
      return !openingNeighborhoodWalkOffer(world!, personId, destination)
        .unavailable;
    } catch (error) {
      note({
        kind: "crash",
        signature: `openingNeighborhoodWalkOffer: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
      return false;
    }
  }

  function timeCommand(): TimeCommand {
    const r = random();
    // A player told they are somewhere they cannot leave from tries going home.
    if (blocked && r < 0.3 && walkOffered("home"))
      return { kind: "walk", destination: "home" };
    switch (persona) {
      case "idle":
        return r < 0.5 ? { kind: "quiet-stretch" } : { kind: "days", days: 30 };
      case "chaotic":
        if (r < 0.2) {
          const destination = pick(["home", "neighborhood"] as const);
          if (walkOffered(destination)) return { kind: "walk", destination };
        }
        return r < 0.35
          ? { kind: "quiet-stretch" }
          : { kind: "days", days: pick([1, 1, 7, 14, 30, 90]) };
      default:
        return r < 0.25 ? { kind: "days", days: 1 } : { kind: "days", days: 7 };
    }
  }

  function roundTrip(world: World) {
    let copy: World;
    try {
      const text = serializeWorld(world);
      copy = deserializeWorld(text);
      if (serializeWorld(copy) !== text)
        note({
          kind: "roundtrip",
          signature: "save text changes after load",
          detail: "",
        });
    } catch (error) {
      note({
        kind: "roundtrip",
        signature: `save/load: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
      return;
    }
    try {
      assertWorldIntegrity(copy);
    } catch (error) {
      note({
        kind: "integrity",
        signature: signatureOf(error),
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }
  }

  const deadline = started + spec.wallMs;
  while (world.currentDate < endBy) {
    if (performance.now() > deadline) {
      ended = "wall-clock";
      break;
    }
    steps += 1;

    // The life may have ended: the continuation screen.
    if (shellReadOnly(world) || !world.people[personId]) {
      ended = "read-only";
      break;
    }
    let continuation: ReturnType<typeof projectLifeContinuation> = null;
    try {
      continuation = projectLifeContinuation(world, personId);
    } catch (error) {
      note({
        kind: "crash",
        signature: `projectLifeContinuation: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }
    if (continuation) {
      if (generations >= spec.generations) {
        ended = `life ended (${continuation.ended})`;
        break;
      }
      const choices = continuation.choices;
      if (!choices.length) {
        note({
          kind: "no-successor",
          signature: `no successor: ${continuation.noSuccessorReason ?? "(no reason given)"}`,
          detail: continuation.heading,
        });
        ended = "no successor";
        break;
      }
      const bound = choices.filter((c) => (c as { bound?: boolean }).bound);
      const next = pick(bound.length ? bound : choices);
      current = `continue-as (${next.relation ?? "no tie"}, available now: ${next.availableNow})`;
      try {
        const before = world;
        world = continueAs(world, personId, next.personId);
        if (world === before) {
          note({
            kind: "impossible",
            signature: "continueAs changed nothing",
            detail: current,
          });
          ended = "continuation failed";
          break;
        }
        personId = next.personId;
        world = openOrdinaryLife(world, personId);
        generations += 1;
        actions["continue-as"] = (actions["continue-as"] ?? 0) + 1;
        roundTrip(world);
      } catch (error) {
        note({
          kind: "crash",
          signature: `continueAs: ${signatureOf(error)}`,
          detail: String((error as Error)?.stack ?? error).slice(0, 1500),
        });
        ended = "continuation crashed";
        break;
      }
      continue;
    }

    // Press a few buttons.
    const presses =
      persona === "idle"
        ? random() < 0.3
          ? 1
          : 0
        : 1 + Math.floor(random() * 3);
    for (let i = 0; i < presses; i++) {
      const list = choices(world);
      if (!list.length) break;
      const total = list.reduce((sum, c) => sum + c.weight, 0);
      if (total <= 0) break;
      let r = random() * total;
      const choice = list.find((c) => (r -= c.weight) <= 0) ?? list.at(-1)!;
      current = choice.name;
      recent.push(choice.name);
      if (recent.length > 12) recent.shift();
      const before = world.currentDate;
      try {
        world = choice.run(world);
        actions[choice.name] = (actions[choice.name] ?? 0) + 1;
        if (
          choice.name.startsWith("file:") &&
          projectCampaign(world, personId).phase === "active"
        )
          offices.push(`${world.currentDate} ${choice.name}`);
      } catch (error) {
        actions[`${choice.name} (refused)`] =
          (actions[`${choice.name} (refused)`] ?? 0) + 1;
        const stack = String((error as Error)?.stack ?? "");
        const internal =
          !(error instanceof Error) ||
          error instanceof TypeError ||
          error instanceof RangeError ||
          /Cannot read|is not a function|undefined/.test(error.message);
        if (choice.offered || internal)
          note({
            kind: internal ? "crash" : "offered-action-threw",
            signature: `${choice.name}: ${signatureOf(error)}`,
            detail: stack.slice(0, 1500),
          });
      }
      if (world.currentDate < before)
        note({
          kind: "impossible",
          signature: `clock went backwards on ${choice.name}`,
          detail: `${before} -> ${world.currentDate}`,
        });
      if (!world.people[personId]) break;
      if (projectLifeContinuation(world, personId)) break;
    }
    if (projectLifeContinuation(world, personId) || shellReadOnly(world))
      continue;

    // Press a time button.
    const command = timeCommand();
    current = `time:${command.kind}${"days" in command ? command.days : ""}`;
    try {
      const t = performance.now();
      const result = submitTimeCommand(world, {
        requestId: `${spec.id}-${steps}`,
        personId,
        sourceMoment: world.currentMoment,
        command,
        interruptions: DEFAULT_INTERRUPTIONS,
      });
      const took = performance.now() - t;
      if (took > 20_000)
        note({
          kind: "slow",
          signature: `${current} took over 20 s`,
          detail: `${Math.round(took)} ms at ${world.currentDate}`,
        });
      if (result.world.currentDate < world.currentDate)
        note({
          kind: "impossible",
          signature: "time command moved the date backwards",
          detail: current,
        });
      world = result.world;
      actions[current] = (actions[current] ?? 0) + 1;
      blocked = /resolve this commitment/.test(result.receipt.outcome);
      // Stopping for a commitment is the clock working; the stuck check
      // catches one that can never be resolved.
      if (
        result.receipt.status !== "accepted" &&
        !/resolve this commitment/.test(result.receipt.outcome)
      )
        note({
          kind: "time-refused",
          signature: `${command.kind} ${result.receipt.status}: ${result.receipt.outcome.replace(/\d+/g, "#").slice(0, 140)}`,
          detail: result.receipt.outcome,
        });
    } catch (error) {
      note({
        kind: "crash",
        signature: `${current}: ${signatureOf(error)}`,
        detail: String((error as Error)?.stack ?? error).slice(0, 1500),
      });
    }
    if (world.currentDate === lastDate) sameDateCommands += 1;
    else sameDateCommands = 0;
    lastDate = world.currentDate;
    if (sameDateCommands === 25) {
      let where = "";
      try {
        where = projectToday(world, personId).now;
      } catch (error) {
        where = `projectToday threw ${(error as Error).message}`;
      }
      let venues = "";
      try {
        venues = venueActivities(world, personId, handlers)
          .map(
            (e) =>
              `${e.activity.title} [${e.activity.kind}] refusal=${e.refusal} abandonable=${e.abandonable}`,
          )
          .join("; ");
      } catch (error) {
        venues = `venueActivities threw ${(error as Error).message}`;
      }
      note({
        kind: "stuck-clock",
        signature: "25 time presses without the date moving",
        detail:
          `${world.currentDate}: ${where} | places: ${venues || "(none offered)"} | last actions: ${recent.join(", ")}`.slice(
            0,
            1500,
          ),
      });
      if (process.env.MASS_PLAY_DUMP)
        writeFileSync(
          `${process.env.MASS_PLAY_DUMP}/${spec.id}-stuck.json`,
          JSON.stringify({ personId, save: serializeWorld(world) }),
        );
      ended = "stuck";
      break;
    }
    if (steps % 40 === 0) roundTrip(world);
  }
  roundTrip(world);
  return {
    spec,
    startDate,
    endDate: world.currentDate,
    steps,
    actions,
    generationsPlayed: generations,
    ended,
    offices,
    ms: performance.now() - started,
    findings,
  };
}

function addYears(date: string, years: number): string {
  const [y, rest] = [Number(date.slice(0, 4)), date.slice(4)];
  return `${y + years}${rest}`;
}

export function placeFor(usps: string, random: () => number) {
  const places = searchLifePlaces("", 400, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  });
  return places.length ? places[Math.floor(random() * places.length)]! : null;
}
export { rng };
