/**
 * A grading batch of speeches, public comment, hearings, victory and
 * concession, interview answers and headlines, composed by the English
 * engine from the mined banks with facts drawn from generated places'
 * records: residents, the town, their employers, schools and years. Moves
 * whose facts no record holds (a bill, a stance) are left out of the turn, as
 * the engine leaves out any move it cannot word. One axis per line: whether
 * it sounds like that register.
 *
 *   node --import tsx scripts/english-corpus/grading-batch-speech.ts \
 *     --id batch-5 --size 100 <seed> [<seed> ...]
 *
 * Development tooling only; grading never blocks a merge.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { buildDeepPast } from "../../src/core2/deep-past";
import { buildPopulation } from "../../src/core2/population";
import { lifePlaceByJurisdictionId } from "../../src/simulation/life-places";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { properName, spoken } from "../../src/director/words";
import { composeGroundedLine } from "../../src/english/english-composition";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { ADDRESS_BANK, ADDRESS_REGISTERS, composeTurn } from "./address-bank";
import interviewJson from "../../data/english/parts/interview.json" with { type: "json" };
import headlinesJson from "../../data/english/parts/headlines.json" with { type: "json" };

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1]! : fallback;
};
const id = option("id", "batch-5");
const size = Number(option("size", "100"));
const seeds = args.filter(
  (arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--"),
);

type Part = {
  key: string;
  text: string;
  uses: { subject: string; role: string }[];
};
const pattern = (text: string) =>
  new RegExp(
    `^${text.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{\w+\}/g, ".+")}$`,
    "i",
  );
const matcher = (parts: Part[]) => {
  const rows = [...parts]
    .sort((a, b) => b.text.length - a.text.length)
    .map((part) => ({ key: part.key, re: pattern(part.text) }));
  return (text: string) => rows.find((row) => row.re.test(text))?.key;
};
const addressPart = matcher(ADDRESS_BANK.parts as unknown as Part[]);
const INTERVIEW = (interviewJson as unknown as { parts: Part[] }).parts;
const HEADLINES = (headlinesJson as unknown as { parts: Part[] }).parts;

type Facts = Record<string, { text: string; sourceRecordIds: string[] }>;
const packet = (
  seed: string,
  moment: string,
  facts: Facts,
  stage: string,
  version: string,
): GroundedEnglishPacket =>
  ({
    surface: "dialogue",
    momentKey: moment,
    worldSeed: seed,
    bankVersion: version,
    stage,
    sourceRecordIds: Object.values(facts).flatMap((f) => f.sourceRecordIds),
    facts,
    speaker: { personId: "speaker", traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: "speaker",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  }) as unknown as GroundedEnglishPacket;

interface Item {
  id: string;
  axis: string;
  situation: string;
  prior: string;
  reply: string;
  part: string | null;
  parts: string[];
  composer: string;
  kind: "meeting" | "press" | "news";
  cell: Record<string, string | null>;
  seed: string;
}
const items: Item[] = [];
const places = new Set<string>();
const cell = (register: string, kind: string, place: string) => ({
  register,
  kind,
  relationship: "stranger",
  trait: null,
  mood: null,
  experience: null,
  belief: null,
  place,
  pose: null,
  ageBand: "adult",
});

for (const seed of seeds) {
  const base = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 500 }),
    ),
  );
  const placeName = base.placeMetadata?.placeName ?? seed;
  places.add(placeName);
  const age = (birth: string) =>
    ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
  const adults = base.people.filter(
    (person) =>
      person.tier !== "husk" && age(person.birthDate) >= 40 && person.jobId,
  );
  for (const [n, person] of adults.slice(0, 3).entries()) {
    const job = base.jobs.find((row) => row.id === person.jobId);
    const org = base.organizations.find(
      (row) => row.id === job?.organizationId,
    );
    const school = (person.pastFacts ?? []).find(
      (fact) => fact.facts?.schoolName,
    );
    const tenure = (person.pastFacts ?? []).find(
      (fact) => fact.kind === "work:tenure-summary",
    );
    const place = lifePlaceByJurisdictionId(person.placeId as never);
    const other = adults[(n + 3) % adults.length]!;
    const gender = (person as { looks?: { gender?: string } }).looks?.gender;
    const facts: Facts = {
      name: {
        text: `${person.givenName} ${person.familyName}`,
        sourceRecordIds: [person.id],
      },
      opponent: {
        text: `${other.givenName} ${other.familyName}`,
        sourceRecordIds: [other.id],
      },
      ...(place
        ? {
            place: {
              text: spoken(place),
              sourceRecordIds: [person.householdId],
            },
          }
        : {}),
      ...(org
        ? {
            employer: { text: properName(org.name), sourceRecordIds: [org.id] },
          }
        : {}),
      ...(school?.facts?.schoolName
        ? {
            school: {
              text: properName(school.facts.schoolName),
              sourceRecordIds: [school.id],
            },
          }
        : {}),
      ...(tenure?.facts?.startedAt
        ? {
            years: {
              text: String(2021 - Number(tenure.facts.startedAt.slice(0, 4))),
              sourceRecordIds: [tenure.id],
            },
          }
        : {}),
      ...(gender === "female" || gender === "male"
        ? {
            pronoun: {
              text: gender === "female" ? "her" : "his",
              sourceRecordIds: [person.id],
            },
            "pronoun-obj": {
              text: gender === "female" ? "her" : "him",
              sourceRecordIds: [person.id],
            },
          }
        : {}),
    };
    const chair = n % 2 === 0 ? "chair-female" : "chair-male";
    // A memorial is for someone the records show has died; these are living.
    for (const register of Object.keys(ADDRESS_REGISTERS).filter(
      (name) => name !== "house-memorial",
    )) {
      const turn = composeTurn(
        packet(
          seed,
          `${seed}:${person.id}:${register}`,
          facts,
          chair,
          "words-address-v1",
        ),
        register,
      );
      if (!turn) continue;
      turn.moves.forEach((move, at) => {
        const key = addressPart(move);
        items.push({
          id: `${seed}:${person.id}:${register}:${at}`,
          axis: `sounds like ${register.replace(/-/g, " ")}`,
          situation: `A ${register.replace(/-/g, " ")} turn in ${placeName}, about or by ${facts.name!.text} (records: their town, employer, school and years there).`,
          prior: at > 0 ? `Speaker: ${turn.moves[at - 1]}` : "",
          reply: `Speaker: ${move}`,
          part: key ?? null,
          parts: key ? [key] : [],
          composer:
            "composeAddress / composeGroundedLine (src/english/english-composition.ts), words from data/english/parts/address.json",
          kind: "meeting",
          cell: cell("meeting", register, placeName),
          seed,
        });
      });
    }
    // Interview answers and questions, each a whole line.
    // A few interview lines per person, spread across the bank.
    for (const part of INTERVIEW.filter(
      (_row, at) => at % adults.slice(0, 3).length === n,
    ).slice(0, 8)) {
      const role = part.uses[0]!.subject;
      const line = composeGroundedLine(
        packet(
          seed,
          `${seed}:${person.id}:${part.key}`,
          facts,
          "adult",
          "words-interview-v1",
        ),
        {
          key: `interview.${part.key}`,
          version: "words-interview-v1",
          surface: "dialogue",
          act: role === "reporter" ? "ask" : "answer",
          parts: {
            core: {
              variants: [
                {
                  key: part.key,
                  kind: "template",
                  text: part.text.replace(
                    /\{(\w+)\}/g,
                    (_a, s: string) => `{{${s.replace(/_/g, "-")}}}`,
                  ),
                },
              ],
            },
          },
        },
      );
      if (line.kind !== "rendered") continue;
      items.push({
        id: `${seed}:${person.id}:${part.key}`,
        axis: `sounds like a ${role} in a local interview`,
        situation: `A local reporter interviews ${facts.name!.text} in ${placeName}.`,
        prior: "",
        reply: `${role === "reporter" ? "Reporter" : facts.name!.text.split(" ")[0]}: ${line.text}`,
        part: part.key,
        parts: [part.key],
        composer:
          "composeGroundedLine, words from data/english/parts/interview.json",
        kind: "press",
        cell: cell("press", role, placeName),
        seed,
      });
    }
    // Headlines whose facts the records hold: a closure, a remembrance.
    const headlineFacts: Facts = {
      ...facts,
      ...(org
        ? { subject: { text: properName(org.name), sourceRecordIds: [org.id] } }
        : {}),
    };
    for (const part of HEADLINES) {
      const kind = part.uses[0]!.role;
      // Only a business closes in a headline here; a remembrance needs a
      // death record, which these living residents don't have.
      if (kind !== "organization.closed") continue;
      if (
        !org ||
        /\b(?:County|City|Town|Village|State|School|District)\b/.test(org.name)
      )
        continue;
      const line = composeGroundedLine(
        {
          ...packet(
            seed,
            `${seed}:${person.id}:${part.key}`,
            headlineFacts,
            "adult",
            "words-headlines-v1",
          ),
          // Written once when the story is recorded, then shown verbatim on
          // the news surface, so it is composed here as menu text.
          surface: "menu",
          speaker: undefined,
          viewer: { personId: "speaker", traits: {} },
        } as unknown as GroundedEnglishPacket,
        {
          key: `headlines.${part.key}`,
          version: "words-headlines-v1",
          surface: "menu",
          act: "tell",
          parts: {
            core: {
              variants: [
                {
                  key: part.key,
                  kind: "template",
                  text: part.text.replace(
                    /\{(\w+)\}/g,
                    (_a, s: string) => `{{${s}}}`,
                  ),
                },
              ],
            },
          },
        },
      );
      if (line.kind !== "rendered") continue;
      items.push({
        id: `${seed}:${person.id}:${part.key}`,
        axis: "reads as a local news headline",
        situation: `A headline in ${placeName} about ${kind === "life.death" ? facts.name!.text : headlineFacts.subject?.text} (a stand-in event on a real record until the news engine writes headlines).`,
        prior: "",
        reply: `Headline: ${line.text}`,
        part: part.key,
        parts: [part.key],
        composer:
          "composeGroundedLine, words from data/english/parts/headlines.json",
        kind: "news",
        cell: cell("press", "headline", placeName),
        seed,
      });
    }
  }
}

const seen = new Set<string>();
const unique = items.filter((item) => {
  const key = `${item.prior}|${item.reply}`;
  if (seen.has(key) || !item.parts.length) return false;
  seen.add(key);
  return true;
});
const bySeed = seeds.map((seed) => unique.filter((item) => item.seed === seed));
const ordered: Item[] = [];
for (let at = 0; bySeed.some((rows) => at < rows.length); at += 1)
  for (const rows of bySeed) if (at < rows.length) ordered.push(rows[at]!);
const used = new Map<string, number>();
const chosen: Item[] = [];
for (let round = 0; chosen.length < size && round < 8; round += 1)
  for (const item of ordered) {
    if (chosen.length >= size || chosen.includes(item)) continue;
    if (item.parts.some((part) => (used.get(part) ?? 0) > round)) continue;
    chosen.push(item);
    for (const part of item.parts) used.set(part, (used.get(part) ?? 0) + 1);
  }
const kinds: Record<string, number> = {};
for (const item of chosen) kinds[item.kind] = (kinds[item.kind] ?? 0) + 1;
writeFileSync(
  `data/english/batches/${id}.json`,
  `${JSON.stringify(
    {
      id,
      title: `Mined speeches, interviews and headlines batch ${id} (${chosen.length} lines)`,
      at: new Date().toISOString(),
      head: execSync("git rev-parse HEAD").toString().trim(),
      status: "open",
      variety: {
        items: chosen.length,
        places: places.size,
        kinds,
        distinctSituationRelationship: new Set(
          chosen.map((item) => item.situation),
        ).size,
      },
      absent: [],
      items: chosen.map((item, i) => ({ i, ...item })),
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${chosen.length} lines from ${places.size} places; ${used.size} distinct parts`,
);
