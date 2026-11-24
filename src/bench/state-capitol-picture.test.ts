import { expect, it } from "vitest";
import {
  creatorRandomPlace,
  creatorStates,
  stateCapitolPicture,
} from "./creator";

// The loading screen shows the player's own state's capitol (the Player's
// Nov 23 playtest: New Jersey loaded over another state's capitol).
it("gives every state its own capitol, or the dome or tower the picture list names", () => {
  const states = creatorStates();
  expect(states.length).toBeGreaterThan(50);
  for (const state of states) {
    const usps = state.key.slice(3).toLowerCase();
    expect(state.capitol, state.key).toBe(stateCapitolPicture(state.key));
    expect(state.capitol, state.key).toMatch(
      new RegExp(`state-capitol-(${usps}|dome|tower)__`),
    );
  }
  expect(stateCapitolPicture("US-NJ")).toMatch(/state-capitol-nj__/);
  expect(stateCapitolPicture("US-TX")).toMatch(/state-capitol-tx__/);
  expect(stateCapitolPicture("US-NJ")).not.toBe(stateCapitolPicture("US-TX"));
});

// Random draws a place whose state carries its capitol, as a picked state does
// (the Player on #9995: loading showed another state's picture on the first frame).
it("gives the state a Random draw returns its capitol", () => {
  for (let draw = 1; draw <= 5; draw++) {
    const { state } = creatorRandomPlace("capitol-seed", draw);
    expect(state.capitol, state.key).toBe(stateCapitolPicture(state.key));
  }
});
