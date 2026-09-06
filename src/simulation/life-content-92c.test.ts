import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import { projectStoryMoment } from "../presentation/life-story";
import { EPISODE_FAMILIES } from "./episode-bank";
import {
  LIFE_CONTENT_92C_FAMILIES,
  LIFE_CONTENT_92C_KERNELS,
  lifeContent92cOptions,
  lifeContent92cStages,
} from "./life-content-92c";
import { eligibleEpisodeBeats, type EpisodeRequirement } from "./life-episodes";

/**
 * The 92C wave, as claims rather than as a snapshot.
 *
 * Every test here is written against a property the authority asked for, not
 * against the copy: rewording a scene must not fail any of them, and removing
 * an age bound or routing an adult decision to a child must fail one
 * immediately. Where a claim is about the whole repository rather than about
 * this file — no runtime model call, the untouched ownership surfaces — the
 * test says so and checks the repository.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const PROSE_DIR = join(REPO_ROOT, "prose-review", "92c-wave-1");

function formativeWorld(age: number) {
  return createNewGameWorld({
    placeKey: "kentucky",
    startAge: age,
    startKind: "custom",
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "92c-age-proof",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
}

const EARLY_KERNEL_STAGE_KEYS = new Set([
  "cubby-space",
  "partner-pairing",
  "recess-race",
  "tattle-boundary",
  "it-was-still-there",
  "chore-resistance",
  "parent-exhaustion",
  "sibling-toy-snatch",
  "best-friend-pact",
]);

function offeredEarlyKernelStages(age: number): readonly string[] {
  const created = formativeWorld(age);
  return eligibleEpisodeBeats({
    world: created.world,
    personId: created.playerPersonId,
    families: EPISODE_FAMILIES,
  })
    .beats.map((beat) => beat.stageKey)
    .filter((stageKey) => EARLY_KERNEL_STAGE_KEYS.has(stageKey));
}

function requirementsOf(stage: {
  readonly requires: readonly EpisodeRequirement[];
}) {
  return stage.requires;
}

function ageFloor(requires: readonly EpisodeRequirement[]): number | null {
  const found = requires.find((r) => r.kind === "age-at-least");
  return found && found.kind === "age-at-least" ? found.age : null;
}

function ageCeiling(requires: readonly EpisodeRequirement[]): number | null {
  const found = requires.find((r) => r.kind === "age-below");
  return found && found.kind === "age-below" ? found.age : null;
}

/** The stages this wave authored for ages 5–7, by their own declared bounds. */
const EARLY_CHILD_STAGES = lifeContent92cStages().filter(({ stage }) => {
  const ceiling = ageCeiling(requirementsOf(stage));
  return ceiling !== null && ceiling <= 9;
});

/** The stages this wave authored for the adult transition and after. */
const ADULT_STAGES = lifeContent92cStages().filter(({ stage }) => {
  const floor = ageFloor(requirementsOf(stage));
  return floor !== null && floor >= 17;
});

/** All the words a stage puts in front of a player. */
function playerFacingText(stage: {
  readonly lines: readonly string[];
  readonly options: readonly {
    readonly label: string;
    readonly description: string;
    readonly memory: string;
  }[];
}): string {
  return [
    ...stage.lines,
    ...stage.options.flatMap((option) => [
      option.label,
      option.description,
      option.memory,
    ]),
  ].join(" ");
}

/* -------------------------------------------------------------------------- */
/* 1 & 3 — age-true, and not merely in-band                                    */
/* -------------------------------------------------------------------------- */

