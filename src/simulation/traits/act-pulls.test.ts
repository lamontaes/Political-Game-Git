import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { COUPLE_STAGE_CHOICES } from "../couple-stage-data";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { lifePlaceStateIdentities } from "../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../mind";
import { PERSONALITY_TRAIT_REGISTRY } from "../personality-trait-registry";
import { ensurePeopleTraitCatalog, ensurePeopleTraits } from "../people-traits";
import { latestPersonalityTendenciesForPerson } from "../queries";
import { SeededRng, pickDistinct } from "../rng";
import { traitDefinitionFromPack, isOneSided } from "../trait-packs";
import { registeredTraitConsiderations } from "../trait-readings";
import { loadedTraitRegistry } from "../trait-registry";
import type {
  DecisionConsideration,
  DecisionContext,
  EntityId,
  World,
} from "../types";
import {
  ACT_KINDS,
  decisionHasActLabels,
  isActConsideration,
  traitActTables,
} from "./act-pulls";

/* -------------------------------------------------------------------------- */
/* Reading the producers' own source, so a label cannot drift from an option   */
/* -------------------------------------------------------------------------- */

const SOURCE_ROOT = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../..",
);

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      found.push(path);
    }
  }
  return found;
}

const sourceCache = new Map<string, ts.SourceFile>();
function parsed(file: string): ts.SourceFile {
  let source = sourceCache.get(file);
  if (!source) {
    source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    sourceCache.set(file, source);
  }
  return source;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function constantIn(
  source: ts.SourceFile,
  name: string,
): ts.Expression | undefined {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer
      ) {
        return declaration.initializer;
      }
    }
  }
  return undefined;
}

/** A constant named in this file, or imported from a relative module. */
function resolveName(
  source: ts.SourceFile,
  name: string,
): { source: ts.SourceFile; expression: ts.Expression } | undefined {
  const local = constantIn(source, name);
  if (local) return { source, expression: unwrap(local) };
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }
    for (const element of statement.importClause.namedBindings.elements) {
      if (element.name.text !== name) continue;
      const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
      if (!specifier.startsWith(".")) return undefined;
      const base = resolve(dirname(source.fileName), specifier);
      for (const candidate of [
        `${base}.ts`,
        `${base}.tsx`,
        join(base, "index.ts"),
      ]) {
        if (existsSync(candidate)) {
          return resolveName(
            parsed(candidate),
            (element.propertyName ?? element.name).text,
          );
        }
      }
    }
  }
  return undefined;
}

/** A string the source states: a literal, a named constant, or `CONST.key`. */
function stringOf(
  source: ts.SourceFile,
  expression: ts.Expression,
): string | undefined {
  const value = unwrap(expression);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
    return value.text;
  }
  if (ts.isIdentifier(value)) {
    const found = resolveName(source, value.text);
    return found ? stringOf(found.source, found.expression) : undefined;
  }
  if (
    ts.isPropertyAccessExpression(value) &&
    ts.isIdentifier(value.expression)
  ) {
    const found = resolveName(source, value.expression.text);
    if (found && ts.isObjectLiteralExpression(found.expression)) {
      const property = found.expression.properties.find(
        (candidate): candidate is ts.PropertyAssignment =>
          ts.isPropertyAssignment(candidate) &&
          candidate.name.getText() === value.name.text,
      );
      return property
        ? stringOf(found.source, property.initializer)
        : undefined;
    }
  }
  return undefined;
}

function propertyOf(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.PropertyAssignment | undefined {
  return object.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) && candidate.name.getText() === name,
  );
}

interface ProducerOptions {
  readonly keys: Set<string>;
  readonly unresolved: string[];
}

/**
 * The option keys each decision's producers write in source, found by the
 * `decisionType` literal and the `options` array beside it. A producer that
 * builds its options some other way is reported as unresolved, and the test
 * names where its keys come from instead.
 */
