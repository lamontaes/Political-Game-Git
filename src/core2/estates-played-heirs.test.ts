import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { heirsOf, settleEstate, willOf } from "./estates";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import type { CoreEventInput } from "./types";

// Played-world proof: an estate whose heir dies while probate waits still
// reaches that heir's own family, in a world built the way the game builds it.
// Pinned to named places (found by a one-off search, nothing is drawn here).
const PLACES = [
  {
    name: "Dennis, Massachusetts",
    key: "2516740",
    seed: "9b87fa9d713b54ecc27f071016da6e4ecd4f220b5f459bbd5c86bc14e9fc9f97",
  },
];

describe("an estate keeps its heirs through probate (played world)", () => {
  for (const place of PLACES)
    for (const by of ["intestacy", "will"] as const)
      it(`${place.name}: by ${by}, a dead heir's share reaches the heir's own children`, () => {
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const kidsOf = (id: string) =>
          [...(core.people.get(id)?.pastFacts ?? [])]
            .filter((f) => f.kind === "family:child")
            .map((f) => String(f.facts?.otherPersonId))
            .filter((k) => core.people.get(k)?.alive);
        const found = [...core.people.values()]
          .filter((p) => p.alive && p.liquidMinor > 100_00)
          .sort((a, b) => a.id.localeCompare(b.id))
          .flatMap((p) => {
            // A will names its beneficiaries (read on the day of death); with none, the law names the heirs.
            const will = willOf(api, p);
            const named =
              by === "will"
                ? (will ?? []).map((r) => r.id)
                : will
                  ? []
                  : heirsOf(api, p).heirs;
            // By the law, a share passes down to an heir's own children
            // only in the descendants' class (Uniform Probate Code §2-103,
            // §2-106): a dead parent's share goes to the surviving parent.
            // So the heir is the decedent's own child there.
            return named
              .filter(
                (h) =>
                  kidsOf(h).length > 0 &&
                  (by === "will" || kidsOf(p.id).includes(h)),
              )
              .map((h) => ({ dead: p.id, heir: h }));
          })[0];

        expect(found, `${where}: an heir with a living child`).toBeDefined();
        const { dead, heir } = found!;
        const grandkids = kidsOf(heir);
        const before = grandkids.map((k) => core.people.get(k)!.liquidMinor);
        const heard: CoreEventInput[] = [];
        registerModule(core, {
          id: "test:estate-reader",
          eventKinds: ["estate.settled"],
          onEvent: (_api, event) => {
            heard.push(event);
          },
        });
        api.updatePerson(dead, { alive: false });
        settleEstate(api, dead, "event:death:proof");
        api.updatePerson(heir, { alive: false });
        advanceCore(
          core,
          addDays(makeIsoDate(core.date), api.parameter("probateDays") + 2),
        );
        const settled = heard.find((e) => e.facts?.decedentId === dead);
        expect(settled, `${where}: probate closed`).toBeDefined();
        expect(settled!.facts!.by).toBe(by);
        const after = grandkids.map((k) => core.people.get(k)!.liquidMinor);
        expect(
          after.some((v, i) => v > before[i]!),
          `${where}: a child of ${heir} was paid`,
        ).toBe(true);
      }, 420_000); // Probate's 270 played days are the game's own time (about 170 s in a played town).
});