describe("the early-childhood stages are age-true rather than band-true", () => {
  it("enforces the five, seven and ten-year-old boundaries in live eligibility", () => {
    const atFive = offeredEarlyKernelStages(5);
    const atSeven = offeredEarlyKernelStages(7);
    const atTen = offeredEarlyKernelStages(10);

    expect(atFive).toContain("cubby-space");
    expect(atFive).toContain("chore-resistance");
    expect(atFive).not.toContain("partner-pairing");
    expect(atSeven).toContain("partner-pairing");
    expect(atSeven).toContain("parent-exhaustion");
    expect(atSeven).not.toContain("cubby-space");
    expect(atTen).toEqual([]);
  });

  it("gives every early stage an explicit age floor and ceiling", () => {
    expect(EARLY_CHILD_STAGES.length).toBeGreaterThanOrEqual(6);
    for (const { episodeKey, stage } of EARLY_CHILD_STAGES) {
      const floor = ageFloor(requirementsOf(stage));
      const ceiling = ageCeiling(requirementsOf(stage));
      expect(
        ceiling,
        `${episodeKey}/${stage.key} declares no age ceiling`,
      ).not.toBeNull();
      if (stage.key === "it-was-still-there") {
        // The one continuation in this group: its floor is the earlier stage
        // being on the record, which is a stronger gate than a birthday.
        expect(
          requirementsOf(stage).some((r) => r.kind === "after-stage"),
        ).toBe(true);
        continue;
      }
      expect(
        floor,
        `${episodeKey}/${stage.key} declares no age floor`,
      ).not.toBeNull();
      expect(floor).toBeGreaterThanOrEqual(5);
    }
  });

  it("offers no new early-child stage to both a five-year-old and a ten-year-old", () => {
    // The defect this wave was written against: a band from birth to eight and
    // a band from eight to thirteen, and content that could not tell the two
    // apart. A stage that admits both ages is that defect returning.
    for (const { episodeKey, stage } of EARLY_CHILD_STAGES) {
      const floor = ageFloor(requirementsOf(stage)) ?? 0;
      const ceiling =
        ageCeiling(requirementsOf(stage)) ?? Number.MAX_SAFE_INTEGER;
      const admitsFive = floor <= 5 && ceiling > 5;
      const admitsTen = floor <= 10 && ceiling > 10;
      expect(
        admitsFive && admitsTen,
        `${episodeKey}/${stage.key} is offered at five and at ten`,
      ).toBe(false);
    }
  });

  it("spreads the early stages across the band rather than stacking them on one age", () => {
    const floors = new Set(
      EARLY_CHILD_STAGES.map((entry) =>
        ageFloor(requirementsOf(entry.stage)),
      ).filter((age): age is number => age !== null),
    );
    // Five, six and seven are different children. If every stage started at
    // the same age the ladder would be decorative.
    expect(floors.size).toBeGreaterThanOrEqual(3);
  });
});

/* -------------------------------------------------------------------------- */
/* 2 — no adult decision is routed to a child                                  */
/* -------------------------------------------------------------------------- */

