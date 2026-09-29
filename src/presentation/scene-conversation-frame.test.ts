import { describe, expect, it } from "vitest";
import { sceneConversationFrame } from "./scene-conversation-frame";

describe("crowded room conversation frame", () => {
  for (const [width, height] of [
    [1280, 860],
    [1200, 720],
  ]) {
    it(`protects heads and soles at ${width}×${height} without moving people`, () => {
      const scale = height / 860;
      const figures = [
        { left: 110, right: 366, top: 213, bottom: 720 },
        { left: 410, right: 748, top: 135, bottom: 811 },
        { left: 841, right: 1029, top: 245, bottom: 681 },
      ].map((f) => ({
        left: (f.left * width) / 1280,
        right: (f.right * width) / 1280,
        top: f.top * scale,
        bottom: f.bottom * scale,
      }));
      const before = JSON.stringify(figures);
      // Replies in columns: the box is shorter when it is wider.
      const contentHeightAt = (w: number) => (w >= 768 ? 280 : 340);
      const frame = sceneConversationFrame(
        figures,
        { width, height },
        contentHeightAt,
      );
      expect(frame.maxHeight).toBe(contentHeightAt(frame.width));
      expect(frame.top).toBeGreaterThanOrEqual(48);
      expect(frame.top + frame.maxHeight).toBeLessThanOrEqual(height - 48);
      for (const f of figures) {
        if (frame.left >= f.right || frame.left + frame.width <= f.left)
          continue;
        const faceBottom = f.top + (f.bottom - f.top) * 0.28;
        const feetTop = f.bottom - (f.bottom - f.top) * 0.12;
        expect(
          frame.top >= faceBottom || frame.top + frame.maxHeight <= f.top,
        ).toBe(true);
        // Soles too, where the room leaves that much space; at 1200×720 a
        // crowded room has none, and the box stands in front of feet rather
        // than scroll or hide a reply.
        if (height >= 860)
          expect(
            frame.top >= f.bottom || frame.top + frame.maxHeight <= feetTop,
          ).toBe(true);
      }
      expect(JSON.stringify(figures)).toBe(before);
      expect(
        sceneConversationFrame(figures, { width, height }, contentHeightAt),
      ).toEqual(frame);
    });
  }

  const room = { width: 1440, height: 900 };
  const bounds = { top: 48, bottom: 752, leftInset: 272, rightInset: 20 };

  it("keeps bottom-center when the only person stands beside the box", () => {
    // A tall person to the right of center: their face is not under the box.
    const figures = [{ left: 1060, right: 1190, top: 440, bottom: 760 }];
    const frame = sceneConversationFrame(figures, room, () => 368, bounds);
    expect(frame).toEqual({ left: 432, top: 384, width: 576, maxHeight: 368 });
  });

  it("sizes the box from its wrapped content, never shorter than it needs", () => {
    // Content wraps shorter as the box widens.
    const contentHeightAt = (width: number) => 240_000 / width;
    const figures = [{ left: 520, right: 920, top: 420, bottom: 880 }];
    const frame = sceneConversationFrame(
      figures,
      room,
      contentHeightAt,
      bounds,
    );
    expect(frame.maxHeight).toBeGreaterThanOrEqual(
      Math.ceil(contentHeightAt(frame.width)),
    );
    expect(frame.top).toBeGreaterThanOrEqual(bounds.top);
    expect(frame.top + frame.maxHeight).toBeLessThanOrEqual(bounds.bottom);
  });

  it("goes wider before it would need a scrollbar", () => {
    // 520 px of content at the usual width, 300 px at 768: only wider fits.
    const contentHeightAt = (width: number) => (width >= 768 ? 300 : 520);
    const frame = sceneConversationFrame([], room, contentHeightAt, {
      ...bounds,
      bottom: 400,
    });
    expect(frame).toEqual({ left: 336, top: 100, width: 768, maxHeight: 300 });
  });

  it("keeps clear of a shell card standing over the room", () => {
    const card = { left: 18, right: 370, top: 18, bottom: 313 };
    const frame = sceneConversationFrame(
      [],
      { width: 1200, height: 720 },
      (width) => (width >= 480 ? 300 : 320),
      { top: 48, bottom: 566, leftInset: 272, rightInset: 20 },
      [card],
    );
    const clearBeside = frame.left >= card.right + 16;
    const clearBelow = frame.top >= card.bottom + 16;
    expect(clearBeside || clearBelow).toBe(true);
    // Still bottom-center: its middle is within the middle third.
    const middle = frame.left + frame.width / 2;
    expect(middle).toBeGreaterThan(1200 * 0.32);
    expect(middle).toBeLessThan(1200 * 0.68);
  });

  it("covers a face only when nowhere else holds every choice", () => {
    const figures = [{ left: 0, right: 1440, top: 60, bottom: 740 }];
    const frame = sceneConversationFrame(figures, room, () => 600, bounds);
    expect(frame.maxHeight).toBe(600);
  });
});
