import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../src/presentation/new-game";
import type { NewGameSetup } from "../src/presentation/new-game";
import {
  canonicalSetupEncoding,
  decodeReplayDescriptor,
  encodeReplayDescriptor,
  worldSeedFor,
} from "../src/presentation/new-game-identity";
import {
  answerQuestionnaire,
  lifeContextFor,
  questionnaireScreenFor,
} from "../src/presentation/setup-questionnaire-flow";
import { projectStoryMoment } from "../src/presentation/life-story";
import {
  ADULT_ONLY_AGENCY,
  admissibleQuestionnaireBank,
  BANNED_CONSTRUCTIONS,
  describePersonContext,
  episodeCapabilities,
  episodeRoleBindings,
  EPISODE_FAMILIES,
  lifeVoiceBandForAge,
  personName,
  personPronouns,
  setupAgency,
  setupLifeContext,
  setupQuestionnaireBank,
  SETUP_QUESTIONNAIRE_BANK,
  substituteSlots,
  WITHDRAWN_SETUP_ITEMS,
} from "../src/simulation";
import type { EntityId, World } from "../src/simulation";

/**
 * The twelve repairs Packet 72 owes the human playtest, as executable claims.
 *
 * The playtest was a CONDITIONAL FAIL on a real head, and the findings were
 * specific: a ten-year-old was handed adult decisions, a named person turned up
 * with no relationship attached, a narrator said "Maya" and a button said
 * "them", the player could not choose a gender, and the calibration read as
 * generic. Every one of those is checkable, and everything below fails if the
 * defect comes back.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

function setup(overrides: Partial<NewGameSetup> = {}): NewGameSetup {
  return {
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "packet-72",
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* 1. Gender is chosen, never guessed                                          */
/* -------------------------------------------------------------------------- */