describe("no forbidden adult decision reaches a child", () => {
  it("writes every early stage for somebody who does not answer for the household", () => {
    for (const { episodeKey, stage } of EARLY_CHILD_STAGES) {
      const guarded = requirementsOf(stage).some(
        (r) =>
          r.kind === "without-capability" &&
          r.capability === "answers-for-themselves",
      );
      expect(
        guarded,
        `${episodeKey}/${stage.key} does not require that somebody else answers for this character`,
      ).toBe(true);
    }
  });

  it("never gives a child an option that decides an adult matter", () => {
    // 92C's forbidden-agency list, as the words that would have to appear for
    // one of those decisions to have been handed over. This is a smoke alarm,
    // not a proof: it catches the failure that actually happened in play.
    const forbidden = [
      "rent",
      "lease",
      "mortgage",
      "evict",
      "landlord",
      "bill",
      "budget",
      "afford",
      "wages",
      "salary",
      "debt",
      "loan",
      "bank",
      "custody",
      "divorce",
      "lawyer",
      "doctor",
      "hospital",
      "prescription",
      "medication",
      "insurance",
      "enrol",
      "enroll",
      "district",
      "transfer schools",
      "quit",
      "fired",
      "hire",
      "shift",
      "landlord",
      "inflation",
      "interest rate",
      "zoning",
      "vote",
      "campaign",
      "petition",
    ];
    for (const { episodeKey, stage } of EARLY_CHILD_STAGES) {
      const text = playerFacingText(stage).toLowerCase();
      for (const word of forbidden) {
        // Whole words only. "rent" inside "a different partner" is not a
        // lease, and a checker that says it is trains people to ignore it.
        const pattern = new RegExp(
          `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        );
        expect(
          pattern.test(text),
          `${episodeKey}/${stage.key} puts adult matter "${word}" in front of a child`,
        ).toBe(false);
      }
    }
  });

  it("keeps a scene about a much younger child bound to one who is actually younger", () => {
    const snatch = lifeContent92cStages().find(
      ({ stage }) => stage.key === "sibling-toy-snatch",
    );
    expect(snatch).toBeDefined();
    const bound = requirementsOf(snatch!.stage).find(
      (r) => r.kind === "role-age-below",
    );
    // Without this the part is filled by whichever household peer the world
    // lists first, and a teenager gets cast as a toddler.
    expect(bound).toBeDefined();
    expect(bound && bound.kind === "role-age-below" ? bound.role : null).toBe(
      "household-peer",
    );

    const created = formativeWorld(5);
    const offered = eligibleEpisodeBeats({
      world: created.world,
      personId: created.playerPersonId,
      families: EPISODE_FAMILIES,
    }).beats.find((beat) => beat.stageKey === "sibling-toy-snatch");
    expect(offered).toBeDefined();
    expect(
      offered?.bindings.find((binding) => binding.role === "household-peer")
        ?.age,
    ).toBeLessThan(5);
  });
});

/* -------------------------------------------------------------------------- */
/* 4 — the adult end is not a four-year college                                */
/* -------------------------------------------------------------------------- */

describe("the adult transition does not default to four-year college", () => {
  it("authors adult stages on more than one pathway", () => {
    expect(ADULT_STAGES.length).toBeGreaterThanOrEqual(6);
    const gateKinds = ADULT_STAGES.map(({ stage }) => {
      const requires = requirementsOf(stage);
      const work = requires.some(
        (r) => r.kind === "capability" && r.capability === "paid-work",
      );
      const school = requires.some(
        (r) => r.kind === "capability" && r.capability === "in-school",
      );
      if (work && school) return "work-and-school";
      if (work) return "work-only";
      if (school) return "school-only";
      return "neither";
    });
    // Working while studying, working without studying, studying without a
    // job, and a life doing neither of those must all reach something here.
    expect(new Set(gateKinds).size).toBeGreaterThanOrEqual(3);
    expect(gateKinds).toContain("work-and-school");
    expect(gateKinds).toContain("work-only");
    expect(gateKinds).toContain("neither");
  });

  it("never names a residential four-year college in adult copy", () => {
    const collegeOnly = [
      "campus",
      "dorm",
      "dormitory",
      "university",
      "freshman",
      "sophomore",
      "semester",
      "fraternity",
      "sorority",
      "lecture hall",
      "degree",
      "major in",
    ];
    for (const { episodeKey, stage } of ADULT_STAGES) {
      const text = playerFacingText(stage).toLowerCase();
      for (const word of collegeOnly) {
        const pattern = new RegExp(
          `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        );
        expect(
          pattern.test(text),
          `${episodeKey}/${stage.key} presumes a four-year college with "${word}"`,
        ).toBe(false);
      }
    }
  });

  it("gates education stages on an enrollment and nothing about its kind", () => {
    // The structural half of the same claim: a community-college enrollment,
    // a certificate and an apprenticeship's classroom day produce the same
    // record, so all three reach these stages identically.
    for (const { stage } of ADULT_STAGES) {
      for (const requirement of requirementsOf(stage)) {
        expect(requirement.kind).not.toBe("fact-education-program");
      }
    }
    const schoolGated = ADULT_STAGES.filter(({ stage }) =>
      requirementsOf(stage).some(
        (r) => r.kind === "capability" && r.capability === "in-school",
      ),
    );
    expect(schoolGated.length).toBeGreaterThanOrEqual(2);
  });
});

