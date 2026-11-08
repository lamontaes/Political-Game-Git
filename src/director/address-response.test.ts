import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { wordPrintedStory } from "../bench/archive-words";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { officialsIn } from "../core2/modules/officials";
import { placeStateKey } from "../core2/place-map";
import { CASE_MADE } from "../core2/modules/speech";
import { coreAPI, registerModule } from "../core2/state";
import { ADDRESS_RESPONSE_EVENT, responderTo } from "./address-response";
import { recordLocalAddress } from "./local-address";

// The other side answers a governor's address (owner, Nov 8: "speeches against
// the governor"). In a world drawn from all 56 places the governor's address
// is recorded as the calendar would; the legislator of the other party who
// leads their side answers on the first ask they stand against; the answer is
// a public record the paper tells and a case the speech engine puts to the
// governor. No answer without an ask a legislator of the other party opposes.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 8;

it(`a legislator of the other party answers the governor's address (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "address-response");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const cases: string[] = [];
    registerModule(core, {
      id: "test-response-tap",
      eventKinds: [CASE_MADE],
      onEvent: (_api, event) => {
        if (event.id.startsWith(`case:${ADDRESS_RESPONSE_EVENT}`))
          cases.push(event.id);
      },
    });
    const story = recordLocalAddress(core, "state");
    if (!story) {
      tried.push(`${where}: no governor's address`);
      continue;
    }
    const recorded = core.durableLog.get(
      `${ADDRESS_RESPONSE_EVENT}:${core.date}`,
    );
    if (!recorded) {
      tried.push(
        `${where}: no answer (${story.asks.length} asks, no legislator of the other party stands against one)`,
      );
      continue;
    }
    const api = coreAPI(core);
    const stateKey = placeStateKey(core.placeMetadata.placeKey)!;
    const governor = officialsIn(api, `${stateKey}:governor`)[0]!;
    const responder = responderTo(api, stateKey, governor)!;
    expect(recorded.personIds, where).toEqual([responder.id]);
    expect(responder.party, where).not.toBe(governor.party);
    expect(story.asks, where).toContain(recorded.facts!.question);
    expect(recorded.facts!.governorId, where).toBe(story.speakerId);
    const worded = wordPrintedStory(core, {
      id: `printed:test:${recorded.id}`,
      kind: "press.printed",
      date: recorded.date,
      topic: recorded.topic,
      facts: { sourceRecordId: recorded.id },
    } as never);
    expect(worded, `${where}: the answer is worded`).toBeTruthy();
    expect(worded!.sourceRecordIds, where).toContain(recorded.id);
    process.stdout.write(
      `ADDRESS RESPONSE ${where}: ${responder.party} ${responder.leadership ?? "legislator"} answers ${governor.party} governor; cases ${cases.length}\n  ${worded!.headline} / ${worded!.lede}\n`,
    );
    return;
  }
  throw new Error(`no answer: ${tried.join("; ")} (seed ${seed})`);
}, 900_000);