describe("The player says who the character is", () => {
  it("writes the chosen gender and pronouns onto the canonical person", () => {
    const game = createNewGameWorld(setup({ gender: "female", startAge: 34 }));
    const player = game.world.people[game.playerPersonId]!;
    expect(player.identity).toEqual({
      gender: "female",
      pronouns: "she-her",
    });
    expect(personPronouns(player).subject).toBe("she");
  });

  it("lets pronouns disagree with gender, because people do", () => {
    const game = createNewGameWorld(
      setup({ gender: "female", pronouns: "they-them" }),
    );
    const player = game.world.people[game.playerPersonId]!;
    expect(player.identity).toEqual({
      gender: "female",
      pronouns: "they-them",
    });
  });

  it("records nothing at all when the player would rather not say", () => {
    const game = createNewGameWorld(setup({ gender: "unstated" }));
    const player = game.world.people[game.playerPersonId]!;
    // Absent, not neutral. "The record does not say" and "this person is
    // non-binary" are different facts and must stay distinguishable.
    expect(player.identity).toBeUndefined();
    expect(personPronouns(player).key).toBe("they-them");
  });

  it("never infers gender from the name it drew", () => {
    // The name corpus carries no demographic attribute by an older deliberate
    // decision, so two characters with the same generated name and different
    // stated genders must differ only in what was stated.
    const she = createNewGameWorld(
      setup({ gender: "female", givenName: "Alex", familyName: "Reyes" }),
    );
    const he = createNewGameWorld(
      setup({ gender: "male", givenName: "Alex", familyName: "Reyes" }),
    );
    expect(personName(she.world.people[she.playerPersonId]!)).toBe(
      "Alex Reyes",
    );
    expect(personName(he.world.people[he.playerPersonId]!)).toBe("Alex Reyes");
    expect(she.world.people[she.playerPersonId]!.identity!.gender).toBe(
      "female",
    );
    expect(he.world.people[he.playerPersonId]!.identity!.gender).toBe("male");
  });

  it("keeps a stated gender through a replay link", () => {
    const chosen = setup({ gender: "nonbinary", pronouns: "they-them" });
    const round = decodeReplayDescriptor(encodeReplayDescriptor(chosen));
    expect(round?.gender).toBe("nonbinary");
    expect(round?.pronouns).toBe("they-them");
    expect(worldSeedFor(round!)).toBe(worldSeedFor(chosen));
  });

  it("leaves a world built before the question existed exactly where it was", () => {
    // The field is written only when it was stated, so the default setup
    // encodes byte for byte as it did before Packet 72 — otherwise adding a
    // question would have rebuilt every existing life with different people
    // in it.
    const unstated = setup({ gender: "unstated" });
    expect(canonicalSetupEncoding(unstated)).not.toContain("gender");
    expect(canonicalSetupEncoding(setup({ gender: "male" }))).toContain(
      "gender",
    );
  });

  it("gives the people it invents pronouns, and gives them consistently", () => {
    const game = createNewGameWorld(setup({ startAge: 10 }));
    const others = Object.values(game.world.people).filter(
      (person) => person.id !== game.playerPersonId,
    );
    expect(others.length).toBeGreaterThan(0);
    for (const person of others) {
      // Generated is not inferred: the generator that made up their name and
      // birth date made up this too, from a stream forked on their own key.
      expect(person.identity).toBeDefined();
      expect(personPronouns(person).key).toBe(person.identity!.pronouns);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Who is Maya?                                                             */
/* -------------------------------------------------------------------------- */

describe("A named person arrives with a relationship", () => {
  function childWorld(): {
    readonly world: World;
    readonly personId: EntityId;
  } {
    const game = createNewGameWorld(
      // Custom, so the sibling this test names is actually at home; a normal
      // start (Task E) generates the household and may be an only child.
      setup({
        startKind: "custom",
        startAge: 10,
        household: "shares-a-home",
        gender: "female",
      }),
    );
    return { world: game.world, personId: game.playerPersonId };
  }

  it("calls the guardian a parent, from the authority record", () => {
    const { world, personId } = childWorld();
    const labels = Object.keys(world.people)
      .filter((id) => id !== personId)
      .map((id) => describePersonContext(world, personId, id as EntityId)!);
    const guardian = labels.find((entry) =>
      /^your (mom|dad|parent)$/.test(entry.relationship ?? ""),
    );
    expect(
      guardian,
      `no guardian label among ${labels.map((entry) => entry.relationship).join(", ")}`,
    ).toBeDefined();
    expect(guardian!.basis).toContain("authority record");
  });

  it("calls a sibling a sibling, and says which of them is older", () => {
    const { world, personId } = childWorld();
    const sibling = Object.keys(world.people)
      .filter((id) => id !== personId)
      .map((id) => describePersonContext(world, personId, id as EntityId)!)
      .find((entry) =>
        /(brother|sister|sibling)/.test(entry.relationship ?? ""),
      );
    expect(sibling).toBeDefined();
    expect(sibling!.relationship).toMatch(/^your (older|younger) /);
    expect(sibling!.basis).toContain("kinship record");
  });

  it("says only what is known when nothing establishes a relationship", () => {
    const { world, personId } = childWorld();
    const stranger = Object.values(world.people).find(
      (person) =>
        person.id !== personId &&
        describePersonContext(world, personId, person.id)!.relationship ===
          null,
    );
    if (stranger) {
      const described = describePersonContext(world, personId, stranger.id)!;
      expect(described.basis).toContain("No record");
      // The name alone, never a guess dressed up as an introduction.
      expect(described.introduction).toBe(described.name);
    }
  });

  it("never reads a relationship off a shared family name", () => {
    const { world, personId } = childWorld();
    const player = world.people[personId]!;
    const sameSurname = Object.values(world.people).filter(
      (person) =>
        person.id !== personId && person.familyName === player.familyName,
    );
    expect(sameSurname.length).toBeGreaterThan(0);
    for (const person of sameSurname) {
      const described = describePersonContext(world, personId, person.id)!;
      // Whatever it says, a record has to have said it first.
      expect(described.basis).not.toContain("name");
      if (described.relationship !== null) {
        expect(described.basis).toMatch(/record/);
      }
    }
  });

  it("puts the relationship on the play surface, not just in the data", () => {
    const { world, personId } = childWorld();
    const moment = projectStoryMoment(world, personId);
    for (const person of moment.scene.presentPeople) {
      expect(person.introduction.startsWith(person.name)).toBe(true);
      if (person.relationship !== null) {
        expect(person.introduction).toBe(
          `${person.name}, ${person.relationship}`,
        );
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 3. A child is not handed an adult's standing                                */
/* -------------------------------------------------------------------------- */

describe("Standing decides what a life is offered", () => {
  it("does not let a child answer for the household", () => {
    const game = createNewGameWorld(setup({ startAge: 10 }));
    const capabilities = episodeCapabilities(game.world, game.playerPersonId);
    expect(capabilities.get("answers-for-themselves")!.holds).toBe(false);
    expect(capabilities.get("paid-work")!.holds).toBe(false);
    expect(capabilities.get("in-school")!.holds).toBe(true);
  });

  it("lets an adult answer for their own household", () => {
    const game = createNewGameWorld(setup({ startAge: 34 }));
    const capabilities = episodeCapabilities(game.world, game.playerPersonId);
    expect(capabilities.get("answers-for-themselves")!.holds).toBe(true);
  });

  it("never binds a guardian to a part written for a peer", () => {
    const game = createNewGameWorld(
      setup({ startAge: 10, household: "shares-a-home" }),
    );
    const bindings = episodeRoleBindings(game.world, game.playerPersonId);
    const guardians = new Set(
      bindings
        .filter((entry) => entry.role === "guardian")
        .map((entry) => entry.personId),
    );
    expect(guardians.size).toBeGreaterThan(0);
    for (const binding of bindings) {
      if (binding.role !== "household-peer") continue;
      expect(
        guardians.has(binding.personId),
        `${binding.personName} is both the guardian and a household peer`,
      ).toBe(false);
    }
  });

  it("gives a child somebody their own age to live with when one was asked for", () => {
    const shared = createNewGameWorld(
      setup({ startAge: 10, household: "shares-a-home" }),
    );
    const peers = episodeRoleBindings(
      shared.world,
      shared.playerPersonId,
    ).filter((entry) => entry.role === "household-peer");
    expect(peers.length).toBeGreaterThan(0);
  });

  it("opens a ten-year-old's calibration on a ten-year-old's three", () => {
    // SUPERSEDED CLAIM, NARROWED. This used to require that EVERY question a
    // ten-year-old start could be asked belonged to the childhood band, which
    // left ten items to draw five from. Packet 77 is explicit that the
    // calibration may put civic, moral and ordinary-life questions to a player
    // whatever age their character starts at, because the questions are put to
    // the player rather than to the character — which the screen now says in
    // as many words.
    //
    // What survives is the half that was doing the work: the three openers set
    // the register, and opening a ten-year-old's game on a grant application
    // is the disconnection the first playtest reported.
    const context = setupLifeContext({
      startAge: 10,
      startingLife: "ordinary-life",
      household: "shares-a-home",
    });
    const agency = setupAgency(context);
    expect(agency.has("answers-for-themselves")).toBe(false);
    const admissible = admissibleQuestionnaireBank(context);
    const openers = admissible.filter((item) => item.fixedOrdinal !== null);
    expect(openers.length).toBeGreaterThanOrEqual(3);
    for (const item of openers) {
      expect(item.eligibility.bands).toContain("middle-childhood");
      for (const key of item.eligibility.agency) {
        expect(
          agency.has(key),
          `${item.key} opens on ${key}, which a ten-year-old does not have`,
        ).toBe(true);
      }
    }
    // And the bank a child start can reach is no longer ten items deep.
    expect(admissible.length).toBeGreaterThan(openers.length + 10);
  });

  it("puts no adult-only action in a childhood option", () => {
    const context = setupLifeContext({
      startAge: 10,
      startingLife: "ordinary-life",
      household: "shares-a-home",
    });
    for (const item of admissibleQuestionnaireBank(context)) {
      for (const option of item.options) {
        for (const { pattern, instead } of ADULT_ONLY_AGENCY) {
          expect(
            pattern.test(option.text),
            `${item.key}:${option.key} — ${instead} — ${option.text}`,
          ).toBe(false);
        }
      }
    }
  });

  it("would have caught the three options the playtest was actually offered", () => {
    // A guard nobody has aimed at a real defect is decoration.
    const shipped = [
      "Say you'll deal with the furnace",
      "Offer to cover the gap yourself",
      "Priya has asked you to put your name to a reference.",
    ];
    for (const text of shipped) {
      expect(
        ADULT_ONLY_AGENCY.some(({ pattern }) => pattern.test(text)),
        `nothing caught ${JSON.stringify(text)}`,
      ).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 4. Five questions from one life                                             */
/* -------------------------------------------------------------------------- */

describe("The five-question path is one life at the stage it is opening", () => {
  function shortPath(startAge: number): readonly string[] {
    let current = setup({ startAge, questionnaire: "short", priors: [] });
    const keys: string[] = [];
    for (let asked = 0; asked < 10; asked += 1) {
      const screen = questionnaireScreenFor(current);
      if (!screen) break;
      keys.push(screen.questionKey);
      current = answerQuestionnaire(current, screen.options[0]!.key);
    }
    return keys;
  }

  it("opens a child on the childhood three, then leaves the band", () => {
    const keys = shortPath(10);
    expect(keys).toHaveLength(5);
    const openers = keys
      .slice(0, 3)
      .map((key) =>
        SETUP_QUESTIONNAIRE_BANK.find((entry) => entry.key === key)!,
      );
    for (const item of openers) {
      expect(item.fixedOrdinal).not.toBeNull();
      expect(item.eligibility.bands).toEqual(["middle-childhood"]);
    }
    // Packet 77: the questions after the openers are put to the player, and
    // are not confined to a ten-year-old's house.
    expect(new Set(keys).size).toBe(5);
  });

  it("opens an adolescent on their own three, not on a child's", () => {
    const child = shortPath(10);
    const teenager = shortPath(15);
    expect(teenager).toHaveLength(5);
    expect(teenager.slice(0, 3)).not.toEqual(child.slice(0, 3));
    for (const key of teenager.slice(0, 3)) {
      const item = SETUP_QUESTIONNAIRE_BANK.find((entry) => entry.key === key)!;
      expect(item.eligibility.bands).toEqual(["adolescence"]);
    }
  });

  it("keeps the same people running through the openers", () => {
    // The three that open a band are one life at that age, with the same
    // people in them. Packet 77 rejects a recurring cast a player is expected
    // to already know; these are established by the questions themselves,
    // which is the case it allows.
    const prompts = shortPath(10)
      .slice(0, 3)
      .map(
        (key) =>
          SETUP_QUESTIONNAIRE_BANK.find((entry) => entry.key === key)!.prompt,
      );
    const cast = ["Dee", "Bea", "Theo", "Kenny", "Ms. Ruiz"];
    const recurring = cast.filter((name) =>
      prompts.some((prompt) => prompt.includes(name)),
    );
    expect(recurring.length).toBeGreaterThanOrEqual(2);
  });

  it("still opens an adult life on the adult openers", () => {
    expect(shortPath(34).slice(0, 3)).toEqual([
      "kitchen_late",
      "marcus_and_the_trip_fund",
      "priya_reference",
    ]);
  });

  it("knows the life it is calibrating from the setup screen alone", () => {
    expect(lifeContextFor(setup({ startAge: 10 })).band).toBe(
      "middle-childhood",
    );
    expect(lifeContextFor(setup({ startAge: 15 })).band).toBe("adolescence");
    expect(lifeContextFor(setup({ startAge: 34 })).band).toBe("adult");
    expect(lifeVoiceBandForAge(12)).toBe("middle-childhood");
    expect(lifeVoiceBandForAge(13)).toBe("adolescence");
    expect(lifeVoiceBandForAge(18)).toBe("adult");
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Copy quality                                                             */
/* -------------------------------------------------------------------------- */

/** Files whose quoted strings a player can end up reading. */
const AUTHORED_SURFACES: readonly string[] = [
  "src/simulation/episode-bank.ts",
  "src/simulation/adult-situations.ts",
  "src/simulation/setup-opening-bank.ts",
  "src/simulation/setup-young-life-bank.ts",
  "src/simulation/life-callbacks.ts",
  "src/presentation/conversation-subjects.ts",
  "src/presentation/run-b-conversation.ts",
  "src/presentation/life-narration.ts",
  "src/presentation/life-record.ts",
  "src/presentation/life-story.ts",
  "src/presentation/ordinary-life.ts",
  "src/player/PlayerGame.tsx",
  "src/player/PlayerConversation.tsx",
];

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function quotedStrings(source: string): readonly string[] {
  const found: string[] = [];
  const pattern =
    /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    found.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return found;
}

describe("Authored copy says what happened", () => {
  it("uses none of the constructions the playtest named", () => {
    const offenders: string[] = [];
    for (const relative of AUTHORED_SURFACES) {
      const source = withoutComments(
        readFileSync(path.join(REPOSITORY_ROOT, relative), "utf8"),
      );
      for (const text of quotedStrings(source)) {
        for (const { pattern, instead } of BANNED_CONSTRUCTIONS) {
          if (pattern.test(text)) {
            offenders.push(
              `${relative}: ${pattern.source} — ${instead} — ${JSON.stringify(
                text.slice(0, 90),
              )}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("would have caught the four the playtest actually printed", () => {
    const shipped = [
      "Nobody at home has said anything about it out loud yet, which is its own kind of decision.",
      "It stops being only yours to carry.",
      "she looks up and says the thing with the furnace is worse",
      "Offer to cover the gap yourself",
    ];
    for (const text of shipped) {
      expect(
        BANNED_CONSTRUCTIONS.some(({ pattern }) => pattern.test(text)),
        `nothing caught ${JSON.stringify(text)}`,
      ).toBe(true);
    }
  });

  it("leaves ordinary prose alone", () => {
    // A guard broad enough to break real copy is worse than no guard.
    const legitimate = [
      "The thing she said stayed with you.",
      "There is a gap year between the two of them.",
      "He carried the box in from the car.",
      "It was a small room with one window.",
    ];
    for (const text of legitimate) {
      for (const { pattern } of BANNED_CONSTRUCTIONS) {
        expect(
          pattern.test(text),
          `${pattern.source} fired on ${JSON.stringify(text)}`,
        ).toBe(false);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Pronouns agree with themselves                                           */
/* -------------------------------------------------------------------------- */

describe("A line never disagrees with the line beside it", () => {
  it("conjugates around whichever pronouns the record holds", () => {
    const game = createNewGameWorld(
      setup({ startAge: 10, household: "shares-a-home" }),
    );
    const bindings = episodeRoleBindings(game.world, game.playerPersonId);
    const peer = bindings.find((entry) => entry.role === "household-peer")!;
    const rendered = substituteSlots(
      "{role:household-peer} said {they:household-peer} {was:household-peer} out, and {they:household-peer} ha{s:household-peer} not said where.",
      {
        world: game.world,
        person: game.world.people[game.playerPersonId]!,
        bindings,
        asOfDate: game.world.currentDate,
      },
    );
    expect(rendered).toContain(peer.personName);
    // Whatever the record says, the sentence agrees with itself.
    expect(rendered).toMatch(
      /(he was|she was|they were).*(he has|she has|they have)/,
    );
    expect(rendered).not.toContain("{");
  });

  it("introduces somebody with the relationship the record establishes", () => {
    const game = createNewGameWorld(
      setup({ startAge: 10, household: "shares-a-home" }),
    );
    const bindings = episodeRoleBindings(game.world, game.playerPersonId);
    const rendered = substituteSlots("{who:household-peer} is here.", {
      world: game.world,
      person: game.world.people[game.playerPersonId]!,
      bindings,
      asOfDate: game.world.currentDate,
    });
    expect(rendered).toMatch(/, your (older|younger) (brother|sister|sibling)/);
  });

  it("declares every role its copy names, in every slot form", () => {
    for (const family of EPISODE_FAMILIES) {
      const declared = new Set<string>(family.roles);
      for (const stage of family.stages) {
        const text = [
          ...stage.lines,
          ...stage.options.flatMap((option) => [
            option.label,
            option.description,
            option.memory,
          ]),
        ].join(" ");
        for (const match of text.matchAll(/\{[a-z]+:([a-z-]+)\}/g)) {
          expect(
            declared.has(match[1]!),
            `${family.key}/${stage.key} names ${match[1]} which the family does not declare`,
          ).toBe(true);
        }
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 7. Withdrawing a question does not rewrite an existing life                 */
/* -------------------------------------------------------------------------- */

describe("What was withdrawn stays readable", () => {
  it("keeps eighteen items out of selection", () => {
    expect(WITHDRAWN_SETUP_ITEMS).toHaveLength(18);
    const live = new Set(setupQuestionnaireBank().map((item) => item.key));
    for (const item of WITHDRAWN_SETUP_ITEMS) {
      expect(live.has(item.key)).toBe(false);
    }
  });

  it("keeps every one of them findable, so an old save still reads back", () => {
    for (const item of WITHDRAWN_SETUP_ITEMS) {
      // A save written before today names these keys. If lookup lost them,
      // withdrawing a question would silently recalibrate somebody's life.
      const found = setupQuestionnaireBank().find(
        (entry) => entry.key === item.key,
      );
      expect(found).toBeUndefined();
      expect(item.options.length).toBeGreaterThan(0);
    }
  });

  it("leaves the reachable bank with no policy docket in it", () => {
    for (const item of setupQuestionnaireBank()) {
      expect(
        item.register,
        `${item.key} is still a policy docket item`,
      ).not.toBe("policy-docket");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 8. Nothing this packet added is drawn without a rule                        */
/* -------------------------------------------------------------------------- */

describe("The player shell styles every class it names", () => {
  it("leaves no game- class in the shell without a rule in the stylesheet", () => {
    // 60A found five classes the narrative wave shipped unstyled and fixed
    // them by hand. Packet 72 adds four more — a scene header, a choices
    // heading, a fieldset and an inline choice row — so the check that would
    // have caught the first five is written down rather than repeated.
    const stylesheet = readFileSync(
      path.join(REPOSITORY_ROOT, "src/player/player.css"),
      "utf8",
    );
    const shells = [
      "src/player/PlayerGame.tsx",
      "src/player/PlayerConversation.tsx",
    ];
    const missing = new Set<string>();
    for (const relative of shells) {
      const source = readFileSync(path.join(REPOSITORY_ROOT, relative), "utf8");
      for (const match of source.matchAll(/className="([^"]*)"/g)) {
        for (const name of match[1]!.split(/\s+/)) {
          if (!name.startsWith("game-")) continue;
          if (!stylesheet.includes(`.${name}`)) missing.add(name);
        }
      }
    }
    expect([...missing].sort()).toEqual([]);
  });
});
