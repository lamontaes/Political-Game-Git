import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "../core2/life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../core2/modules/world";
import { generatedOpening } from "../core2/tooling/generated-world";
import type { CoreEventInput, CoreModule } from "../core2/types";
import { createHash } from "node:crypto";
import {
  searchCorePlaces,
  corePlaceStateIdentities,
} from "../core2/place-lookup";
import { composeJournal } from "./journal";
import { createDirector } from "./ledger";
import { peopleData, peopleModules } from "./play-modules";

// M4-01, stories from the economy: over a year of the whole economy in a
// drawn two-level town, the events WORLD's own engines record (a lost job, a
// new business, an eviction, a home bought) and people moving away become
// moments for the people they touched, and the journal tells them.
// Without the runner, a place drawn from all 56 the way the runner draws.
function drawPlace(label: string) {
  const hash = createHash("sha256").update(label).digest("hex");
  const states = [...corePlaceStateIdentities()].sort((a, b) =>
    a.jurisdictionKey.localeCompare(b.jurisdictionKey),
  );
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const place = places[parseInt(hash.slice(8, 16), 16) % places.length]!;
  return { seed: hash, key: place.key };
}
const drawn = drawPlace("world-moments-default:M4-01");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = withWorldEconomy(
  generatedOpening({ seed, key }, { twoLevel: true }),
);
const watch = input.people
  .filter((person) => person.tier !== "husk")
  .map((person) => person.id);
const director = createDirector({ watch });
// Every economy event, as recorded, with who it named and who saw it.
const KINDS = [
  "work.job-lost",
  "organization.founded",
  "housing.eviction",
  "housing.purchase",
  "person.moved-away",
  "person-birth",
];
const recorded: CoreEventInput[] = [];
const recorder: CoreModule = {
  id: "test-recorder",
  eventKinds: KINDS,
  onEvent(_api, event) {
    recorded.push(event);
  },
};
const core = createLifeCore(input, {
  data: peopleData(worldCoreData()),
  modules: [...WORLD_MODULES, ...peopleModules(), recorder, director.module],
});
director.start(core);
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
advanceCore(core, end.toISOString().slice(0, 10));
const watched = new Set(watch);
const momentsCiting = (eventId: string) =>
  [...director.ledger.people.values()].flatMap((book) =>
    book.moments
      .filter((moment) => moment.causeId === eventId)
      .map((moment) => moment.personId),
  );

describe(`moments from the economy over a year in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("records economy events that name the people the director watches", () => {
    expect(
      recorded.some((event) =>
        event.personIds.some((personId) => watched.has(personId)),
      ),
    ).toBe(true);
  });

  it("gives everyone an economy event named a moment that cites it, or measures it below the floor", () => {
    // A change too small to be a moment (a layoff two months into a job) is
    // measured and counted under the floor, never lost: the director keeps
    // the label it scored under.
    const FLOOR_LABEL: Readonly<Record<string, string>> = {
      "work.job-lost": ":job-ended",
    };
    const missed = recorded.flatMap((event) =>
      event.personIds
        .filter(
          (personId) =>
            watched.has(personId) &&
            !momentsCiting(event.id).includes(personId) &&
            !(
              FLOOR_LABEL[event.kind] !== undefined &&
              [
                ...(director.ledger.people.get(personId)?.belowFloor.keys() ??
                  []),
              ].some((label) => label.endsWith(FLOOR_LABEL[event.kind]!))
            ),
        )
        .map((personId) => {
          const book = director.ledger.people.get(personId);
          return `${event.kind} ${event.id} ${personId} tier=${core.people.get(personId)?.tier} same-day=${(
            book?.moments ?? []
          )
            .filter((m) => m.date === event.date)
            .map((m) => `${m.causeKind}:${m.causeId}`)
            .join(",")}`;
        }),
    );
    expect(missed).toEqual([]);
  });

  it("reaches the relatives a move away left behind", () => {
    for (const event of recorded.filter(
      (row) => row.kind === "person.moved-away",
    )) {
      const relatives = (event.witnessIds ?? []).filter(
        (id) =>
          watched.has(id) &&
          event.personIds.some((mover) =>
            core.people.get(mover)!.familyIds.has(id),
          ),
      );
      for (const id of relatives) expect(momentsCiting(event.id)).toContain(id);
    }
  });

  it("tells them in the journal, every line traced to a record", () => {
    const lines = watch.flatMap((personId) =>
      composeJournal(core, director, personId).flatMap((chapter) =>
        chapter.lines.map((line) => ({ personId, line })),
      ),
    );
    const economy = lines.filter(({ line }) =>
      /lost (my|his|her|their) job|started .+\.$|were evicted|bought a house|moved away|(moved|came)( back)? to .+\.$/.test(
        line.text,
      ),
    );
    expect(economy.length).toBeGreaterThan(0);
    for (const { line } of economy)
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
    // A relative's line names them by relation and their recorded gender.
    for (const { line } of economy)
      expect(line.text).not.toMatch(/^My (father|son|brother) lost her job/);
  });

  it("tells parents of a baby born this year, by relation", () => {
    const born = recorded.filter((event) => event.kind === "person-birth");
    for (const event of born) {
      const parents = event.personIds.filter(
        (id) => watched.has(id) && id !== event.facts?.childId,
      );
      for (const parentId of parents) {
        const text = composeJournal(core, director, parentId).flatMap(
          (chapter) => chapter.lines.map((line) => line.text),
        );
        // The line carries the child's name (owner, Oct 15, evening: "My
        // daughter Jane was born.").
        expect(
          text.some(
            (line) =>
              /\b[Mm]y (son|daughter|child) [A-Z][\w'-]*( was born| came along)?\.$/.test(
                line,
              ) || /^My (son|daughter|child)( [^.]+)? was born\./.test(line),
          ),
        ).toBe(true);
      }
    }
  });
});
