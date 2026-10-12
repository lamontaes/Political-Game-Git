import { personOrFillIn } from "../core2/state";
import { bringItUp } from "../director/bring-it-up";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";
import { knownCard, personCard } from "./card";
import { openingShots } from "./opening";
import { calendarItems, heardItems, newsItems } from "./calendar";
import { campaignAct, campaignView } from "./campaign";
import { storyScene } from "./story";
import { economyView, worldPanels } from "./economy";
import { electionResults } from "./results";
import { bodyScene, seatAct, seatView } from "./legislature";
import { budgetView, setPriority } from "./budget";
import { familyView } from "./family";
import { governmentMap } from "./map";
import { lifePlaceSearch } from "../simulation/life-places";
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
import { townPlaces, visitPlace } from "./places";
import { lawChanges } from "./changes";
import { choiceName, policyNames } from "./words";
import controls from "./data/controls.json" with { type: "json" };
import { playerApiReadiness } from "./api-readiness";

// This is a reference to engine-owned state, not a parallel state or writer.
let core: CoreState | undefined;
let director: Director | undefined;
let player: BenchPlayer | undefined;
let placeId = "";
let building = false;
let conversation: Conversation | undefined;
let filingVisit: BenchFilingVisit | undefined;
// What the other person brought up when the conversation opened (OPUS-PEOPLE's
// "bring it up"): their lines come first in the conversation.
let broughtUp: { text: string; sourceRecordIds: readonly string[] }[] = [];
const talkView = (value: Conversation | undefined) =>
  value && {
    otherId: value.otherId,
    lines: [
      ...broughtUp.map((line) => ({
        ...line,
        speakerId: value.otherId,
        act: "tell",
      })),
      ...value.lines,
    ].map((line) => ({
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
  for (const { targetId, offerId, actionId } of offers as {
    targetId: string;
    offerId: string;
    actionId: string;
  }[]) {
    const person = current.people.get(targetId);
    const org = current.organizations.get(targetId);
    if (person) out[targetId] = `${person.givenName} ${person.familyName}`;
    else if (org) out[targetId] = org.name;
    // The choice's own name, from OPUS-WORDS' mined bank where it has one.
    const named = choiceName(actionId, out[targetId]);
    if (named) out[offerId] = named.text;
  }
  // The employer whose shift a stop falls on, so the screen can say so.
  const work = (
    value as
      | {
          stop?: {
            work?: { reasons: { owner: { organizationId: string } }[] } | null;
          };
        }
      | undefined
  )?.stop?.work;
  for (const { owner } of work?.reasons ?? []) {
    const org = current.organizations.get(owner.organizationId);
    if (org) out[owner.organizationId] = org.name;
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
          {
            twoLevel: true,
            ...(url.searchParams.get("settings")
              ? { settings: JSON.parse(url.searchParams.get("settings")!) }
              : {}),
            ...(url.searchParams.get("placeKey")
              ? { placeKey: url.searchParams.get("placeKey")! }
              : {}),
          },
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
      // Someone still in the counts is filled in the moment they're looked at.
      if (!personOrFillIn(current, id))
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
      if (!personOrFillIn(requireCore(), otherId)?.alive)
        throw new Error("Talk to a living resident.");
      conversation = openConversation(requireCore(), player.personId, otherId);
      // They mention the newest change they know of, and who they blame.
      broughtUp =
        bringItUp(requireCore(), otherId, player.personId)?.lines ?? [];
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
    if (request.method === "GET" && url.pathname === "/api/places") {
      // Engineering list length for the place picker, not a model value.
      const rows = lifePlaceSearch(url.searchParams.get("q") ?? "", 8, {
        scope: "locality",
      });
      send(
        200,
        rows.map((row) => ({ key: row.key, name: row.displayName })),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/map") {
      send(200, governmentMap(requireCore()));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/family") {
      send(200, familyView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/budget") {
      send(200, budgetView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/budget/priority") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        setPriority(
          requireCore(),
          player.personId,
          url.searchParams.get("governmentId") ?? "",
          url.searchParams.get("line") ?? "",
          Number(url.searchParams.get("change")) || 0,
        ),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/goto") {
      send(
        200,
        townPlaces(
          requireCore(),
          url.searchParams.get("id") ?? player?.personId ?? "",
          player?.packet,
        ),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/goto/visit") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      send(
        200,
        visitPlace(
          requireCore(),
          player.personId,
          url.searchParams.get("org") ?? "",
          player.packet?.at.minuteOfDay ?? 12 * 60,
        ),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/changes") {
      send(200, lawChanges(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/controls") {
      send(200, { ...controls, policyNames: policyNames() });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/progress") {
      send(
        200,
        benchProgress(
          requireCore(),
          placeId,
          url.searchParams.get("id") ?? undefined,
        ),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/seat") {
      send(200, seatView(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/seat/scene") {
      send(
        200,
        bodyScene(
          requireCore(),
          url.searchParams.get("id") ?? "",
          url.searchParams.get("officeId") ?? "",
          player?.packet?.at.minuteOfDay ?? 12 * 60,
        ),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/seat/act") {
      if (!player?.personId) throw new Error("Choose a resident first.");
      const q = (key: string) => url.searchParams.get(key) ?? undefined;
      send(
        200,
        seatAct(requireCore(), player.personId, {
          kind: q("kind") ?? "",
          officeId: q("officeId"),
          billId: q("billId"),
          memberId: q("memberId"),
          series: q("series"),
          question: q("question"),
          value: q("value") === undefined ? undefined : Number(q("value")),
          deal: q("deal"),
        }),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/results") {
      send(
        200,
        electionResults(requireCore(), url.searchParams.get("id") ?? ""),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/economy") {
      send(
        200,
        economyView(requireCore(), placeId, url.searchParams.get("id") ?? ""),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/world") {
      send(200, worldPanels(requireCore(), placeId));
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
        {
          platform: url.searchParams.getAll("stance"),
          party: url.searchParams.get("party") || null,
        },
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
      const id = url.searchParams.get("id");
      // What you heard first, then your town's public record; not every
      // news event in the world.
      const heard = id ? heardItems(requireCore(), id) : [];
      const seen = new Set(heard.map((row) => row.id));
      send(200, [
        ...heard,
        ...newsItems(requireCore()).filter(
          (row) => row.visibility === "public" && !seen.has(row.id),
        ),
      ]);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/opening") {
      send(200, openingShots(requireCore(), url.searchParams.get("id") ?? ""));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/known") {
      send(
        200,
        knownCard(
          requireCore(),
          url.searchParams.get("id") ?? "",
          personOrFillIn(requireCore(), url.searchParams.get("other") ?? "")
            ?.id ?? "",
        ),
      );
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
        progress: benchProgress(requireCore(), placeId, player?.personId),
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
        progress: benchProgress(requireCore(), placeId, player?.personId),
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/play") {
      if (!player) throw new Error("Generate a town first.");
      const id = url.searchParams.get("id") ?? "";
      personOrFillIn(requireCore(), id);
      player.select(id);
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
      const person = personOrFillIn(current, id);
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
