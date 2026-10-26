/**
 * A frozen record a producer changed since the opening is sealed again when a
 * save is restored (core-snapshot-reseal-changed-record): the restored record
 * is frozen like the one it replaces, an unchanged one stays the rebuilt
 * world's own object, and a record that was never frozen is refilled in place.
 */
import { expect, it } from "vitest";
import { decoder } from "./snapshot";

const encode = (value: unknown) => ({ $object: value }) as never;

it("keeps an unchanged frozen record as the rebuilt world's own object", () => {
  const old = Object.freeze({ id: "a", amount: 1 });
  const out = decoder()(encode({ id: "a", amount: 1 }), old) as typeof old;
  expect(out).toBe(old);
});

it("seals a changed frozen record, and the plain records inside it, again", () => {
  const old = Object.freeze({ id: "a", terms: Object.freeze({ cents: 1 }) });
  const out = decoder()(
    encode({ id: "a", terms: { cents: 2 }, tags: ["x", "y"] }),
    old,
  ) as { id: string; terms: { cents: number }; tags: string[] };
  expect(out).not.toBe(old);
  expect(out.terms.cents).toBe(2);
  expect(Object.isFrozen(out)).toBe(true);
  expect(Object.isFrozen(out.terms)).toBe(true);
  expect(Object.isFrozen(out.tags)).toBe(true);
  expect(() => {
    (out as { id: string }).id = "b";
  }).toThrow();
});

it("refills a record that was never frozen in place", () => {
  const old = { id: "a", amount: 1 };
  const out = decoder()(encode({ id: "a", amount: 2 }), old) as typeof old;
  expect(out).toBe(old);
  expect(old.amount).toBe(2);
  expect(Object.isFrozen(old)).toBe(false);
});

it("leaves writable an object the rebuilt world owns, even when a sealed record points at it", () => {
  const live = { n: 1 };
  const old = Object.freeze({ id: "a", shared: live });
  const out = decoder()(
    encode({ id: "a", shared: { n: 2 }, note: "changed" }),
    old,
  ) as { shared: { n: number } };
  expect(Object.isFrozen(out)).toBe(true);
  // The engine that holds `live` still writes to it.
  expect(out.shared).toBe(live);
  expect(Object.isFrozen(live)).toBe(false);
  live.n = 3;
  expect(out.shared.n).toBe(3);
});

it("a frozen record cannot be changed in place: only a producer replacing it can", () => {
  const record = Object.freeze({ id: "a", terms: Object.freeze({ cents: 1 }) });
  expect(() => {
    (record as { id: string }).id = "b";
  }).toThrow();
  expect(() => {
    (record.terms as { cents: number }).cents = 2;
  }).toThrow();
});
