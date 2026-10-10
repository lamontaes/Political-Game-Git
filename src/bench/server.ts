import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { realLocalities } from "../core2/places";
import { buildPopulation } from "../core2/population";
import { buildDeepPast } from "../core2/deep-past";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { createOpeningFinance } from "../core2/opening-finance";
import { DEFAULT_DATA } from "../core2/data";
import { withDrives, createDrivesModule } from "../core2/modules/drives";
import { createHealthModule } from "../core2/modules/health";
import { createDirector, type Director } from "../director/ledger";
import { createLifeCore, availableActs } from "../core2/life";
import type { CoreState } from "../core2/types";
import { selectBenchPlace } from "./place-selection.mjs";

// This is a reference to engine-owned state, not a parallel state or writer.
let core: CoreState | undefined;
let director: Director | undefined;
let building = false;
const assets = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  [
    "/client.mjs",
    { file: "client.mjs", type: "text/javascript; charset=utf-8" },
  ],
]);
const serialize = (value: unknown) =>
  JSON.stringify(value, (_key, item) => {
    if (item instanceof Map) return Object.fromEntries(item);
    if (item instanceof Set) return [...item];
    if (typeof item === "bigint") return item.toString();
    return item;
  });

function requireCore(): CoreState {
  if (!core) throw new Error("Generate a town first.");
  return core;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://bench");
  const send = (status: number, value: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(serialize(value));
  };
  try {
    const asset = assets.get(url.pathname);
    if (request.method === "GET" && asset) {
      const content = await readFile(new URL(asset.file, import.meta.url));
      response.writeHead(200, { "Content-Type": asset.type });
      response.end(content);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/build") {
      if (building) throw new Error("Opening generation is already running.");
      const seed = url.searchParams.get("seed") ?? "";
      const date = makeIsoDate(url.searchParams.get("date") ?? "");
      const place = selectBenchPlace(
        seed,
        lifePlaceStateIdentities(),
        realLocalities(),
      );
      building = true;
      try {
        const input = enrichCivicInputs(
          buildDeepPast(
            buildPopulation({
              seed,
              startedAt: date,
              placeKey: place.key,
            }),
          ),
        );
        const nextDirector = createDirector();
        const next = createLifeCore(
          { ...input, finance: createOpeningFinance(input) },
          {
            data: withDrives(DEFAULT_DATA),
            modules: [
              createHealthModule(),
              createDrivesModule(),
              nextDirector.module,
            ],
          },
        );
        nextDirector.start(next);
        const residents = [...next.people.values()]
          .filter((person) => person.placeId === place.context.jurisdiction.id)
          .map((person) => {
            const household = next.households.get(person.householdId);
            const job = person.jobId ? next.jobs.get(person.jobId) : undefined;
            if (
              !household?.memberIds.includes(person.id) ||
              (person.jobId && job?.personId !== person.id)
            )
              throw new Error(
                `Resident references do not resolve: ${person.id}`,
              );
            return {
              id: person.id,
              name: `${person.givenName} ${person.familyName}`,
              age: ageOnDate(
                makeIsoDate(person.birthDate),
                makeIsoDate(next.date),
              ),
              householdId: person.householdId,
              jobId: person.jobId,
            };
          });
        core = next;
        director = nextDirector;
        send(200, {
          seed: core.seed,
          date: core.date,
          placeId: place.context.jurisdiction.id,
          placeKey: place.key,
          placeName: place.displayName,
          jurisdictionKey: place.stateJurisdictionKey,
          residents,
          residentReferencesChecked: residents.length,
          peopleInCore: next.people.size,
          modules: [...next.modules.keys()],
          sourceHeads: JSON.parse(
            await readFile(
              new URL("integration-heads.json", import.meta.url),
              "utf8",
            ),
          ),
          gaps: [...core.gaps],
        });
      } finally {
        building = false;
      }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/resident") {
      const current = requireCore();
      const id = url.searchParams.get("id") ?? "";
      const person = current.people.get(id);
      if (!person) throw new Error("Resident does not exist in core records.");
      director?.watch(current, id);
      send(200, {
        date: current.date,
        person,
        household: current.households.get(person.householdId),
        job: person.jobId ? current.jobs.get(person.jobId) : undefined,
        offers: availableActs(current, id),
        director: director?.ledger.people.get(id),
        records: [...(current.logByPerson.get(id) ?? [])]
          .map((recordId) => current.durableLog.get(recordId))
          .filter((record) => record !== undefined),
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/seed") {
      send(200, {
        seed: randomUUID(),
        date: new Date().toISOString().split("T")[0],
      });
      return;
    }
    send(404, { error: "Unknown bench route." });
  } catch (error) {
    send(400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Engineering port matches the devcontainer's forwarded port; not a model value.
const port = Number(process.env.BENCH_PORT ?? 3000);
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`M0 bench: http://localhost:${port}\n`);
});
