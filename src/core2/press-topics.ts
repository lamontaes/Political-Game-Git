/**
 * What a public record is about, for the press (OPUS-PEOPLE): the topic a
 * reader's views hold a stance on, the change the record makes, whether it
 * ends something (a repeal), how near home it is, and who it names. Every
 * story a reporter can pick carries a topic, so the views engine can read
 * what is printed (laws audit, defect 21).
 *
 * A policy law's topic is its question; a law on an amount (a tax rate, a
 * wage floor) is about its series; a budget line is "budget-line:<line>", the
 * key the campaign views read; a race is about its contest.
 */
import type { CoreAPI, CoreEventInput } from "./types";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import type { OfficeInput } from "./offices-local";
import { POLICY_QUESTIONS } from "./policy-answers";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";

export type WireLevel = "town" | "county" | "state" | "nation";

export interface WireItem {
  /** The public record's event id. */
  readonly id: string;
  readonly kind: string;
  /** Facts on the originating public record, retained for delivered news. */
  readonly facts?: Readonly<Record<string, string>>;
  readonly date: string;
  readonly level: WireLevel;
  readonly topic: string;
  /** "enact" or "repeal" for policy and budget topics; else what changed. */
  readonly desiredChange: string;
  /** A repeal, a closure: the record ends something. */
  readonly ending: boolean;
  /** People the record names: who voted, who filed, who was seated. */
  readonly subjectIds: readonly string[];
}

const LEVELS: Readonly<Record<string, WireLevel>> = {
  place: "town",
  city: "town",
  town: "town",
  municipal: "town",
  county: "county",
  // A township board governs the town's own township.
  township: "town",
  state: "state",
  federal: "nation",
  national: "nation",
};

/** Whether a topic is a policy question or budget line readers hold views on. */
export function isPolicyTopic(topic: string): boolean {
  return topic in POLICY_QUESTIONS || topic.startsWith("budget-line:");
}

/** Public acts carry the jurisdiction of the office, even when produced in town. */
function officeLevel(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
  stateKey: string,
): WireLevel | null {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return null;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  let state = false;
  let county = false;
  for (const personId of event.personIds) {
    for (const term of offices
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]) {
      if (term.status !== "serving") continue;
      const office = offices.table("offices").get(term.officeId) as unknown as
        OfficeInput | undefined;
      if (office?.level === "federal") return "nation";
      if (office?.level === "state" && office.jurisdiction === stateKey)
        state = true;
      if (office?.level === "county" && office.coversTown) county = true;
    }
  }
  return state ? "state" : county ? "county" : null;
}

/**
 * The wire item a public record makes for a town's press, or null when it is
 * outside what the town's outlets cover (another state's report).
 */
export function wireItem(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
  town: { readonly placeId: string; readonly stateKey: string },
): WireItem | null {
  const facts = event.facts ?? {};
  // Where it happened: the town's own records, its state's, the nation's.
  let level: WireLevel | null = null;
  const authority = officeLevel(api, event, town.stateKey);
  if (facts.level && LEVELS[facts.level]) level = LEVELS[facts.level]!;
  else if (authority) level = authority;
  else if (event.placeId === town.placeId) level = "town";
  else if (String(event.placeId).startsWith("national:")) level = "nation";
  else if (String(event.placeId).startsWith("state:")) {
    const usps = town.stateKey.slice(town.stateKey.lastIndexOf("-") + 1);
    level = String(event.placeId) === `state:${usps}` ? "state" : null;
  } else if (event.placeId === town.stateKey) level = "state";
  if (!level) return null;
  const people = event.personIds.filter((id) => api.state.people.has(id));
  const base = {
    id: event.id,
    kind: event.kind,
    date: event.date,
    level,
    subjectIds: people,
    facts: { ...facts },
  };
  switch (event.kind) {
    case "law-took-effect": {
      const topic = facts.series ?? event.kind;
      // A policy law at 0, or an amount set to nothing, ends what stood.
      const ending = Number(facts.value) === 0;
      return {
        ...base,
        topic,
        desiredChange: ending ? "repeal" : "enact",
        ending,
      };
    }
    case "vote-recorded":
      // One member's vote is part of the roll call's story, which names
      // every member who voted; it is not a story of its own.
      return null;
    case "budget-line-changed":
      return {
        ...base,
        topic: `budget-line:${facts.line ?? ""}`,
        desiredChange: Number(facts.deltaMinor) >= 0 ? "enact" : "repeal",
        ending: false,
      };
    case "legislative-vote":
    case "executive-action":
    case "public-comment": {
      // A bill's vote or hearing is about what the bill changes.
      const bill =
        facts.billId && api.state.modules.has(LEGISLATURE_MODULE_ID)
          ? (api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .get(facts.billId) as unknown as BillRow | undefined)
          : undefined;
      const first = bill?.provisions[0];
      const topic = first
        ? (first.question ??
          (first.line ? `budget-line:${first.line}` : first.series))
        : undefined;
      const passed =
        event.kind === "legislative-vote"
          ? Number(facts.yes) > Number(facts.no)
          : event.kind === "executive-action"
            ? facts.action !== "vetoed"
            : Number(facts.for) >= Number(facts.against);
      const enacts = (first?.value ?? 1) > 0;
      return {
        ...base,
        topic: topic ?? event.kind,
        desiredChange: passed === enacts ? "enact" : "repeal",
        ending: false,
      };
    }
    case "veto-override": {
      // The override vote is about what the vetoed bill changes: it enacts
      // that change if it passed and leaves the veto standing if it failed.
      const bill =
        facts.billId && api.state.modules.has(LEGISLATURE_MODULE_ID)
          ? (api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .get(facts.billId) as unknown as BillRow | undefined)
          : undefined;
      const first = bill?.provisions[0];
      const topic = first
        ? (first.question ??
          (first.line ? `budget-line:${first.line}` : first.series))
        : undefined;
      const enacts = (first?.value ?? 1) > 0;
      return {
        ...base,
        topic: topic ?? event.kind,
        desiredChange:
          (facts.passed === "true") === enacts ? "enact" : "repeal",
        ending: false,
      };
    }
    case "recall-outcome":
      // A recall is about the member it names; a removal ends their term.
      return {
        ...base,
        topic: `recall:${facts.recallId ?? ""}`,
        desiredChange: facts.outcome ?? event.kind,
        ending: facts.outcome === "removed",
      };
    case "budget-adopted":
      return {
        ...base,
        topic: `budget:${facts.governmentId ?? event.placeId}`,
        desiredChange: "enact",
        ending: false,
      };
    case "organization.closed":
    case "business.closed": {
      const key = Object.keys(facts).find(
        (k) => k.startsWith("organization:") && k.endsWith(":status"),
      );
      const org =
        event.topic ??
        (key ? key.slice("organization:".length, -":status".length) : null);
      return {
        ...base,
        topic: org ?? event.kind,
        desiredChange: "closed",
        ending: true,
      };
    }
    default: {
      const contest = facts.contestId;
      const topic =
        event.topic ??
        (contest ? `race:${contest}` : null) ??
        (facts.question ? facts.question : null) ??
        event.kind;
      return {
        ...base,
        topic,
        desiredChange: event.desiredChange ?? event.kind,
        ending: false,
      };
    }
  }
}
