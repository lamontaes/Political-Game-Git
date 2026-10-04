import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleCompletedReceiptExpiry } from "./action-receipt";

afterEach(() => vi.useRealTimers());

describe("completed action receipt lifetime", () => {
  it("keeps the full three seconds and renews when a newer receipt arrives", () => {
    vi.useFakeTimers();
    const old = vi.fn();
    const next = vi.fn();
    const cancel = scheduleCompletedReceiptExpiry(true, old);
    vi.advanceTimersByTime(2_999);
    expect(old).not.toHaveBeenCalled();
    cancel();
    scheduleCompletedReceiptExpiry(true, next);
    vi.advanceTimersByTime(2_999);
    expect(old).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("leaves decisions, errors and refusals until explicitly replaced", () => {
    vi.useFakeTimers();
    const expire = vi.fn();
    scheduleCompletedReceiptExpiry(false, expire);
    vi.advanceTimersByTime(60_000);
    expect(expire).not.toHaveBeenCalled();
  });
  it("cancels expiry on cleanup without relying on animation or motion preferences", () => {
    vi.useFakeTimers();
    const expire = vi.fn();
    scheduleCompletedReceiptExpiry(true, expire)();
    vi.advanceTimersByTime(3_000);
    expect(expire).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("waits for the actual CSS fade without duplicating its timing", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const fade = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const expire = vi.fn();
  scheduleCompletedReceiptExpiry(true, expire, () => [fade]);
  vi.advanceTimersByTime(3_000);
  expect(expire).not.toHaveBeenCalled();
  finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(expire).toHaveBeenCalledTimes(1);
});

it("cannot clear a replacement or unmounted receipt when an old fade finishes", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const fade = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const expire = vi.fn();
  const cancel = scheduleCompletedReceiptExpiry(true, expire, () => [fade]);
  vi.advanceTimersByTime(3_000);
  cancel();
  finish();
  await Promise.resolve();
  await Promise.resolve();
  expect(expire).not.toHaveBeenCalled();
});
