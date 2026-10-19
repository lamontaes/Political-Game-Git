/**
 * Dev mode's trace tree (owner, Oct 14, 2026, relayed): from any record, the
 * records and reasons that produced it, one level per click, each child
 * labeled with the engine and the field or function that links it. "How they
 * learned of it" is its own kind. Read-only: it finds what the core and its
 * engines saved; it writes nothing and spends no time.
 */
import { coreAPI } from "../core2/state";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { LEGISLATURE_MODULE_ID, votesOn } from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";
import { whyPanels, type WhyPanel } from "./dev-why";

export type TraceKind = "record" | "reason" | "learned" | "person" | "missing";

export interface TraceChild {
  readonly id: string;
  readonly kind: TraceKind;
  /** The engine and field or function that links the child to its parent. */
  readonly via: string;
  /** A reason or a learned fact, shown in place (no record of its own). */
  readonly value?: unknown;
}

export interface TraceNode {
  readonly id: string;
  /** Where the record lives: "core.log", a module id, "core.people", ... */
  readonly engine: string;
  readonly kind: string;
  readonly record: unknown;
  readonly resolver: unknown;
  /** Why panels: the reasons, books, history or ledger behind this record. */
  readonly why: readonly WhyPanel[];
  readonly children: readonly TraceChild[];
}

// A record names others by id; these fields are dates, amounts or labels.
const SKIP = new Set(["date", "kind", "version", "status", "tag", "citation"]);
const MAX_CHILDREN = 80;
const MAX_LEARNED = 40;

/** Find a record anywhere the core or an engine keeps one. */
export function findRecord(
  core: CoreState,
  id: string,
): { engine: string; kind: string; record: unknown } | undefined {
  const log = core.durableLog.get(id);
  if (log) return { engine: "core.log", kind: log.kind, record: log };
  const person = core.people.get(id);
  if (person) return { engine: "core.people", kind: "person", record: person };
  const org = core.organizations.get(id);
  if (org) return { engine: "core.organizations", kind: org.kind, record: org };
  const job = core.jobs.get(id);
  if (job) return { engine: "core.jobs", kind: "job", record: job };
  const household = core.households.get(id);
  if (household)
    return { engine: "core.households", kind: "household", record: household };
  const relationship = core.relationships.get(id);
  if (relationship)
    return {
      engine: "core.relationships",
      kind: "relationship",
      record: relationship,
    };
  const receipt = core.cashJournal.detailedReceipts.get(id);
  if (receipt)
    return { engine: "core.cashJournal", kind: "payment", record: receipt };
  const api = coreAPI(core);
  for (const [moduleId, module] of core.modules) {
    const tables = module.state?.tables;
    if (!tables) continue;
    const state = api.moduleState(moduleId);
    for (const name of Object.keys(tables)) {
      const row = state.table(name).get(id);
      if (row)
        return { engine: `${moduleId}.${name}`, kind: name, record: row };
    }
  }
  return undefined;
}

