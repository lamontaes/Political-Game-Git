import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_MEASURES } from "../core2/term-read";
import { areaName } from "../english/area-names";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// A protest in the town is the town's officials' scene (owner, Nov 8: "if
// it's bad, you show up to a protest"): someone in it stands up to an
// official about what it is over, the way a resident does at a town hall.
// The web's rows for the town are written the way the web writes them (rents,
// jobs and health sliding over a term, a year after it opened), the
// public-action engine runs through its own calendar, and the scene must
// stand on the record the engine wrote.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const LOCAL = new Set(["city", "county", "township"]);

it(`a rally in the town is its officials' scene about what went well (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "rally-word");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director, placeId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core);
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && LOCAL.has(row.office.level) && core.people.get(id)?.alive)
        director.watch(core, id);
    }
    const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const falls = ["labor.unemployment", "housing.rent", "crime."];
    for (const [at, month] of [
      "2025-01",
      "2026-01",
      "2026-02",
      "2026-03",
    ].entries()) {
      const values: Record<string, number> = {};
      for (const key of TERM_MEASURES) {
        const factor = falls.some((prefix) => key.startsWith(prefix))
          ? -0.3
          : 0.3;
        values[key] = 100 * (1 + factor * (Math.max(at - 1, 0) / 2));
      }
      web.put({
        id: `web:${placeId}:${month}`,
        placeId,
        month,
        date: `${month}-02`,
        values,
        bases: values,
        effects: {},
        engineSources: {},
      } as never);
    }
    advanceCore(core, "2025-07-06");
    const protests = [...core.durableLog.values()].filter(
      (row) => row.kind === "civic.rally",
    );
    let composed = 0;
    for (const protest of protests) {
      for (const hostId of protest.witnessIds ?? []) {
        const book = director.ledger.people.get(hostId as PersonId);
        const entry = book?.schedule.find((row) =>
          row.momentId.includes(protest.id),
        );
        const binding = entry?.bindings.find(
          (row) => row.typeKey === "rally-word",
        );
        if (!entry || !binding) continue;
        const here = `${where}: ${protest.id} for ${hostId}`;
        const result = purposeScene(core, director, hostId as PersonId, entry, {
          typeKey: "rally-word",
        });
        if (result?.kind !== "composed") continue;
        composed += 1;
        const { scene } = result;
        expect(scene.cause.id, here).toBe(protest.id);
        // The protester is one of the people in it, and never the official.
        expect(protest.personIds, here).toContain(scene.askerId);
        expect(scene.askerId, here).not.toBe(hostId);
        // It names the area the term read well in, and no demand.
        const area = scene.facts.find((row) => row.key === "area");
        expect(area?.text, here).toBe(areaName(protest.facts!.area!));
        expect(
          scene.facts.some((row) => row.key === "issue"),
          here,
        ).toBe(false);
        expect(scene.talk.state.text.toLowerCase(), here).toContain(
          area!.text.toLowerCase(),
        );
        expect(scene.purpose, here).toBe("rally-word");
        // The reply options are up to four different stances in plain words.
        const root = scene.talk.tree.replies.map((reply) => reply.line);
        expectUpToFourDifferent(root, here);
        for (const row of root)
          expect(["agree", "thank", "promise", "deflect"], here).toContain(
            row.move,
          );
        for (const row of [scene.talk.state, ...root])
          expect(row.text, here).not.toMatch(
            /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
          );
        process.stdout.write(
          `RALLY SCENE ${here}\n  ${scene.talk.state.text}\n`,
        );
      }
    }
    if (composed) return;
    tried.push(`${where} (${protests.length} rallies)`);
  }
  throw new Error(`No rally scene composed in: ${tried.join("; ")}`);
}, 600_000);
