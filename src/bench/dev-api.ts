/**
 * Dev mode's routes: the page, its script, Kit 12's styles, and the controls
 * in `dev-mode.ts` (follow and unfollow a resident among them). Mounted from `server.ts` with one hook; it holds no world
 * of its own and reads the bench's current core, director and player.
 */
import type { IncomingMessage } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  DevMode,
  type RunEvent,
  type DevStep,
  type Experiment,
  type LawLevel,
} from "./dev-mode";
import { traceNode, traceReport } from "./dev-trace";
import { compareProofs, recordProof, type RecordProof } from "./dev-proof";
import type { CoreState } from "../core2/types";
import type { Director } from "../director/ledger";
import type { BenchPlayer } from "./player";

export interface DevWorld {
  core?: CoreState;
  director?: Director;
  player?: BenchPlayer;
  placeId: string;
}

// Saved experiments the owner adds, kept beside the checkout, out of git.
const LOCAL = new URL("../../.bench-local/", import.meta.url);
const SAVED = new URL("dev-experiments.json", LOCAL);
// Records proofs saved to compare two builds' runs (`dev-proof.ts`).
const PROOFS = new URL("proofs/", LOCAL);

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
  world: () => DevWorld,
): Promise<boolean> {
  const path = url.pathname;
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
    case "GET following":
      send(
        200,
        q("personId")
          ? mode.followStatus(q("personId"))
          : { followed: mode.followed() },
      );
      return true;
    case "POST follow": {
      const input = await body(request);
      send(200, mode.follow(String(input.personId)));
      return true;
    }
    case "POST unfollow": {
      const input = await body(request);
      send(200, mode.unfollow(String(input.personId)));
      return true;
    }
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
    case "GET lawmaking-bodies":
      send(200, mode.lawmakingBodies());
      return true;
    case "POST introduce": {
      const input = await body(request);
      send(
        200,
        mode.introduce({
          bodyOfficeId: String(input.bodyOfficeId),
          sponsorId: String(input.sponsorId),
          series: String(input.series),
          value: Number(input.value),
          unit: input.unit === undefined ? undefined : String(input.unit),
        }),
      );
      return true;
    }
    case "GET loans":
      send(200, mode.smallDollarLoans());
      return true;
    case "GET scenes":
      send(200, mode.scenes());
      return true;
    case "POST scene": {
      const input = await body(request);
      send(
        200,
        mode.forceScene({
          typeKey: String(input.typeKey),
          personId:
            typeof input.personId === "string" ? input.personId : undefined,
        }),
      );
      return true;
    }
    case "POST layoff": {
      const input = await body(request);
      send(200, mode.forceLayoff(String(input.personId)));
      return true;
    }
    case "POST illness": {
      const input = await body(request);
      send(200, mode.forceIllness(String(input.personId)));
      return true;
    }
    case "GET wealthiest":
      send(200, mode.wealthiest());
      return true;
    case "POST bribe": {
      const input = await body(request);
      send(
        200,
        mode.forceBribe({
          offererId: String(input.offererId),
          officialId: String(input.officialId),
          subjectId: String(input.subjectId),
          stakeMinor: Number(input.stakeMinor),
          answer:
            input.answer === "takes" || input.answer === "refuses"
              ? input.answer
              : undefined,
        }),
      );
      return true;
    }
    case "POST decide": {
      const input = await body(request);
      send(
        200,
        mode.decideAt(String(input.billId), Number(input.margin), {
          sign: typeof input.sign === "boolean" ? input.sign : undefined,
          discharge: input.discharge === true,
          overrideMargin:
            input.overrideMargin === undefined
              ? undefined
              : Number(input.overrideMargin),
        }),
      );
      return true;
    }
    case "POST run-until": {
      const input = await body(request);
      send(
        200,
        mode.runUntil({
          days: input.days === undefined ? undefined : Number(input.days),
          event: input.event as RunEvent | undefined,
          cap: input.cap === undefined ? undefined : Number(input.cap),
          person: typeof input.person === "string" ? input.person : undefined,
          defeat: Array.isArray(input.defeat)
            ? input.defeat.map(String)
            : undefined,
        }),
      );
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
    case "POST proof/save": {
      // This build's records at today's date, to compare with another build's run.
      const proof = recordProof(core, { rows: true });
      const name = `${core.seed}-${core.date}-${Date.now()}.json`;
      await mkdir(PROOFS, { recursive: true });
      await writeFile(new URL(name, PROOFS), JSON.stringify(proof));
      send(200, { name, digest: proof.digest, uncovered: proof.uncovered });
      return true;
    }
    case "GET proof/compare": {
      // A saved proof by name, only from dev mode's own proofs folder.
      const file = new URL(q("name"), PROOFS);
      if (!file.pathname.startsWith(PROOFS.pathname) || !q("name"))
        throw new Error("Name a proof saved in dev mode's proofs folder.");
      const base = JSON.parse(await readFile(file, "utf8")) as RecordProof;
      const head = recordProof(core, { rows: true });
      const differences = compareProofs(base, head);
      send(200, {
        same: differences.length === 0,
        uncovered: head.uncovered,
        // The first difference opens in the trace; the rest open on click by firstId.
        differences: differences.map((row, i) => ({
          ...row,
          trace:
            i === 0 && row.firstId
              ? traceNode(core, mode.director, row.firstId)
              : undefined,
        })),
      });
      return true;
    }
    case "GET memory":
      send(200, mode.memory(q("id")));
      return true;
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
