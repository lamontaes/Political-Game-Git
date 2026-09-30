import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import type { EntityId, World } from "../../src/simulation";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../../src/presentation/player-conversation";
import { conversationSubjectKeys } from "../../src/presentation/conversation-subjects";
import { commitConversationTurn } from "../../src/presentation/run-b-conversation";

export interface RecordChange {
  readonly collection: string;
  readonly kind: "added" | "changed" | "removed";
  readonly id: string;
  readonly before: unknown;
  readonly after: unknown;
}

/** Compare identities and contents, not just collection lengths. */
export function recordChanges(
  before: object,
  after: object,
): readonly RecordChange[] {
  const changes: RecordChange[] = [];
  const index = (value: unknown) => {
    const records = new Map<string, unknown>();
    const rows = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.values(value)
        : [];
    for (const row of rows) {
      if (!row || typeof row !== "object" || typeof row.id !== "string")
        continue;
      if (records.has(row.id)) throw new Error(`Duplicate record ID ${row.id}`);
      records.set(row.id, row);
    }
    return records;
  };
  const oldCollections = new Map<string, unknown>(Object.entries(before));
  const newCollections = new Map<string, unknown>(Object.entries(after));
  for (const collection of new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])) {
    const old = index(oldCollections.get(collection));
    const next = index(newCollections.get(collection));
    for (const id of new Set([...old.keys(), ...next.keys()])) {
      if (JSON.stringify(old.get(id)) === JSON.stringify(next.get(id)))
        continue;
      changes.push({
        collection,
        kind: !old.has(id) ? "added" : !next.has(id) ? "removed" : "changed",
        id,
        before: old.get(id) ?? null,
        after: next.get(id) ?? null,
      });
    }
  }
  return changes;
}

export interface ActionDeclaration {
  readonly file: string;
  readonly line: number;
  readonly declaration: string;
  readonly key: string;
  readonly dynamic: boolean;
}

/** Source declarations are leads, never proof that an action was offered. */
export function actionDeclarations(root: string): readonly ActionDeclaration[] {
  const declarations: ActionDeclaration[] = [];
  const files = [
    "src/presentation/life-conversation.ts",
    "src/presentation/life-talk-running.ts",
    "src/presentation/life-talk-topics.ts",
    "src/presentation/run-b-conversation.ts",
    "src/presentation/legislative-bargaining.ts",
    "src/presentation/contextual-scene-families.ts",
  ];
  const arrays = new Set([
    "RUNNING_STEPS",
    "RUN_B_CONVERSATION_INTENTS",
    "LEGISLATIVE_BARGAINING_INTENTS",
  ]);
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(join(root, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const add = (
      node: ts.Node,
      declaration: string,
      key: string,
      dynamic = false,
    ) =>
      declarations.push({
        file,
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        declaration,
        key,
        dynamic,
      });
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        let expression = node.initializer;
        while (expression && ts.isAsExpression(expression))
          expression = expression.expression;
        if (
          expression &&
          ts.isArrayLiteralExpression(expression) &&
          arrays.has(name)
        ) {
          for (const element of expression.elements) {
            if (ts.isStringLiteral(element))
              add(
                element,
                name,
                name === "RUNNING_STEPS"
                  ? `running:${element.text}`
                  : element.text,
              );
            else add(element, name, element.getText(source), true);
          }
        }
        if (
          name === "LIFE_TALK_INTENTS" &&
          expression &&
          ts.isObjectLiteralExpression(expression)
        ) {
          for (const property of expression.properties)
            if (ts.isPropertyAssignment(property))
              add(property, name, property.name.getText(source));
        }
        if (
          name === "TELL_PREFIX" &&
          expression &&
          ts.isStringLiteral(expression)
        )
          add(
            expression,
            name,
            `${expression.text}<record-derived-topic>`,
            true,
          );
      }
      if (
        file.endsWith("contextual-scene-families.ts") &&
        ts.isPropertyAssignment(node) &&
        node.name.getText(source) === "key"
      ) {
        const value = node.initializer;
        add(
          node,
          "contextual SceneAnswer key",
          ts.isStringLiteral(value) ? value.text : value.getText(source),
          !ts.isStringLiteral(value),
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return declarations;
}

export interface ConversationActionTrace {
  readonly subject: string;
  readonly intent: string;
  readonly label: string;
  readonly addressee: string;
  readonly audibility: string;
  readonly status: "records-written" | "no-record-change" | "refused";
  readonly reason: string | null;
  readonly beforeMoment: World["currentMoment"];
  readonly afterMoment: World["currentMoment"] | null;
  readonly changes: readonly RecordChange[];
}

function canonicalCollections(world: World): object {
  return {
    ...world.history,
    ...Object.fromEntries(
      Object.entries(world)
        .filter(([key]) => key !== "history")
        .map(([key, value]) => [`world.${key}`, value]),
    ),
  };
}

/** Each offered action forks the same saved moment; forks are never combined. */
export function auditConversationSnapshot(world: World, personId: EntityId) {
  const saved = JSON.stringify(world);
  const subjects = availablePlayerConversations(world, personId);
  const rows: ConversationActionTrace[] = [];
  for (const available of subjects) {
    const initial = projectPlayerConversation(
      world,
      personId,
      available.subject,
    );
    if (!initial || initial.settled) continue;
    for (const addressee of initial.addressees) {
      for (const audibility of initial.audibilities.filter(
        (entry) => entry.available,
      )) {
        const view = projectPlayerConversation(
          world,
          personId,
          available.subject,
          {
            addressee: addressee.key,
            audibility: audibility.key,
          },
        );
        if (!view) continue;
        for (const action of view.intents) {
          const fork: World = JSON.parse(saved);
          const basis = {
            subject: available.subject,
            intent: action.key,
            label: action.label,
            addressee: String(view.addressee),
            audibility: view.audibility,
            beforeMoment: world.currentMoment,
          };
          try {
            const result = commitConversationTurn(fork, {
              room: view.room,
              session: view.session,
              progress: view.progress,
              turnOrdinal: view.turnOrdinal,
              addressee: view.addressee,
              audibility: view.audibility,
              intent: action.key,
            });
            const changes = recordChanges(
              canonicalCollections(world),
              canonicalCollections(result.world),
            );
            rows.push({
              ...basis,
              status: changes.length ? "records-written" : "no-record-change",
              reason: null,
              afterMoment: result.world.currentMoment,
              changes,
            });
          } catch (error) {
            rows.push({
              ...basis,
              status: "refused",
              reason: error instanceof Error ? error.message : String(error),
              afterMoment: null,
              changes: [],
            });
          }
        }
      }
    }
  }
  if (JSON.stringify(world) !== saved)
    throw new Error("The conversation audit changed its input save.");
  return {
    personId,
    date: world.currentDate,
    subjects: conversationSubjectKeys().map((subject) => ({
      subject,
      status: subjects.some((entry) => entry.subject === subject)
        ? "room-present"
        : "no-production-room-in-this-snapshot",
    })),
    rows,
    counts: {
      offeredAttempts: rows.length,
      recordsWritten: rows.filter((row) => row.status === "records-written")
        .length,
      noRecordChange: rows.filter((row) => row.status === "no-record-change")
        .length,
      refused: rows.filter((row) => row.status === "refused").length,
    },
    limits:
      "One saved moment per input. Unoffered actions and later phases are unproven. Record writes do not prove promised activities happened or law effects were noticed.",
  };
}
