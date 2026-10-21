/**
 * Dev mode's routes: the page, its script, Kit 12's styles, and the controls
 * in `dev-mode.ts`. Mounted from `server.ts` with one hook; it holds no world
 * of its own and reads the bench's current core, director and player.
 */
import type { IncomingMessage } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  DevMode,
  type DevStep,
  type Experiment,
  type LawLevel,
} from "./dev-mode";
import { traceNode, traceReport } from "./dev-trace";
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";
import type { BenchPlayer } from "./player";

export interface DevWorld {
  core?: CoreState;
  director?: Director;
  player?: BenchPlayer;
  placeId: string;
}

const files = new Map([
  ["/dev", { file: "dev.html", type: "text/html; charset=utf-8" }],
  ["/dev.mjs", { file: "dev.mjs", type: "text/javascript; charset=utf-8" }],
]);
const KIT12 = new URL(
  "../../docs/codex/ui-logo-packet/01_kit12_ui/kit12.css",
  import.meta.url,
);
// Saved experiments the owner adds, kept beside the checkout, out of git.
const LOCAL = new URL("../../.bench-local/", import.meta.url);
const SAVED = new URL("dev-experiments.json", LOCAL);

let dev: DevMode | undefined;
function devFor(world: DevWorld): DevMode {
  if (!world.core) throw new Error("Generate a town first.");
  if (dev?.core !== world.core)
    dev = new DevMode(world.core, world.director, world.player, world.placeId);
  return dev;
}

async function body(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  let text = "";
  for await (const chunk of request) text += chunk;
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function savedExperiments(): Promise<Experiment[]> {
  try {
    return JSON.parse(await readFile(SAVED, "utf8")) as Experiment[];
  } catch {
    return [];
  }
}

/** The date a time control reaches from today. */
function reach(date: string, step: string, to?: string) {
  const today = makeIsoDate(date);
  if (step === "date") return makeIsoDate(to ?? "");
  if (step === "day") return addDays(today, 1);
  if (step === "week") return addDays(today, 7);
  const next = new Date(`${today}T00:00:00Z`);
  if (step === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  else if (step === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else throw new Error("Unknown time control.");
  return next.toISOString().slice(0, 10);
}

/**
 * Answers a dev-mode request, or returns false for any other route.
 * GET routes read only; POST routes write dev-mode records.
 */
export async function handleDev(
  request: IncomingMessage,
  url: URL,
  send: (status: number, value: unknown) => void,
  respond: (status: number, type: string, content: Buffer) => void,
  world: () => DevWorld,
): Promise<boolean> {
  const path = url.pathname;
  const asset = files.get(path);
  if (request.method === "GET" && asset) {
    respond(
      200,
      asset.type,
      await readFile(new URL(asset.file, import.meta.url)),
    );
    return true;
  }
  if (request.method === "GET" && path === "/kit12.css") {
    respond(200, "text/css; charset=utf-8", await readFile(KIT12));
    return true;
  }
  if (!path.startsWith("/api/dev/")) return false;
  const route = `${request.method} ${path.slice("/api/dev/".length)}`;
  const q = (key: string) => url.searchParams.get(key) ?? "";
  if (route === "GET experiments") {
    send(200, {
      builtIn: DevMode.experiments(),
      saved: await savedExperiments(),
    });
    return true;
  }
  const mode = devFor(world());
  const core = mode.core;
  switch (route) {
    case "GET state":
      send(200, {
        date: core.date,
        seed: core.seed,
        placeId: mode.placeId,
        placeName: core.placeMetadata.placeName ?? null,
        playerId: mode.player?.personId ?? null,
        marks: mode.marks(),
        journalChecks: mode.journalChecks(),
        pending: [...mode.pending],
      });
      return true;
    case "GET laws":
      send(200, mode.laws());
      return true;
    case "POST law": {
      const input = await body(request);
      send(
        200,
        mode.setLaw({
          level: input.level as LawLevel,
          series: String(input.series),
          ...(input.value !== undefined && input.value !== ""
            ? { value: Number(input.value) }
            : {}),
          ...(input.unit ? { unit: String(input.unit) } : {}),
          ...(input.repeal ? { repeal: true } : {}),
          ...(input.effectiveDate
            ? { effectiveDate: String(input.effectiveDate) }
            : {}),
        }),
      );
      return true;
    }
    case "GET reach":
      send(200, mode.reach(q("lawId")));
      return true;
    case "GET people":
      send(
        200,
        [...core.people.values()]
          .filter((person) => person.alive)
          .map((person) => ({
            id: person.id,
            givenName: person.givenName,
            familyName: person.familyName,
            birthDate: person.birthDate,
            jobId: person.jobId ?? null,
          })),
      );
      return true;
    case "GET offers":
      send(200, mode.offers(q("personId")));
      return true;
    case "POST choose": {
      const input = await body(request);
      send(200, mode.choose(String(input.personId), String(input.key)));
      return true;
    }
    case "GET bodies":
      send(200, mode.bodies());
      return true;
    case "POST vote": {
      const input = await body(request);
      send(
        200,
        mode.vote(
          String(input.billId),
          String(input.memberId),
          input.vote as "yes" | "no" | "abstain",
        ),
      );
      return true;
    }
    case "POST hold-vote": {
      const input = await body(request);
      send(200, mode.holdVote(String(input.billId)));
      return true;
    }
    case "POST sign": {
      const input = await body(request);
      send(200, mode.sign(String(input.billId), input.sign === true));
      return true;
    }
    case "POST advance": {
      const input = await body(request);
      const to = reach(core.date, String(input.step), input.to as string);
      send(200, mode.advance(to));
      return true;
    }
    case "GET trace":
      send(200, mode.trace(q("id")));
      return true;
    case "GET trace/node":
      send(200, traceNode(core, mode.director, q("id")));
      return true;
    case "POST trace/report": {
      const input = await body(request);
      const text = traceReport(
        core,
        mode.director,
        input.chain as { id: string; via?: string; value?: unknown }[],
      );
      const file = new URL(
        `trace-reports/${core.seed}-${core.date}-${Date.now()}.txt`,
        LOCAL,
      );
      await mkdir(new URL(".", file), { recursive: true });
      await writeFile(file, text);
      send(200, { file: file.pathname, text });
      return true;
    }
    case "GET person":
      send(200, mode.person(q("id")));
      return true;
    case "GET watch":
      send(200, mode.watchView(q("since") || undefined));
      return true;
    case "POST experiment/save": {
      const input = await body(request);
      const experiment: Experiment = {
        id: String(input.id),
        steps: input.steps as DevStep[],
        runMonths: Number(input.runMonths) || 12,
      };
      const saved = (await savedExperiments()).filter(
        (row) => row.id !== experiment.id,
      );
      saved.push(experiment);
      await mkdir(new URL(".", SAVED), { recursive: true });
      await writeFile(SAVED, JSON.stringify(saved, null, 2));
      send(200, experiment);
      return true;
    }
    case "POST experiment/apply": {
      const input = await body(request);
      const id = String(input.id);
      const found = [
        ...DevMode.experiments(),
        ...(await savedExperiments()),
      ].find((row) => row.id === id);
      if (!found) throw new Error(`No saved experiment: ${id}`);
      send(200, {
        experiment: found,
        ...mode.applySteps(found.id, found.steps),
      });
      return true;
    }
  }
  send(404, { error: "Unknown dev mode route." });
  return true;
}
