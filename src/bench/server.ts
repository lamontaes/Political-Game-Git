import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";
import { personCard } from "./card";
import { openingShots } from "./opening";
import { calendarItems, newsItems } from "./calendar";
import { campaignAct, campaignView } from "./campaign";
import { storyScene } from "./story";
import {
  chooseAtCounter,
  openBenchFilingVisit,
  type BenchFilingVisit,
} from "./filing";
import { backdropPath, benchScene, figurePng } from "./scene";
import {
  openConversation,
  say,
  type Conversation,
} from "../director/conversation";
import { composeJournal } from "../director/journal";
import {
  askKnownPeopleToSign,
  fileForOffice,
  governmentView,
} from "./government";
import { availableActs } from "../core2/life";
import type { Director } from "../director/ledger";
import type { CoreState } from "../core2/types";
import { benchProgress } from "./progress";
import { playerApiReadiness } from "./api-readiness";

// This is a reference to engine-owned state, not a parallel state or writer.
let core: CoreState | undefined;
let director: Director | undefined;
let player: BenchPlayer | undefined;
let placeId = "";
let building = false;
let conversation: Conversation | undefined;
let filingVisit: BenchFilingVisit | undefined;
const talkView = (value: Conversation | undefined) =>
  value && {
    otherId: value.otherId,
    lines: value.lines.map((line) => ({
      ...line,
      speaker: (() => {
        const person = requireCore().people.get(line.speakerId);
        return person && `${person.givenName} ${person.familyName}`;
      })(),
    })),
    choices: value.choices,
    lie: value.lie,
  };
const assets = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  [
    "/client.mjs",
    { file: "client.mjs", type: "text/javascript; charset=utf-8" },
  ],
  ["/play", { file: "play.html", type: "text/html; charset=utf-8" }],
  ["/play.mjs", { file: "play.mjs", type: "text/javascript; charset=utf-8" }],
  ["/play.css", { file: "play.css", type: "text/css; charset=utf-8" }],
]);
// The approved Kit 12/13 fonts and controls, served from public/.
const PUBLIC = new URL("../../public/", import.meta.url);
const publicFile =
  /^\/(fonts\/kit12\/[a-z0-9-]+\.ttf|ui\/kit1[23]\/[a-z0-9-]+\.svg)$/;