/* -------------------------------------------------------------------------- */
/* 5 & 9 — missing truth means no offer, not invented truth                    */
/* -------------------------------------------------------------------------- */

describe("a stage that needs somebody says so, and is withheld without them", () => {
  it("withholds live school and guardian scenes when their records are absent", () => {
    const created = formativeWorld(5);
    const withoutSources = {
      ...created.world,
      history: {
        ...created.world.history,
        childAuthorities: [],
        educationEnrollments: [],
      },
    };
    const eligibility = eligibleEpisodeBeats({
      world: withoutSources,
      personId: created.playerPersonId,
      families: EPISODE_FAMILIES,
    });

    expect(
      eligibility.beats.some((beat) => beat.stageKey === "cubby-space"),
    ).toBe(false);
    expect(
      eligibility.beats.some((beat) => beat.stageKey === "chore-resistance"),
    ).toBe(false);
    expect(
      eligibility.exclusions.some(
        (entry) =>
          entry.episodeKey === "school.the-thing-you-got-blamed-for" &&
          entry.stageKey === "*" &&
          entry.requirement.kind === "absent" &&
          entry.requirement.fact === "school.enrolled",
      ),
    ).toBe(true);
    expect(
      eligibility.exclusions.some(
        (entry) =>
          entry.stageKey === "chore-resistance" &&
          entry.requirement.kind === "role" &&
          entry.requirement.role === "guardian",
      ),
    ).toBe(true);
  });

  it("declares a role requirement for every role its copy names", () => {
    const roleToken =
      /\{(?:role|who|they|them|their|theirs|themselves|s|es|is|has|was|does):([a-z-]+)\}/g;
    for (const { episodeKey, stage } of lifeContent92cStages()) {
      const named = new Set<string>();
      for (const match of playerFacingText(stage).matchAll(roleToken)) {
        named.add(match[1]!);
      }
      const required = new Set<string>(
        requirementsOf(stage).flatMap<string>((r) =>
          r.kind === "role" ||
          r.kind === "role-age-at-least" ||
          r.kind === "role-age-below"
            ? [r.role]
            : [],
        ),
      );
      for (const role of named) {
        expect(
          required.has(role),
          `${episodeKey}/${stage.key} names {role:${role}} without requiring it, so it could be composed with nobody in the part`,
        ).toBe(true);
      }
    }
  });

  it("names no person, place or organisation of its own", () => {
    // Everything a player sees is either a slot the world fills or a common
    // noun. A capital mid-sentence — not after a full stop and not opening a
    // line — is a name somebody typed here, which is exactly the
    // unintroduced-entity failure 92C names. Sentence-initial capitals and
    // the pronoun "I" are excluded because they carry no such claim.
    for (const { episodeKey, stage } of lifeContent92cStages()) {
      const parts = [
        ...stage.lines,
        ...stage.options.flatMap((option) => [
          option.label,
          option.description,
          option.memory,
        ]),
      ];
      for (const part of parts) {
        const text = part.replace(/\{[^}]*\}/g, " ");
        for (const match of text.matchAll(/(^|[^.!?]\s+)([A-Z][a-z]+)/g)) {
          const leading = match[1] ?? "";
          if (leading === "") continue;
          expect(
            false,
            `${episodeKey}/${stage.key} names "${match[2]}", which no record supplied: ${part}`,
          ).toBe(true);
        }
      }
    }
  });

  it("cannot fire a long-tail callback without its canonical prerequisite", () => {
    const callback = lifeContent92cStages().find(
      ({ stage }) => stage.key === "across-the-checkout",
    );
    expect(callback).toBeDefined();
    const requires = requirementsOf(callback!.stage);
    const after = requires.find((r) => r.kind === "after-choice");
    const since = requires.find((r) => r.kind === "days-since-stage");
    // The reunion is about a person the player named as a child. It needs the
    // naming on the record and the years on the clock, and because an instance
    // is keyed by who is bound to it, it is that person or nobody.
    expect(after && after.kind === "after-choice" ? after.stage : null).toBe(
      "best-friend-pact",
    );
    expect(after && after.kind === "after-choice" ? after.option : null).toBe(
      "say-yes",
    );
    expect(
      since && since.kind === "days-since-stage" ? since.days : 0,
    ).toBeGreaterThanOrEqual(2920);
    expect(
      requires.some((r) => r.kind === "role" && r.role === "familiar"),
    ).toBe(true);
  });

  it("requires an actual earlier answer for every continuation that claims one", () => {
    for (const { episodeKey, stage } of lifeContent92cStages()) {
      const claimsEarlier = requirementsOf(stage).some(
        (r) =>
          r.kind === "after-choice" ||
          r.kind === "after-stage" ||
          r.kind === "days-since-stage",
      );
      if (!claimsEarlier) continue;
      const named = requirementsOf(stage).flatMap((r) =>
        r.kind === "after-choice" ||
        r.kind === "after-stage" ||
        r.kind === "without-stage" ||
        r.kind === "days-since-stage"
          ? [r.stage]
          : [],
      );
      const family = EPISODE_FAMILIES.find(
        (candidate) => candidate.key === episodeKey,
      );
      for (const target of named) {
        expect(
          family?.stages.some((candidate) => candidate.key === target),
          `${episodeKey}/${stage.key} points at "${target}", which its own family does not contain`,
        ).toBe(true);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 6 — a choice writes only what already exists                                */
/* -------------------------------------------------------------------------- */

describe("a chosen option mutates only canonical systems that already exist", () => {
  it("writes nothing beyond the two kinds the episode machinery already had", () => {
    for (const { episodeKey, stageKey, option } of lifeContent92cOptions()) {
      if (!option.writes) continue;
      expect(
        ["take-on-commitment", "join-community-organization"],
        `${episodeKey}/${stageKey}/${option.key} writes an unknown kind`,
      ).toContain(option.writes.kind);
    }
  });

  it("keeps every commitment inside the accepted commitment namespaces", () => {
    const namespaces = [
      "civic",
      "community",
      "personal",
      "religious",
      "custom",
    ];
    for (const { option } of lifeContent92cOptions()) {
      if (option.writes?.kind !== "take-on-commitment") continue;
      expect(namespaces).toContain(option.writes.commitmentKind.split(":")[0]);
      const [low, high] = option.writes.weeklyHours;
      expect(low).toBeGreaterThan(0);
      expect(high).toBeGreaterThanOrEqual(low);
    }
  });

  it("lets no child option write anything at all", () => {
    for (const { episodeKey, stage } of EARLY_CHILD_STAGES) {
      for (const option of stage.options) {
        expect(
          option.writes ?? null,
          `${episodeKey}/${stage.key}/${option.key} has a child taking on a commitment`,
        ).toBeNull();
      }
    }
  });

  it("leaves most options with nothing to come back", () => {
    const options = lifeContent92cOptions();
    const quiet = options.filter(({ option }) => option.aftermath === null);
    // The same floor the existing bank keeps: a wave where every choice comes
    // back has promised the player a payoff for each one.
    expect(quiet.length / options.length).toBeGreaterThan(0.5);
  });
});

/* -------------------------------------------------------------------------- */
/* 8 — variation from context, not from synonyms                               */
/* -------------------------------------------------------------------------- */

describe("variation comes from context rather than from reworded cards", () => {
  it("selects deterministically from the same world and seed", () => {
    const created = formativeWorld(7);
    const first = projectStoryMoment(created.world, created.playerPersonId);
    const second = projectStoryMoment(created.world, created.playerPersonId);
    expect(second).toEqual(first);
  });

  it("changes the eligible set when the canonical age context changes", () => {
    expect(offeredEarlyKernelStages(5)).not.toEqual(
      offeredEarlyKernelStages(7),
    );
  });

  it("makes no two stages interchangeable", () => {
    // Two scenes may legitimately share a gate — being six and at school is
    // the condition for more than one thing that happens to a six-year-old.
    // What must never happen is two stages that share a gate AND offer the
    // same answers, because then whichever one the selector picked, the other
    // was never a different situation.
    const seen = new Map<string, string>();
    for (const { episodeKey, stage } of lifeContent92cStages()) {
      const shape = [
        requirementsOf(stage)
          .map((r) => JSON.stringify(r))
          .sort()
          .join("|"),
        stage.options
          .map((option) => option.key)
          .sort()
          .join(","),
      ].join("::");
      const clash = seen.get(shape);
      expect(
        clash,
        `${episodeKey}/${stage.key} is interchangeable with ${clash}`,
      ).toBeUndefined();
      seen.set(shape, `${episodeKey}/${stage.key}`);
    }
  });

  it("draws on a real spread of gates rather than one shape repeated", () => {
    const shapes = new Set(
      lifeContent92cStages().map(({ stage }) =>
        requirementsOf(stage)
          .map((r) => JSON.stringify(r))
          .sort()
          .join("|"),
      ),
    );
    expect(shapes.size).toBeGreaterThanOrEqual(12);
  });

  it("gives each stage distinct opening lines", () => {
    const lines = lifeContent92cStages().map(({ stage }) =>
      stage.lines.join(" "),
    );
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("keeps every stage and option key unique inside its family", () => {
    for (const family of LIFE_CONTENT_92C_FAMILIES) {
      const stageKeys = family.stages.map((stage) => stage.key);
      expect(new Set(stageKeys).size).toBe(stageKeys.length);
      for (const stage of family.stages) {
        const optionKeys = stage.options.map((option) => option.key);
        expect(new Set(optionKeys).size).toBe(optionKeys.length);
      }
    }
  });

  it("registers every wave family in the one bank everything downstream reads", () => {
    for (const family of LIFE_CONTENT_92C_FAMILIES) {
      expect(
        EPISODE_FAMILIES.some((candidate) => candidate.key === family.key),
        `${family.key} is authored but not in EPISODE_FAMILIES`,
      ).toBe(true);
    }
    const keys = EPISODE_FAMILIES.map((family) => family.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/* -------------------------------------------------------------------------- */
/* 10 — the prose has a stored packet and review trail                         */
/* -------------------------------------------------------------------------- */

describe("every committed line has a fact packet and a grounding verdict behind it", () => {
  const files = readdirSync(PROSE_DIR);
  const stems = [
    ...new Set(
      files
        .filter((name) => name.endsWith(".packet.md"))
        .map((name) => name.replace(/\.packet\.md$/, "")),
    ),
  ].sort();

  it("stores a packet, an accepted output and a reviewer verdict for each scene", () => {
    expect(stems.length).toBe(20);
    for (const stem of stems) {
      expect(files, `${stem} has no output`).toContain(`${stem}.output.md`);
      expect(files, `${stem} has no review`).toContain(`${stem}.review.txt`);
    }
  });

  it("holds an unambiguous PASS verdict for each scene", () => {
    for (const stem of stems) {
      const verdict = readFileSync(
        join(PROSE_DIR, `${stem}.review.txt`),
        "utf8",
      ).trim();
      // Read the way `prose:eval verify-review` reads it: fail-closed, so
      // anything that is not exactly a pass is not a pass.
      expect(verdict, `${stem} verdict is not a clean pass`).toBe(
        "GROUNDING: PASS",
      );
    }
  });

  it("accepted only renderable result classes", () => {
    for (const stem of stems) {
      const output = readFileSync(join(PROSE_DIR, `${stem}.output.md`), "utf8");
      const result = output.match(/^result:\s*(\S+)/m)?.[1];
      expect(
        ["SAFE_RENDER", "SAFE_RENDER_WITH_OMISSION"],
        `${stem} was committed as ${result ?? "an unreadable class"}`,
      ).toContain(result);
    }
  });

  it("traces every authored line back to the accepted output it came from", () => {
    // The claim that matters: nothing in the bank is prose somebody typed
    // straight into the source file. Each rendered sentence has to appear in
    // the reviewed output that produced it.
    for (const { episodeKey, stage } of lifeContent92cStages()) {
      const outputName = files.find((name) =>
        name.endsWith(`-${stage.key}.output.md`),
      );
      expect(
        outputName,
        `${episodeKey}/${stage.key} has no stage-specific reviewed output`,
      ).toBeDefined();
      const corpus = readFileSync(join(PROSE_DIR, outputName!), "utf8")
        .replace(/\s+/g, " ")
        .toLowerCase();
      for (const line of stage.lines) {
        expect(
          corpus.includes(line.replace(/\s+/g, " ").toLowerCase()),
          `${episodeKey}/${stage.key} carries a line with no reviewed source: ${line}`,
        ).toBe(true);
      }
      for (const option of stage.options) {
        for (const [field, text] of [
          ["label", option.label],
          ["description", option.description],
          ["memory", option.memory],
        ] as const) {
          expect(
            corpus.includes(
              text
                .replace(/\s+/g, " ")
                .replace(/[.!?]+$/, "")
                .toLowerCase(),
            ),
            `${episodeKey}/${stage.key}/${option.key} carries a ${field} with no reviewed source`,
          ).toBe(true);
        }
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 11 — nothing calls a model at runtime                                       */
/* -------------------------------------------------------------------------- */

describe("shipped play never depends on generating prose", () => {
  it("keeps every model call out of src/", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        // Test files do not ship, and this one necessarily contains the
        // very strings it is looking for.
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (/\.test\.tsx?$/.test(entry.name)) continue;
        const text = readFileSync(path, "utf8");
        if (
          /@anthropic-ai\/|api\.anthropic\.com|claude-(opus|sonnet|haiku|fable)|openai|generateText\(/i.test(
            text,
          )
        ) {
          offenders.push(path);
        }
      }
    };
    walk(join(REPO_ROOT, "src"));
    expect(offenders).toEqual([]);
  });

  it("declares the prose pipeline as development-time only", () => {
    // The Skill says so in words; this pins that the shipped tree has no
    // dependency that could make it false.
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf8"),
    ) as { readonly dependencies?: Readonly<Record<string, string>> };
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      expect(name).not.toMatch(/anthropic|openai|langchain/i);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Kernel coverage and provenance                                              */
/* -------------------------------------------------------------------------- */

describe("the wave says which 92C kernels it implemented", () => {
  it("maps every authored stage to a kernel", () => {
    const authored = lifeContent92cStages().map(
      ({ episodeKey, stage }) => `${episodeKey}/${stage.key}`,
    );
    const mapped = LIFE_CONTENT_92C_KERNELS.map(
      (entry) => `${entry.episodeKey}/${entry.stageKey}`,
    );
    expect([...mapped].sort()).toEqual([...authored].sort());
  });

  it("implements sixteen kernels, split across both weak ends", () => {
    const kernels = LIFE_CONTENT_92C_KERNELS.filter((entry) => entry.isKernel);
    expect(new Set(kernels.map((entry) => entry.kernelId)).size).toBe(16);
    // The authority's floor: at least six age-true 5–7, and at least six from
    // the adult transition or ordinary-social end.
    const early = kernels.filter((entry) =>
      entry.kernelId.startsWith("early."),
    );
    const later = kernels.filter(
      (entry) => !entry.kernelId.startsWith("early."),
    );
    expect(early.length).toBeGreaterThanOrEqual(6);
    expect(later.length).toBeGreaterThanOrEqual(6);
  });

  it("cites the research packet on every wave family", () => {
    for (const family of LIFE_CONTENT_92C_FAMILIES) {
      expect(family.authority.sourceDocument).toContain("92C");
      expect(family.authority.reference.length).toBeGreaterThan(0);
    }
  });
});
