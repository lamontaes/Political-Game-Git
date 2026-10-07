import type { World } from "../simulation";

export type WorldDeltaPathPart = string | number;

export type WorldDeltaOperation =
  | {
      readonly kind: "set";
      readonly path: readonly WorldDeltaPathPart[];
      readonly value: unknown;
    }
  | {
      readonly kind: "delete";
      readonly path: readonly WorldDeltaPathPart[];
    };

export type WorldDelta = readonly WorldDeltaOperation[];

function plainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Describe only changed leaves so a Worker need not clone the full World back. */
export function diffWorld(base: World, next: World): WorldDelta {
  const operations: WorldDeltaOperation[] = [];
  const seen = new WeakMap<object, WeakSet<object>>();

  const visit = (
    before: unknown,
    after: unknown,
    path: readonly WorldDeltaPathPart[],
  ) => {
    if (Object.is(before, after)) return;
    if (
      before !== null &&
      after !== null &&
      typeof before === "object" &&
      typeof after === "object"
    ) {
      let paired = seen.get(before);
      if (!paired) {
        paired = new WeakSet<object>();
        seen.set(before, paired);
      }
      if (paired.has(after)) return;
      paired.add(after);

      if (Array.isArray(before) && Array.isArray(after)) {
        const common = Math.min(before.length, after.length);
        for (let index = 0; index < common; index += 1)
          visit(before[index], after[index], [...path, index]);
        for (let index = common; index < after.length; index += 1)
          operations.push({
            kind: "set",
            path: [...path, index],
            value: after[index],
          });
        if (after.length < before.length)
          operations.push({
            kind: "set",
            path: [...path, "length"],
            value: after.length,
          });
        return;
      }

      if (plainObject(before) && plainObject(after)) {
        const beforeKeys = Object.keys(before);
        const afterKeys = new Set(Object.keys(after));
        for (const key of beforeKeys)
          if (!afterKeys.has(key))
            operations.push({ kind: "delete", path: [...path, key] });
        for (const key of afterKeys) {
          if (!Object.prototype.hasOwnProperty.call(before, key))
            operations.push({
              kind: "set",
              path: [...path, key],
              value: after[key],
            });
          else visit(before[key], after[key], [...path, key]);
        }
        return;
      }
    }
    operations.push({ kind: "set", path, value: after });
  };

  visit(base, next, []);
  return operations;
}

/** Apply a compact World delta with copy-on-write for each touched container. */
export function applyWorldDelta(base: World, delta: WorldDelta): World {
  const copies = new WeakMap<object, object>();
  const root = { ...base } as Record<string, unknown>;
  copies.set(base, root);

  const copyContainer = (value: object): object => {
    const found = copies.get(value);
    if (found) return found;
    const copy = Array.isArray(value) ? value.slice() : { ...value };
    copies.set(value, copy);
    return copy;
  };

  for (const operation of delta) {
    if (operation.path.length === 0) continue;
    let source: unknown = base;
    let parent: Record<string | number, unknown> = root;
    for (const part of operation.path.slice(0, -1)) {
      if (source === null || typeof source !== "object") break;
      const child = (source as Record<string | number, unknown>)[part];
      if (child === null || typeof child !== "object") break;
      const copied = copyContainer(child);
      parent[part] = copied;
      parent = copied as Record<string | number, unknown>;
      source = child;
    }
    const leaf = operation.path.at(-1)!;
    if (operation.kind === "delete") delete parent[leaf];
    else parent[leaf] = operation.value;
  }

  return root as unknown as World;
}
