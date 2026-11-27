import type { CoreModule, CoreState } from "./types";

/**
 * The one way an engine reads what the installed modules carry as fields of
 * `CoreModule` (the CTO's side-registry rule, Nov 27, 7:39 a.m.): the modules
 * that carry a field, in install order, for this one world. Modules are only
 * ever added to a world, so the list for a field is kept until the count
 * changes. There is no list an engine fills as its file loads.
 */
interface Kept {
  size: number;
  byField: Map<keyof CoreModule, readonly CoreModule[]>;
}
const kept = new WeakMap<CoreState, Kept>();

/** The installed modules that carry `field`, in install order. */
export function carriersOf(
  core: CoreState,
  field: keyof CoreModule,
): readonly CoreModule[] {
  let entry = kept.get(core);
  if (!entry || entry.size !== core.modules.size) {
    entry = { size: core.modules.size, byField: new Map() };
    kept.set(core, entry);
  }
  let carriers = entry.byField.get(field);
  if (!carriers) {
    carriers = [...core.modules.values()].filter(
      (module) => module[field] !== undefined,
    );
    entry.byField.set(field, carriers);
  }
  return carriers;
}

/**
 * What each carrier says for `field`, in install order. A method-form field
 * is returned as stored: call it through the carrier (`carriersOf`) when it
 * reads `this`.
 */
export function fieldsOf<K extends keyof CoreModule>(
  core: CoreState,
  field: K,
): readonly NonNullable<CoreModule[K]>[] {
  return carriersOf(core, field).map(
    (module) => module[field] as NonNullable<CoreModule[K]>,
  );
}