/** Ids a record names, anywhere in its fields, that resolve to a record. */
function namedIds(
  core: CoreState,
  value: unknown,
  path: string,
  out: Map<string, string>,
  depth = 0,
) {
  if (depth > 4 || out.size > MAX_CHILDREN) return;
  if (typeof value === "string") {
    if (value.length > 6 && !out.has(value) && findRecord(core, value))
      out.set(value, path);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value instanceof Map) {
    for (const [k, v] of value)
      namedIds(core, v, `${path}.${k}`, out, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    if (SKIP.has(k)) continue;
    // A space-separated id list (dev mode's recordIds) names each id.
    if (typeof v === "string" && v.includes(" "))
      for (const part of v.split(" "))
        namedIds(core, part, `${path}.${k}`, out, depth + 1);
    else namedIds(core, v, path ? `${path}.${k}` : k, out, depth + 1);
  }
}

const rowsOf = (core: CoreState, moduleId: string, table: string) =>
  core.modules.get(moduleId)?.state
    ? (coreAPI(core)
        .moduleState(moduleId)
        .table(table)
        .rows() as unknown as Record<string, unknown>[])
    : [];

/** The records that link back to this one: what it produced or who decided it. */
function reverseLinks(
  core: CoreState,
  id: string,
  found: { engine: string; kind: string; record: unknown },
): TraceChild[] {
  const out: TraceChild[] = [];
  const record = found.record as Record<string, unknown>;
  // A law in play: the bill that enacted it, or the dev-mode change that set it.
  if (found.engine === `${LAWS_MODULE_ID}.laws`) {
    const measure = (record.terms as Record<string, unknown> | undefined)
      ?.enactedBy;
    if (typeof measure === "string") {
      for (const bill of rowsOf(core, LEGISLATURE_MODULE_ID, "bills"))
        if (bill.number === measure)
          out.push({
            id: String(bill.id),
            kind: "record",
            via: "core2-legislature-v1.enact",
          });
      for (const row of core.durableLog.values())
        if (
          row.kind === "dev-mode-change" &&
          String(row.facts?.recordIds ?? "")
            .split(" ")
            .includes(id)
        )
          out.push({ id: row.id, kind: "record", via: "dev-mode.setLaw" });
    }
    for (const row of core.durableLog.values())
      if (row.facts?.lawId === id)
        out.push({ id: row.id, kind: "record", via: `${row.kind}.lawId` });
  }
  // A bill: each member's vote with its reasons, and the provisions' laws.
  if (found.engine === `${LEGISLATURE_MODULE_ID}.bills`) {
    for (const vote of votesOn(coreAPI(core), id))
      out.push({
        id: `vote:${id}:${vote.memberId}`,
        kind: "record",
        via: "core2-legislature-v1.chamberVote",
      });
    for (const law of rowsOf(core, LAWS_MODULE_ID, "laws"))
      if (
        (law.terms as Record<string, unknown> | undefined)?.enactedBy ===
        record.number
      )
        out.push({
          id: String(law.id),
          kind: "record",
          via: "core2-laws-v1.enactLaw",
        });
  }
  // A member's vote: the reasons that summed to it, then the member.
  if (found.engine === `${LEGISLATURE_MODULE_ID}.votes`) {
    out.push({
      id: `${id}#position`,
      kind: "reason",
      via: "core2-legislature-v1.memberPosition",
      value: record.position,
    });
    if (typeof record.memberId === "string")
      for (const stance of rowsOf(core, "views", "stances"))
        if (stance.personId === record.memberId)
          out.push({
            id: String(stance.id),
            kind: "record",
            via: "views.stances",
          });
  }
  // A person: their views, job, household and the director's moments.
  if (found.kind === "person") {
    for (const stance of rowsOf(core, "views", "stances"))
      if (stance.personId === id)
        out.push({
          id: String(stance.id),
          kind: "record",
          via: "views.stances",
        });
  }
  return out;
}

/** People who learned of a record, and how (the core's observed facts). */
function learnedOf(core: CoreState, id: string): TraceChild[] {
  const out: TraceChild[] = [];
  for (const [personId, facts] of core.knowledgeByPerson) {
    for (const [key, fact] of facts)
      if (fact.sourceId === id) {
        out.push({
          id: personId,
          kind: "learned",
          via: `core.observe.${fact.access}`,
          value: { key, learnedAt: fact.learnedAt, access: fact.access },
        });
        break;
      }
    if (out.length >= MAX_LEARNED) break;
  }
  return out;
}

/** One node of the tree: the record, the resolver's answer and its children. */
export function traceNode(
  core: CoreState,
  director: Director | undefined,
  id: string,
): TraceNode {
  // A reason or a learned fact has no record of its own; its parent shows it.
  const found = findRecord(core, id);
  const resolver = resolveSavedTraceV1(core, id);
  const children: TraceChild[] = [];
  if ("reasons" in resolver && resolver.reasons)
    children.push({
      id: `${id}#reasons`,
      kind: "reason",
      via: "core2.chooser.reasons",
      value: resolver.reasons,
    });
  if ("reasonTerms" in resolver && resolver.reasonTerms)
    children.push({
      id: `${id}#reasonTerms`,
      kind: "reason",
      via: "core2.chooser.reasonTerms",
      value: resolver.reasonTerms,
    });
  for (const source of resolver.savedSources)
    children.push({
      id: source.recordedRef.id,
      kind: source.status === "resolved-saved-record" ? "record" : "missing",
      via: `saved-trace.${source.recordedRef.kind}`,
    });
  if (resolver.paymentCause)
    children.push({
      id: resolver.paymentCause.receiptId,
      kind: "record",
      via: `saved-trace.${resolver.paymentCause.mechanism}`,
    });
  // A director moment names the record that caused it.
  for (const book of director?.ledger.people.values() ?? []) {
    const moment = book.momentsById.get(id);
    if (moment)
      children.push({
        id: moment.causeId,
        kind: "record",
        via: "director.moment.causeId",
      });
  }
  if (found) {
    children.push(...reverseLinks(core, id, found));
    const named = new Map<string, string>();
    namedIds(core, found.record, "", named);
    named.delete(id);
    for (const [childId, path] of named)
      children.push({
        id: childId,
        kind: "record",
        via: `${found.engine}.${path}`,
      });
    children.push(...learnedOf(core, id));
  }
  const seen = new Set<string>();
  return {
    id,
    engine: found?.engine ?? "none",
    kind:
      found?.kind ??
      ("recordKind" in resolver ? resolver.recordKind : "missing"),
    record: found?.record ?? null,
    resolver,
    why: whyPanels(core, id, found),
    children: children
      .filter((child) => {
        const key = `${child.kind}|${child.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_CHILDREN),
  };
}

/** The clicked chain as plain text: one line per step, record ids and reasons. */
export function traceReport(
  core: CoreState,
  director: Director | undefined,
  chain: readonly { id: string; via?: string; value?: unknown }[],
): string {
  const lines = [
    `trace report · seed ${core.seed} · place ${core.placeMetadata.placeKey ?? ""} · date ${core.date}`,
  ];
  chain.forEach((step, depth) => {
    const node = findRecord(core, step.id);
    const resolver = node ? resolveSavedTraceV1(core, step.id) : undefined;
    const reasons =
      resolver && "reasonKey" in resolver && resolver.reasonKey
        ? ` reasonKey=${resolver.reasonKey}`
        : "";
    const facts = (node?.record as { facts?: Record<string, string> } | null)
      ?.facts;
    lines.push(
      `${"  ".repeat(depth)}${depth ? "<- " : ""}${step.id} [${node?.engine ?? "reason"}${node ? ` ${node.kind}` : ""}]${step.via ? ` via ${step.via}` : ""}${reasons}`,
    );
    if (facts)
      lines.push(
        `${"  ".repeat(depth)}   facts ${Object.entries(facts)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ")}`,
      );
    if (step.value !== undefined)
      lines.push(`${"  ".repeat(depth)}   value ${JSON.stringify(step.value)}`);
  });
  void director;
  return `${lines.join("\n")}\n`;
}
