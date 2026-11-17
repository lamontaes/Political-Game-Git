/**
 * Dev mode's figure trace (owner, Nov 16, 2026: "every figure should be traceable from dev mode";
 * CTO, crew line #9747, Nov 17): any figure in the one registry of figures
 * (src/core2/data/output-numbers.json) opens in the one Trace box as `figure:<figure id>@<place
 * id>`. The trace shows the figure's value now and last year, the engine that owns it and its
 * source, the record it was read from, the named inputs kept beside it, and its history month by
 * month (or year by year) from the rows its owner already keeps, each point with its record. It
 * reads only: it computes no figure a second time, writes nothing and spends no time.
 */
import type { DevView } from "../dev-views";
import { lawChain } from "../../core2/modules/laws";
import {
  OUTPUT_NUMBERS,
  outputNumber,
  type OutputNumber,
} from "../../core2/output-numbers";
import {
  outputNumberHistory,
  outputReads,
  readOutputNumber,
} from "../../core2/output-number-readers";
import { coreAPI } from "../../core2/state";
import type { CoreState } from "../../core2/types";
import type { TraceChild, TraceNode } from "../dev-trace";

/** The prefix of a figure's trace id. */
export const FIGURE_PREFIX = "figure:";

/** The trace id of a registered figure for a place. */
export const figureTraceId = (figureId: string, placeId: string) =>
  `${FIGURE_PREFIX}${figureId}@${placeId}`;

/** How many dated points a figure's trace shows: two years of months. */
const HISTORY_POINTS = 24;

function parse(id: string): { figureId: string; placeId: string } | null {
  if (!id.startsWith(FIGURE_PREFIX)) return null;
  const rest = id.slice(FIGURE_PREFIX.length);
  const at = rest.lastIndexOf("@");
  if (at <= 0) return null;
  return { figureId: rest.slice(0, at), placeId: rest.slice(at + 1) };
}

/** Where the figure lives when no screen keeps it by place: the outcome web's read of an engine's record. */
function webRead(number: OutputNumber): string | null {
  return number.web ? `${number.web.record}.${number.web.field}` : null;
}

/**
 * A figure's trace node, in the shape the Trace box opens: the reading as the record, its source,
 * and as children the record it was read from (and last year's), each named input, and the history.
 * A figure the owner holds no value for says where it is read and why it is empty.
 */
export function figureTraceNode(core: CoreState, id: string): TraceNode {
  const parsed = parse(id);
  const number = parsed ? outputNumber(parsed.figureId) : undefined;
  if (!parsed || !number)
    return {
      id,
      engine: "output-numbers",
      kind: "figure",
      record: null,
      resolver: null,
      answer: "not-a-record",
      gap: "No figure by that id in the registry of figures (src/core2/data/output-numbers.json).",
      why: [],
      children: [],
    };
  const reads = outputReads(core, parsed.placeId);
  const reading = readOutputNumber(reads, number.id);
  const history = outputNumberHistory(reads, number.id, HISTORY_POINTS);
  const children: TraceChild[] = [];
  if (reading) {
    children.push({
      id: reading.recordId,
      kind: "record",
      via: `${number.owner}.${number.kept ? `${number.kept.table}.${number.kept.field}` : number.reader}`,
    });
    if (reading.beforeRecordId)
      children.push({
        id: reading.beforeRecordId,
        kind: "record",
        via: `${number.owner}: last year`,
      });
    for (const [name, value] of Object.entries(reading.inputs)) {
      const asFigure = outputNumber(name);
      children.push(
        asFigure
          ? {
              id: figureTraceId(name, parsed.placeId),
              kind: "record",
              via: `input ${name}`,
            }
          : {
              id: `${id}#input:${name}`,
              kind: "reason",
              via: `input ${name}`,
              value,
            },
      );
    }
  }
  if (history.length)
    children.push({
      id: `${id}#history`,
      kind: "reason",
      via: `${number.owner}: ${number.cadence} history`,
      value: history,
    });
  const web = webRead(number);
  return {
    id,
    engine: number.owner,
    kind: "figure",
    record: {
      figure: number.id,
      placeId: parsed.placeId,
      level: number.level,
      unit: number.unit,
      denominator: number.denominator,
      cadence: number.cadence,
      fold: number.fold,
      now: reading?.now ?? null,
      before: reading?.before ?? null,
      ...(web ? { readByTheOutcomeWebFrom: web } : {}),
    },
    resolver: null,
    answer: reading || history.length ? "caused" : "no-cause-kept",
    causes: reading
      ? [
          {
            id: reading.recordId,
            engine: number.owner,
            kind: number.kept ? `kept ${number.kept.table}` : "owner record",
            via: number.kept ? `kept ${number.kept.table}` : `${number.reader}`,
          },
        ]
      : [],
    source: { tag: number.source.tag, citation: number.source.citation },
    ...(reading || history.length
      ? {}
      : {
          gap: web
            ? `No screen keeps this figure by place: the outcome web reads it from ${web} when it runs the links that start from it.`
            : "Its owner holds no value for this place today.",
        }),
    why: [],
    children,
  };
}

/** Every registered figure for the played town (its state's and the nation's read through it), with its trace id and value. */
export function figureList(core: CoreState) {
  const placeId = lawChain(coreAPI(core)).townPlaceId;
  const reads = outputReads(core, placeId);
  return OUTPUT_NUMBERS.map((number) => {
    const reading = readOutputNumber(reads, number.id);
    return {
      id: number.id,
      level: number.level,
      unit: number.unit,
      owner: number.owner,
      traceId: figureTraceId(number.id, placeId),
      now: reading?.now ?? null,
      onMetrics: number.metrics ? number.metrics.section : null,
    };
  });
}

const view: DevView = {
  name: "figure-trace",
  client: "dev-figure-trace.mjs",
  labels: {
    title: "Figures",
    figure: "Figure",
    level: "Level",
    value: "Value",
    owner: "Owner",
    trace: "Trace",
    none: "none",
  },
  routes: {
    "GET figures": ({ mode }) => figureList(mode.core),
    "GET figure-trace": ({ mode, q }) => figureTraceNode(mode.core, q("id")),
  },
};

export default view;