/** Names for the people and places a packet's offers point at. */
function namesFor(value: unknown): Record<string, string> {
  const current = requireCore();
  const out: Record<string, string> = {};
  const offers =
    (value as { offers?: { targetId: string }[] } | undefined)?.offers ?? [];
  for (const { targetId } of offers) {
    const person = current.people.get(targetId);
    const org = current.organizations.get(targetId);
    if (person) out[targetId] = `${person.givenName} ${person.familyName}`;
    else if (org) out[targetId] = org.name;
  }
  return out;
}
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
    const shared = publicFile.exec(url.pathname);
    if (request.method === "GET" && shared) {
      const content = await readFile(new URL(shared[1]!, PUBLIC));
      response.writeHead(200, {
        "Content-Type": shared[1]!.endsWith(".svg")
          ? "image/svg+xml"
          : "font/ttf",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/newlife") {
      if (building) throw new Error("Opening generation is already running.");
      building = true;
      try {
        // The whole town, two-level (OPUS-CORE): full people for the
        // player's circle and officials, counts for everyone else.
        const world = buildBenchWorld(
          url.searchParams.get("seed") ?? "",
          url.searchParams.get("date") ?? "",
          { twoLevel: true },
        );
        core = world.core;
        director = world.director;
        player = new BenchPlayer(world.core, world.director);
        conversation = undefined;
        placeId = world.placeId;
        const entrant = { personId: world.playerId! };
        player.select(entrant.personId);
        send(200, {
          personId: entrant.personId,
          placeName: world.place.displayName,
          date: core.date,
          packet: player.packet,
          names: {},
        });
      } finally {
        building = false;
      }
      return;
    }
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/art/backdrops/")
    ) {
      const content = await readFile(
        backdropPath(url.pathname.slice("/art/backdrops/".length)),
      );
      response.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "max-age=3600",
      });
      response.end(content);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/figure") {
      const png = figurePng(
        requireCore(),
        url.searchParams.get("person") ?? "",
        url.searchParams.get("place") ?? "",
        url.searchParams.get("spot") ?? "",
      );
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      });
      response.end(png);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/scene") {
      const current = requireCore();
      const id = url.searchParams.get("id") ?? "";
      if (!current.people.has(id))
        throw new Error("Resident does not exist in core records.");
      send(
        200,
        benchScene(
          current,
          id,
          player?.personId === id ? player.packet : undefined,
        ),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/talk/open") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      const otherId = url.searchParams.get("otherId") ?? "";
      if (!requireCore().people.get(otherId)?.alive)
        throw new Error("Talk to a living resident.");
      conversation = openConversation(requireCore(), player.personId, otherId);
      send(200, talkView(conversation));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/talk/say") {
      if (!conversation) throw new Error("No conversation is open.");
      conversation = say(
        requireCore(),
        conversation,
        url.searchParams.get("key") ?? "",
      );
      send(200, talkView(conversation));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/talk/leave") {
      conversation = undefined;
      send(200, {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/journal") {
      if (!director) throw new Error("Generate a town first.");
      send(
        200,
        composeJournal(
          requireCore(),
          director,
          url.searchParams.get("id") ?? "",
        ),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/story") {
      if (!player?.personId || !director)
        throw new Error("Choose a resident first.");
      send(
        200,
        storyScene(
          requireCore(),
          director,
          player.personId,
          url.searchParams.get("momentId") ?? "",
          player.packet?.at.minuteOfDay ?? 12 * 60,
        ),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/campaign") {
      send(200, campaignView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/campaign/act") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      const number = (key: string) =>
        Number(url.searchParams.get(key)) || undefined;
      send(
        200,
        campaignAct(requireCore(), player.personId, {
          filingId: url.searchParams.get("filingId") ?? "",
          kind: url.searchParams.get("kind") ?? "",
          hours: number("hours"),
          venue: url.searchParams.get("venue") ?? undefined,
          statements: url.searchParams.get("statements") ?? undefined,
          amountMinor: number("amountMinor"),
          sampleSize: number("sampleSize"),
        }),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/filing/open") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      filingVisit = openBenchFilingVisit(
        requireCore(),
        player.personId,
        url.searchParams.get("filedWith") ?? "",
        player.packet?.at.minuteOfDay ?? 12 * 60,
      );
      send(200, filingVisit);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/filing/choose") {
      if (!filingVisit) throw new Error("No filing visit is open.");
      filingVisit = chooseAtCounter(
        requireCore(),
        filingVisit,
        url.searchParams.get("key") ?? "",
      );
      send(200, filingVisit);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/filing/leave") {
      filingVisit = undefined;
      send(200, {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/calendar") {
      send(200, {
        date: requireCore().date,
        items: calendarItems(requireCore(), url.searchParams.get("id") ?? ""),
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/news") {
      send(200, newsItems(requireCore()));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/opening") {
      send(200, openingShots(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/card") {
      send(200, personCard(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/government") {
      send(
        200,
        governmentView(requireCore(), url.searchParams.get("id") ?? ""),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/file") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        fileForOffice(
          requireCore(),
          player.personId,
          url.searchParams.get("contestId") ?? "",
          url.searchParams.get("payFee") === "true",
        ),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/sign") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        askKnownPeopleToSign(
          requireCore(),
          player.personId,
          url.searchParams.get("filingId") ?? "",
        ),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/capabilities") {
      send(200, playerApiReadiness());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/advance") {
      if (!player) throw new Error("Generate a town first.");
      const result = player.advance(
        url.searchParams.get("mode") ?? "day",
        url.searchParams.get("date") ?? undefined,
        Number(url.searchParams.get("days")) || undefined,
      );
      send(200, {
        ...result,
        names: namesFor(result.packet),
        progress: benchProgress(requireCore(), placeId),
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/resume") {
      if (!player) throw new Error("Generate a town first.");
      const pauseId = url.searchParams.get("pauseId") ?? "";
      const result =
        url.searchParams.get("kind") === "choice"
          ? player.resume({
              kind: "choice",
              pauseId,
              offerId: url.searchParams.get("offerId") ?? "",
            })
          : player.resume({ kind: "stop", pauseId });
      send(200, {
        ...result,
        names: namesFor(result.packet),
        progress: benchProgress(requireCore(), placeId),
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/play") {
      if (!player) throw new Error("Generate a town first.");
      player.select(url.searchParams.get("id") ?? "");
      if (conversation?.playerId !== player.personId) conversation = undefined;
      send(200, {
        personId: player.personId,
        packet: player.packet,
        selfChosen: player.selfChosen.slice(-50),
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/trace") {
      if (!player) throw new Error("Generate a town first.");
      send(200, player.trace(url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/build") {
      if (building) throw new Error("Opening generation is already running.");
      const seed = url.searchParams.get("seed") ?? "";
      const date = url.searchParams.get("date") ?? "";
      // Stopgap SG-PLAY-bench-town-size: a smaller town plays at a usable
      // speed until the core's two-level population and speed work land.
      const size = Number(url.searchParams.get("size") ?? "") || undefined;
      building = true;
      try {
        const world = buildBenchWorld(seed, date, { minimumPeople: size });
        const { place, residents } = world;
        const next = world.core,
          nextDirector = world.director;
        core = next;
        director = nextDirector;
        player = new BenchPlayer(next, nextDirector);
        conversation = undefined;
        placeId = place.context.jurisdiction.id;
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
          progress: benchProgress(next, place.context.jurisdiction.id),
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
      send(200, {
        playing: player?.personId === id,
        date: current.date,
        packet: player?.packet,
        person,
        household: current.households.get(person.householdId),
        job: person.jobId ? current.jobs.get(person.jobId) : undefined,
        offers: availableActs(current, id),
        director: director?.ledger.people.get(id),
        relationships: [...(current.relationshipsByPerson.get(id) ?? [])]
          .map((recordId) => current.relationships.get(recordId))
          .filter((record) => record !== undefined),
        payments: [...(current.cashJournal.detailedByOwner.get(id) ?? [])]
          .map((recordId) => current.cashJournal.detailedReceipts.get(recordId))
          .filter((record) => record !== undefined),
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
