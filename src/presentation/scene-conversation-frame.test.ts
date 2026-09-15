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
      const frame = sceneConversationFrame(figures, { width, height }, 340);
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
        expect(
          frame.top >= f.bottom || frame.top + frame.maxHeight <= feetTop,
        ).toBe(true);
      }
      expect(JSON.stringify(figures)).toBe(before);
      expect(sceneConversationFrame(figures, { width, height }, 340)).toEqual(
        frame,
      );
    });
  }
});
