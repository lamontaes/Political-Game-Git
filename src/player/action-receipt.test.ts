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