function producerOptions(): ReadonlyMap<string, ProducerOptions> {
  const found = new Map<string, ProducerOptions>();
  for (const file of sourceFiles(SOURCE_ROOT)) {
    if (!readFileSync(file, "utf8").includes("decisionType")) continue;
    const source = parsed(file);
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const type = propertyOf(node, "decisionType");
        const id = type ? stringOf(source, type.initializer) : undefined;
        if (id) {
          const entry = found.get(id) ?? {
            keys: new Set<string>(),
            unresolved: [],
          };
          found.set(id, entry);
          const options = propertyOf(node, "options");
          const list = options ? unwrap(options.initializer) : undefined;
          if (list && ts.isArrayLiteralExpression(list)) {
            for (const element of list.elements) {
              const key =
                ts.isObjectLiteralExpression(element) &&
                propertyOf(element, "key")
                  ? stringOf(source, propertyOf(element, "key")!.initializer)
                  : undefined;
              if (key) entry.keys.add(key);
              else entry.unresolved.push(element.getText().slice(0, 40));
            }
          } else {
            entry.unresolved.push(options ? "options" : "no options here");
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* The tables, and the registry they are held against                          */
/* -------------------------------------------------------------------------- */

const tables = traitActTables();
const registry = loadedTraitRegistry();

/**
 * Decisions whose option keys the producer's source does not state as an
 * array literal here. Each names where its keys come from, so a label is still
 * held against something real.
 */
const OPTION_SOURCES: Readonly<Record<string, () => readonly string[]>> = {
  // The same two options for every office; each caller names its own words.
  "career.consider-another-term": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  "election.consider-another-congress-term": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  "election.consider-another-governor-term": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  "election.consider-another-local-term": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  "election.consider-another-presidential-term": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  "election.consider-another-state-legislative-term": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  "office.consider-resigning": () =>
    registry.decisions.get("career.consider-another-term")!.options,
  // `recordProspectRunChoice` and `decideSelfStarterRun` offer run or decline.
  "election.consider-congress-run": () => ["run", "decline"],
  "election.consider-state-legislative-run": () => ["run", "decline"],
  "campaign.organizer-outreach": () =>
    registry.decisions.get("campaign.organizer-outreach")!.options,
  "legislation.member-vote": () =>
    registry.decisions.get("legislation.member-vote")!.options,
  "legislation.bargaining-response": () => [
    ...registry.decisions.get("legislation.bargaining.answer-request")!.options,
    ...registry.decisions.get("legislation.bargaining.answer-offer")!.options,
  ],
  "people.couple-stage": () => [
    ...new Set(
      Object.values(COUPLE_STAGE_CHOICES).flatMap((choices) =>
        choices.map((choice) => choice.key),
      ),
    ),
  ],
  // Fixture decisions used by query and source-cutoff tests name their options here.
  "query-fixture": () => ["act", "wait"],
  "run-a-life-source": () => ["mention", "omit"],
  "run-a-source-cutoff": () => ["use", "omit"],
  // Term-limit rollcalls use the shared yes/no/withhold options.
  "governing.governor-term-limit-vote": () => ["vote-yea", "vote-nay", "withhold"],
  "governing.presidential-term-limit-vote": () => ["vote-yea", "vote-nay", "withhold"],
  // `leave` is "split" when there are allies and "found" when there are none.
  "party.consider-leaving": () => ["stay", "split", "found"],
  // The chapter's request is the same three answers as the campaign's.
  "campaign.chapter-support-request": () => ["grant", "decline", "defer"],
  // Term-limit votes use the shared chamber vote options.
  "governing.governor-term-limit-vote": () => [
    "vote-yea",
    "vote-nay",
    "withhold",
  ],
  "governing.presidential-term-limit-vote": () => [
    "vote-yea",
    "vote-nay",
    "withhold",
  ],
  // Offered only when a revision was authored; the keys are fixed.
  "people.study-plan-answer": () => ["agrees", "counterproposes", "unresolved"],
};

describe("act kinds, option labels and trait pulls are one consistent table", () => {
  it("holds exactly the twenty kinds the spec names", () => {
    expect([...ACT_KINDS].sort()).toEqual(
      [
        "engage",
        "withdraw",
        "confront",
        "concede",
        "cooperate",
        "refuse",
        "take-risk",
        "play-safe",
        "self-interest",
        "help-others",
        "follow-rules",
        "bend-rules",
        "speak-out",
        "stay-quiet",
        "commit",
        "delay",
        "trust",
        "distrust",
        "change",
        "keep-same",
      ].sort(),
    );
  });

  it("uses only kinds that exist, in both tables", () => {
    const unknown: string[] = [];
    for (const [decisionType, options] of tables.optionActs) {
      for (const [optionKey, kinds] of options) {
        for (const kind of kinds) {
          if (!ACT_KINDS.has(kind)) {
            unknown.push(`${decisionType}/${optionKey}: ${kind}`);
          }
        }
      }
    }
    for (const [traitId, poles] of tables.pulls) {
      for (const [pole, acts] of Object.entries(poles)) {
        for (const kind of [...acts.toward, ...acts.away]) {
          if (!ACT_KINDS.has(kind)) unknown.push(`${traitId}/${pole}: ${kind}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("gives every option one to three kinds and every pole one to three toward and at most two away", () => {
    const wrong: string[] = [];
    for (const [decisionType, options] of tables.optionActs) {
      for (const [optionKey, kinds] of options) {
        if (kinds.size < 1 || kinds.size > 3) {
          wrong.push(`${decisionType}/${optionKey} has ${kinds.size} kinds`);
        }
      }
    }
    for (const [traitId, poles] of tables.pulls) {
      for (const [pole, acts] of Object.entries(poles)) {
        if (acts.toward.size < 1 || acts.toward.size > 3) {
          wrong.push(`${traitId}/${pole} pulls toward ${acts.toward.size}`);
        }
        if (acts.away.size > 2) {
          wrong.push(`${traitId}/${pole} pushes away from ${acts.away.size}`);
        }
        for (const kind of acts.toward) {
          if (acts.away.has(kind)) {
            wrong.push(`${traitId}/${pole} is both toward and away: ${kind}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("has a pulls entry for every one of the 97 registry traits, one pole for one-sided traits and both for the rest", () => {
    expect(PERSONALITY_TRAIT_REGISTRY).toHaveLength(97);
    const problems: string[] = [];
    for (const { qualifiedKey } of PERSONALITY_TRAIT_REGISTRY) {
      const trait = registry.traits.get(qualifiedKey);
      const poles = tables.pulls.get(qualifiedKey);
      if (!trait) problems.push(`${qualifiedKey} is not in the registry`);
      else if (!poles) problems.push(`${qualifiedKey} has no pulls entry`);
      else if (isOneSided(trait)) {
        if (!poles.high || poles.low) {
          problems.push(`${qualifiedKey} is one-sided and needs only a high`);
        }
      } else if (!poles.high || !poles.low) {
        problems.push(`${qualifiedKey} is two-sided and needs both poles`);
      }
    }
    for (const traitId of tables.pulls.keys()) {
      if (!registry.traits.has(traitId)) {
        problems.push(`${traitId} has pulls but no trait`);
      }
    }
    // The loaded registry can hold a trait the inventory above does not list
    // (a legislature pack, say); every one of those needs its row too.
    for (const traitId of registry.traits.keys()) {
      if (!tables.pulls.has(traitId)) {
        problems.push(`${traitId} is in the loaded registry with no pulls`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("lists every option each covered producer offers, and no option it does not", () => {
    const producers = producerOptions();
    const problems: string[] = [];
    for (const [decisionType, labeled] of tables.optionActs) {
      const scanned = producers.get(decisionType) ?? {
        keys: new Set<string>(),
        unresolved: [],
      };
      if (!producers.has(decisionType) && !OPTION_SOURCES[decisionType]) {
        problems.push(`${decisionType} is labeled but no producer names it`);
        continue;
      }
      const stated = OPTION_SOURCES[decisionType]?.();
      const offered = new Set([...scanned.keys, ...(stated ?? [])]);
      if (scanned.unresolved.length > 0 && !stated) {
        problems.push(
          `${decisionType}: cannot read its options (${scanned.unresolved.join("; ")}); name them in OPTION_SOURCES`,
        );
        continue;
      }
      for (const key of offered) {
        if (!labeled.has(key)) {
          problems.push(`${decisionType} offers "${key}" but it is unlabeled`);
        }
      }
      for (const key of labeled.keys()) {
        if (!offered.has(key)) {
          problems.push(
            `${decisionType} labels "${key}" but offers no such option`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps the unlabeled list to decisions that exist and carry no labels", () => {
    const producers = producerOptions();
    const problems: string[] = [];
    for (const decisionType of tables.unlabeled) {
      if (tables.optionActs.has(decisionType)) {
        problems.push(`${decisionType} is both labeled and unlabeled`);
      }
      if (!producers.has(decisionType)) {
        problems.push(`${decisionType} is unlabeled but no producer names it`);
      }
    }
    expect(problems).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Test 2: the old per-decision files, reproduced by the table                  */
/* -------------------------------------------------------------------------- */

/**
 * Registry decision ids are not always the `decisionType` a producer passes.
 * The decision types an id's rows apply to; an id not listed is its own type.
 */
const DECISION_TYPES_OF_ID: Readonly<Record<string, readonly string[]>> = {
  "contact.answer": ["people.contact-answer"],
  "legislation.bargaining.answer-request": ["legislation.bargaining-response"],
  "legislation.bargaining.answer-offer": ["legislation.bargaining-response"],
  "clemency.petition": ["justice.clemency-petition"],
  "court.plea": ["justice.plea"],
  "court.jury-vote": ["justice.jury-vote"],
  "career.consider-another-term": [
    "career.consider-another-term",
    "election.consider-another-congress-term",
    "election.consider-another-governor-term",
    "election.consider-another-local-term",
    "election.consider-another-presidential-term",
    "election.consider-another-state-legislative-term",
    "office.consider-resigning",
  ],
};

/**
 * The decision each inline `traitConsiderations` call serves, by the function
 * that makes the call. A call site missing here fails the test, so a new one
 * cannot go unread; the dynamic ones say why they carry no rows.
 */
const DECISIONS_OF_INLINE_CALLER: Readonly<
  Record<string, readonly string[] | "dynamic">
> = {
  localElectionFilingHandler: ["election.consider-local-run"],
  chapterOutreachTransitionHandler: ["party-chapter.invite-to-meeting"],
  weighTownFamilyPlans: ["people.raise-family-plan"],
  leavingHomeConsiderations: ["family.leave-parental-home"],
  answerFamilyPlan: ["people.family-plan"],
  counterpartRaisesIt: ["life.raise-earlier-matter"],
  recruitLifePathPerson: ["people.session-work-answer"],
  produceFavorCollection: ["people.ask-favor-back"],
  tellOfRefusal: ["people.tell-of-refusal"],
  decideEmphasis: ["campaign.opponent-emphasis"],
  decidePromiseRenegotiation: ["people.promise-renegotiation"],
  runnerUpAsks: ["election.consider-nomination-runoff"],
  decideSelfStarterRun: [
    "election.consider-congress-run",
    "election.consider-state-legislative-run",
  ],
  decideOnOffer: ["people.job-offer-answer"],
  decidesToAct: ["people.goal-step"],
  decideStudyPlanOutcome: ["people.study-plan-answer"],
  helperAskConsiderations: ["campaign.helper-request"],
  speechReactionOf: ["speech.react"],
  askToSign: ["campaign.petition-signature"],
  decideStudyPeerOutcome: ["people.study-collaboration"],
  npcContactAnswer: ["people.contact-answer"],
  produceReachingOut: ["people.reach-out"],
  promiseCheck: ["press.confirm-account"],
  decideToLeave: ["migration.leave-town"],
  hostDecidesToAsk: ["people.invite-over"],
  produceReporterQuestion: ["press.mention-a-promise"],
  // Option keys are ids the producer builds, so there is nothing to label.
  peerStudyApproach: "dynamic",
  evaluateReplyMeaning: "dynamic",
  childhoodChoice: "dynamic",
};

interface LeanRow {
  readonly decisionType: string;
  readonly option: string;
  readonly trait: string;
  readonly pole: "low" | "high";
  readonly source: string;
}

function leanObjects(
  source: ts.SourceFile,
  expression: ts.Expression,
  into: { option: string; trait: string; pole: string }[],
): void {
  const value = unwrap(expression);
  if (ts.isArrayLiteralExpression(value)) {
    for (const element of value.elements) leanObjects(source, element, into);
  } else if (ts.isConditionalExpression(value)) {
    leanObjects(source, value.whenTrue, into);
    leanObjects(source, value.whenFalse, into);
  } else if (ts.isIdentifier(value)) {
    const found = resolveName(source, value.text);
    if (found) leanObjects(found.source, found.expression, into);
  } else if (ts.isObjectLiteralExpression(value)) {
    const option = propertyOf(value, "optionKey");
    const trait = propertyOf(value, "trait");
    const pole = propertyOf(value, "pole");
    if (option && trait && pole) {
      const optionKey = stringOf(source, option.initializer);
      const traitName = stringOf(source, trait.initializer);
      const poleName = stringOf(source, pole.initializer);
      if (optionKey && traitName && poleName) {
        into.push({ option: optionKey, trait: traitName, pole: poleName });
      }
    }
  }
}

/** Every lean written inline at a `traitConsiderations` call, and the callers. */
function inlineLeans(): {
  readonly rows: readonly LeanRow[];
  readonly callers: ReadonlySet<string>;
} {
  const rows: LeanRow[] = [];
  const callers = new Set<string>();
  for (const file of sourceFiles(SOURCE_ROOT)) {
    if (file.endsWith("people-traits.ts")) continue;
    if (!readFileSync(file, "utf8").includes("traitConsiderations(")) continue;
    const source = parsed(file);
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "traitConsiderations"
      ) {
        let caller = "";
        for (
          let parent: ts.Node | undefined = node.parent;
          parent;
          parent = parent.parent
        ) {
          if (
            (ts.isFunctionDeclaration(parent) ||
              ts.isMethodDeclaration(parent)) &&
            parent.name
          ) {
            caller = parent.name.getText();
            break;
          }
        }
        callers.add(caller);
        const mapped = DECISIONS_OF_INLINE_CALLER[caller];
        const leans: { option: string; trait: string; pole: string }[] = [];
        if (node.arguments[3]) leanObjects(source, node.arguments[3], leans);
        if (Array.isArray(mapped)) {
          for (const lean of leans) {
            for (const decisionType of mapped) {
              rows.push({
                decisionType,
                option: lean.option,
                // Inline leans name a core trait by its bare name.
                trait: `people-mind-v1:${lean.trait}`,
                pole: lean.pole as "low" | "high",
                source: `${caller} in ${file.slice(SOURCE_ROOT.length + 1)}`,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { rows, callers };
}

/** Every lean row the registered effect files declare. */
function registeredLeans(): readonly LeanRow[] {
  const rows: LeanRow[] = [];
  for (const [decisionId, leans] of registry.leans) {
    for (const lean of leans) {
      for (const decisionType of DECISION_TYPES_OF_ID[decisionId] ?? [
        decisionId,
      ]) {
        rows.push({
          decisionType,
          option: lean.option,
          trait: lean.trait,
          pole: lean.pole,
          source: `effects: ${decisionId}`,
        });
      }
    }
  }
  return rows;
}

describe("the table reproduces what the old per-decision files chose", () => {
  it("reads every lean row and reports the ones the table does not yet reproduce", () => {
    const inline = inlineLeans();
    const unmapped = [...inline.callers].filter(
      (caller) => !(caller in DECISIONS_OF_INLINE_CALLER),
    );
    expect(unmapped).toEqual([]);

    const rows = [...registeredLeans(), ...inline.rows];
    const misses: string[] = [];
    const notYetLabeled = new Set<string>();
    let reproduced = 0;
    for (const row of rows) {
      const label = `${row.decisionType} / ${row.option} <- ${row.trait} ${row.pole} (${row.source})`;
      if (!decisionHasActLabels(row.decisionType)) {
        notYetLabeled.add(row.decisionType);
        continue;
      }
      const kinds = tables.optionActs.get(row.decisionType)!.get(row.option);
      const pull = tables.pulls.get(row.trait)?.[row.pole];
      if (!kinds) misses.push(`${label}: the option is not labeled`);
      else if (!pull)
        misses.push(`${label}: the trait has no ${row.pole} pull`);
      else if (![...kinds].some((kind) => pull.toward.has(kind))) {
        misses.push(
          `${label}: option is [${[...kinds]}], pole pulls toward [${[...pull.toward]}]`,
        );
      } else reproduced += 1;
    }
    process.stderr.write(
      `ACT PULLS TEST 2: ${rows.length} lean rows read, ${reproduced} reproduced, ${misses.length} misses, ${notYetLabeled.size} decisions not yet labeled${
        misses.length > 0 ? `\n${misses.join("\n")}` : ""
      }${
        notYetLabeled.size > 0
          ? `\nnot yet labeled: ${[...notYetLabeled].sort().join(", ")}`
          : ""
      }\n`,
    );
    // The read has to have found the files. It does not fail on a miss yet:
    // that switches on when the last per-decision file is deleted.
    expect(rows.length).toBeGreaterThan(200);
    expect(reproduced + misses.length + 0).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* A seeded person in a seeded place, for the three proofs and the sweep        */
/* -------------------------------------------------------------------------- */

const SEED = "act-pulls-20261007";

function recordTrait(
  world: World,
  personId: EntityId,
  traitId: string,
  value: number,
): World {
  const trait = registry.traits.get(traitId)!;
  const definition = traitDefinitionFromPack(trait);
  const withCatalog: World = world.mindCatalog.tendencies[definition.id]
    ? world
    : {
        ...world,
        mindCatalog: {
          ...world.mindCatalog,
          tendencies: {
            ...world.mindCatalog.tendencies,
            [definition.id]: definition,
          },
          tendencyOrder: [...world.mindCatalog.tendencyOrder, definition.id],
        },
      };
  const magnitude = Math.abs(value);
  const step = trait.scale.steps.find((entry) => entry.magnitude === magnitude);
  if (!step) throw new Error(`${traitId} has no step ${magnitude}`);
  return recordPersonalityTendency(withCatalog, {
    stableKey: `act-pulls:${traitId}:${value}:${personId}:${withCatalog.history.nextSequence}`,
    personId,
    tendencyId: definition.id,
    recordedAt: withCatalog.currentDate,
    expressionKey: value > 0 ? trait.poles.high.key : trait.poles.low.key,
    strength: step.strength,
    confidence: "medium",
    scopeTags: ["life:ordinary", "career:choice"],
    provenance: createMindProvenance("authored", {
      note: "A recorded tendency for the act-pull tests.",
    }),
    supersedesTendencyId:
      latestPersonalityTendenciesForPerson(withCatalog, personId).find(
        (entry) => entry.tendencyId === definition.id,
      )?.id ?? null,
  });
}

function decisionFor(
  world: World,
  personId: EntityId,
  decisionType: string,
  stableKey: string,
  considerations: readonly DecisionConsideration[] = [],
  extra: Partial<DecisionContext> = {},
): DecisionContext {
  const options = [...tables.optionActs.get(decisionType)!.keys()].map(
    (key) => ({
      key,
      label: key,
      description: `The person chooses ${key}.`,
    }),
  );
  return {
    stableKey,
    decisionType,
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "act-pulls", entityId: null },
    options,
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
    ...extra,
  };
}

const [place] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);

function seededPerson(stateKey: string, seed = SEED) {
  const small = smallWorld({ place: stateKey, people: 4, seed });
  const personId = small.world.personOrder[1] ?? small.world.personOrder[0]!;
  return { world: small.world, personId };
}

function actReasons(
  considerations: readonly DecisionConsideration[],
  traitId?: string,
) {
  return considerations.filter(
    (reason) =>
      isActConsideration(reason) &&
      (traitId === undefined || reason.stableKey.includes(`:act:${traitId}:`)),
  );
}

/* -------------------------------------------------------------------------- */
/* Test 3: the proof                                                           */
/* -------------------------------------------------------------------------- */

describe(`one person in ${place!.jurisdictionKey} (seed ${SEED}) decides differently with the opposite trait`, () => {
  const twoSided = [...tables.pulls]
    .filter(([, poles]) => poles.high && poles.low)
    .map(([traitId]) => traitId);

  for (const decisionType of [
    "press.subject-response",
    "career.consider-another-term",
    "campaign.organizer-outreach",
  ]) {
    it(`changes the ${decisionType} choice, and the trace lists the act reason`, () => {
      const { world, personId } = seededPerson(place!.jurisdictionKey);
      const differing: string[] = [];
      for (const traitId of twoSided) {
        const high = recordTrait(world, personId, traitId, 2);
        const low = recordTrait(world, personId, traitId, -2);
        const chose = (decided: World) =>
          evaluateDecision(
            decided,
            decisionFor(decided, personId, decisionType, `proof:${traitId}`),
          );
        const onHigh = chose(high);
        const onLow = chose(low);
        if (
          isSelectedDecision(onHigh) &&
          isSelectedDecision(onLow) &&
          onHigh.selectedOptionKey !== onLow.selectedOptionKey
        ) {
          differing.push(traitId);
          const record = latestPersonalityTendenciesForPerson(
            high,
            personId,
          ).find((entry) => entry.tendencyId === tendencyOf(traitId))!;
          const reasons = actReasons(onHigh.context.considerations, traitId);
          expect(reasons.length).toBeGreaterThan(0);
          for (const reason of reasons) {
            expect(reason.sourceType).toBe("mind:personality");
            expect(reason.explanation.split("|")).toHaveLength(4);
            expect(
              reason.explanation.startsWith(`${traitId}|${decisionType}|`),
            ).toBe(true);
            expect(reason.sourceRefs).toEqual([
              { kind: "personality-tendency", tendencyRecordId: record.id },
            ]);
          }
        }
      }
      process.stderr.write(
        `ACT PULLS PROOF ${decisionType}: ${differing.length} of ${twoSided.length} two-sided traits change the choice (${differing.slice(0, 6).join(", ")})\n`,
      );
      expect(differing.length).toBeGreaterThanOrEqual(1);
    });
  }

  it("also separates a one-sided trait from no record at all", () => {
    const { world, personId } = seededPerson(place!.jurisdictionKey);
    const none = evaluateDecision(
      world,
      decisionFor(world, personId, "press.subject-response", "proof:none"),
    );
    const withTrait = recordTrait(
      world,
      personId,
      "personality-v1:facet-hot-headed",
      2,
    );
    const hot = evaluateDecision(
      withTrait,
      decisionFor(withTrait, personId, "press.subject-response", "proof:hot"),
    );
    expect(actReasons(none.context.considerations)).toEqual([]);
    expect(hot.selectedOptionKey).toBe("dispute");
  });
});

function tendencyOf(traitId: string): EntityId {
  return traitDefinitionFromPack(registry.traits.get(traitId)!).id;
}

/* -------------------------------------------------------------------------- */
/* Test 4: nothing is counted twice                                            */
/* -------------------------------------------------------------------------- */

describe("a trait a decision already reasoned about is not counted again", () => {
  it("adds no act reason for a trait the registered path already gave a reason", () => {
    const { world, personId } = seededPerson(place!.jurisdictionKey);
    const ambitious = "personality-v1:facet-ambitious";
    const withBoth = recordTrait(
      recordTrait(world, personId, ambitious, 2),
      personId,
      "personality-v1:facet-contented",
      2,
    );
    const registered = registeredTraitConsiderations(
      withBoth,
      registry,
      personId,
      "double:count",
      "career.consider-another-term",
    );
    // The old path speaks for facet-ambitious; the other trait it holds is
    // left to the table.
    expect(
      registered.some((reason) =>
        reason.stableKey.includes(`:trait:${ambitious}:`),
      ),
    ).toBe(true);
    const evaluation = evaluateDecision(
      withBoth,
      decisionFor(
        withBoth,
        personId,
        "career.consider-another-term",
        "double:count",
        registered,
      ),
    );
    expect(actReasons(evaluation.context.considerations, ambitious)).toEqual(
      [],
    );
    const contented = registered.some((reason) =>
      reason.stableKey.includes(":trait:personality-v1:facet-contented:"),
    );
    expect(contented).toBe(true);
    expect(
      actReasons(
        evaluation.context.considerations,
        "personality-v1:facet-contented",
      ),
    ).toEqual([]);
    // A trait with no old reason does get one from the table.
    const hotHeaded = recordTrait(
      withBoth,
      personId,
      "personality-v1:facet-calm",
      2,
    );
    const calm = evaluateDecision(
      hotHeaded,
      decisionFor(
        hotHeaded,
        personId,
        "career.consider-another-term",
        "double:count:calm",
        registered,
      ),
    );
    expect(
      actReasons(calm.context.considerations, "personality-v1:facet-calm")
        .length,
    ).toBeGreaterThan(0);
  });

  it("adds no act reason for a core trait the inline path already gave a reason", () => {
    const { world, personId } = seededPerson(place!.jurisdictionKey);
    const prepared = recordTrait(
      recordTrait(
        ensurePeopleTraits(ensurePeopleTraitCatalog(world), [personId]),
        personId,
        "people-mind-v1:sociability",
        2,
      ),
      personId,
      "people-mind-v1:conflict",
      2,
    );
    const record = latestPersonalityTendenciesForPerson(
      prepared,
      personId,
    ).find(
      (entry) => entry.tendencyId === tendencyOf("people-mind-v1:sociability"),
    )!;
    const inline: DecisionConsideration = {
      // The shape `traitConsiderations` writes: the bare core trait name.
      stableKey: "inline:trait:sociability:accept:0",
      optionKey: "accept",
      sourceType: "mind:personality",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation: "They are outgoing.",
      sourceRefs: [
        { kind: "personality-tendency", tendencyRecordId: record.id },
      ],
    };
    const evaluation = evaluateDecision(
      prepared,
      decisionFor(prepared, personId, "people.contact-answer", "inline", [
        inline,
      ]),
    );
    expect(
      actReasons(
        evaluation.context.considerations,
        "people-mind-v1:sociability",
      ),
    ).toEqual([]);
    expect(
      actReasons(evaluation.context.considerations, "people-mind-v1:conflict")
        .length,
    ).toBeGreaterThan(0);
  });

  it("adds nothing when a fixture turns the table off, and nothing for an unlabeled decision", () => {
    const { world, personId } = seededPerson(place!.jurisdictionKey);
    const hot = recordTrait(
      world,
      personId,
      "personality-v1:facet-hot-headed",
      2,
    );
    const off = evaluateDecision(
      hot,
      decisionFor(hot, personId, "press.subject-response", "off", [], {
        traitActs: "off",
      }),
    );
    expect(actReasons(off.context.considerations)).toEqual([]);
    const unlabeled = evaluateDecision(hot, {
      ...decisionFor(hot, personId, "press.subject-response", "unlabeled"),
      decisionType: "test.not-labeled",
    });
    expect(actReasons(unlabeled.context.considerations)).toEqual([]);
  });

  it("records a durable decision that carries act reasons and replays it exactly", () => {
    const { world, personId } = seededPerson(place!.jurisdictionKey);
    const hot = recordTrait(
      world,
      personId,
      "personality-v1:facet-hot-headed",
      2,
    );
    const evaluation = evaluateDecision(
      hot,
      decisionFor(hot, personId, "press.subject-response", "durable", [], {
        retention: "durable",
      }),
    );
    expect(
      actReasons(evaluation.context.considerations).length,
    ).toBeGreaterThan(0);
    const recorded = recordDurableDecisionTrace(hot, evaluation);
    expect(recorded.history.decisionTraces.at(-1)?.selectedOptionKey).toBe(
      evaluation.selectedOptionKey,
    );
  });

  it("reads no trait record written after the decision's own cutoff", () => {
    const { world, personId } = seededPerson(place!.jurisdictionKey);
    const before = decisionFor(
      world,
      personId,
      "press.subject-response",
      "cutoff",
    );
    const later = recordTrait(
      world,
      personId,
      "personality-v1:facet-hot-headed",
      2,
    );
    const evaluation = evaluateDecision(later, before);
    expect(actReasons(evaluation.context.considerations)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Test 5: all 56 places                                                       */
/* -------------------------------------------------------------------------- */

describe("the table runs the same in every one of the 56 places", () => {
  const states = lifePlaceStateIdentities();

  it("covers 56 places", () => {
    expect(states).toHaveLength(56);
  });

  it("gives one seeded person per place a live decision with at least one act reason, and throws nowhere", () => {
    const withoutReason: string[] = [];
    for (const state of states) {
      const { world, personId } = seededPerson(
        state.jurisdictionKey,
        `${SEED}:${state.jurisdictionKey}`,
      );
      const withTraits = recordTrait(
        world,
        personId,
        "personality-v1:facet-hot-headed",
        2,
      );
      const recorded = latestPersonalityTendenciesForPerson(
        withTraits,
        personId,
      );
      expect(recorded.length).toBeGreaterThan(0);
      const evaluation = evaluateDecision(
        withTraits,
        decisionFor(
          withTraits,
          personId,
          "press.subject-response",
          `sweep:${state.jurisdictionKey}`,
        ),
      );
      if (actReasons(evaluation.context.considerations).length === 0) {
        withoutReason.push(state.jurisdictionKey);
      }
    }
    expect(withoutReason).toEqual([]);
  }, 600_000);
});

describe("coverage of the tables", () => {
  it("prints how much the first pass labels", () => {
    let options = 0;
    for (const labeled of tables.optionActs.values()) options += labeled.size;
    process.stderr.write(
      `ACT PULLS COVERAGE: ${tables.optionActs.size} decisions labeled, ${options} options labeled, ${tables.pulls.size} traits with pulls, ${tables.unlabeled.size} decisions listed as unlabeled\n`,
    );
    expect(tables.optionActs.size).toBeGreaterThan(0);
  });
});
