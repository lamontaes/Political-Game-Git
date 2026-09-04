import { canonicalJson } from "../simulation";
import type { EntityId } from "../simulation";
import {
  buildTraceExport,
  buildTraceIndex,
  createCausalTraceFixture,
  projectConversationObserverTrace,
  traceExportJson,
  traceExportMarkdown,
  type TraceDirection,
} from "../devtools";
import type { ConversationAudibility } from "../presentation/run-b-conversation";

/**
 * Exports one trace, deterministically.
 *
 * Two runs of this command with the same arguments produce the same bytes.
 * That is the point: a trace pasted into a bug report has to be something the
 * next person can regenerate and diff, and a timestamp or a run id in the
 * output would quietly destroy that.
 *
 * Usage:
 *   node --import tsx src/cli/trace-export.ts [options]
 *
 *   --seed <seed>              fixture seed (default causal-trace-observer)
 *   --audibility normal|quiet  conversation audibility for the fixture
 *   --root <record id>         record to trace from
 *   --turn <1|2>               trace from that turn's conversation event
 *   --direction upstream|downstream|both
 *   --depth <n>
 *   --format markdown|json|observer
 */

interface Options {
  readonly seed: string;
  readonly audibility: ConversationAudibility;
  readonly rootId: EntityId | null;
  readonly turn: number | null;
  readonly direction: TraceDirection;
  readonly depth: number;
  readonly format: "markdown" | "json" | "observer";
}

function parseOptions(argv: readonly string[]): Options {
  let seed = "causal-trace-observer";
  let audibility: ConversationAudibility = "normal";
  let rootId: EntityId | null = null;
  let turn: number | null = null;
  let direction: TraceDirection = "upstream";
  let depth = 8;
  let format: Options["format"] = "markdown";

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    switch (flag) {
      case "--seed":
        if (!value) throw new Error("--seed needs a value.");
        seed = value;
        index += 1;
        break;
      case "--audibility":
        if (value !== "normal" && value !== "quiet") {
          throw new Error("--audibility must be normal or quiet.");
        }
        audibility = value;
        index += 1;
        break;
      case "--root":
        if (!value) throw new Error("--root needs a record id.");
        rootId = value as EntityId;
        index += 1;
        break;
      case "--turn": {
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < 1) {
          throw new Error("--turn must be a positive integer.");
        }
        turn = parsed;
        index += 1;
        break;
      }
      case "--direction":
        if (
          value !== "upstream" &&
          value !== "downstream" &&
          value !== "both"
        ) {
          throw new Error("--direction must be upstream, downstream or both.");
        }
        direction = value;
        index += 1;
        break;
      case "--depth": {
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < 0) {
          throw new Error("--depth must be a non-negative integer.");
        }
        depth = parsed;
        index += 1;
        break;
      }
      case "--format":
        if (value !== "markdown" && value !== "json" && value !== "observer") {
          throw new Error("--format must be markdown, json or observer.");
        }
        format = value;
        index += 1;
        break;
      default:
        throw new Error(`Unrecognized option: ${String(flag)}`);
    }
  }

  return { seed, audibility, rootId, turn, direction, depth, format };
}

const options = parseOptions(process.argv.slice(2));
const fixture = createCausalTraceFixture(options.audibility, options.seed);

if (options.format === "observer") {
  const traces = fixture.turns.map((conversationTurn) =>
    projectConversationObserverTrace(fixture.world, {
      eventId: conversationTurn.eventId,
      declaredPresence: {
        basis: "the scene's recorded physical presence set",
        personIds: fixture.room.physicallyPresentPersonIds,
        note: "Supplied by the conversation room context, not by the event record.",
      },
      historySpan: conversationTurn.historySpan,
    }),
  );
  console.log(
    canonicalJson({
      seed: fixture.seed,
      audibility: fixture.audibility,
      worldId: fixture.world.id,
      historyFrontier: fixture.world.history.nextSequence,
      turns: traces,
    }),
  );
} else {
  const index = buildTraceIndex(fixture.world);
  const turnRoot =
    options.turn === null
      ? null
      : (fixture.turns.find(
          (candidate) => candidate.turnOrdinal === options.turn,
        )?.eventId ?? null);
  const rootId =
    options.rootId ??
    turnRoot ??
    fixture.world.history.decisionTraces.at(-1)?.id ??
    index.nodes.at(-1)?.id ??
    null;
  if (rootId === null) {
    throw new Error("This world produced no traceable record.");
  }
  const exported = buildTraceExport(index, {
    rootId,
    direction: options.direction,
    maxDepth: options.depth,
  });
  process.stdout.write(
    options.format === "json"
      ? traceExportJson(exported)
      : traceExportMarkdown(exported),
  );
}
