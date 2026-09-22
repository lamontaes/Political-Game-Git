import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  INITIAL_INTERFACE_PROGRESS,
  INITIAL_SHELL_STATE,
  LEGACY_INTERFACE_PROGRESS,
  activeView,
  canGoBack,
  conversationSuspended,
  isPinned,
  refKey,
  sameRef,
  shellReducer,
  type ShellAction,
  type ShellRef,
  type ShellState,
} from "./shell-navigation";
import type { EntityId } from "../simulation";

const ALICE = "person-alice" as EntityId;
const BOB = "person-bob" as EntityId;
const MEETING = "activity-1" as EntityId;
const BILL = "measure-1" as EntityId;

const person: ShellRef = { kind: "person", id: ALICE };
const meeting: ShellRef = { kind: "commitment", id: MEETING };
const bill: ShellRef = { kind: "measure", id: BILL };

function run(
  actions: readonly ShellAction[],
  from: ShellState = INITIAL_SHELL_STATE,
): ShellState {
  return actions.reduce(shellReducer, from);
}

describe("the shell's navigation", () => {
  it("opens on the room and can go nowhere back from it", () => {
    expect(activeView(INITIAL_SHELL_STATE)).toEqual({ surface: "scene" });
    expect(canGoBack(INITIAL_SHELL_STATE)).toBe(false);
  });

  it("walks a chain and comes back through it one step at a time", () => {
    const state = run([
      { type: "go-to-surface", surface: "people" },
      { type: "open-entity", ref: person },
      { type: "open-entity", ref: meeting },
    ]);
    expect(activeView(state)).toEqual({ surface: "entity", ref: meeting });

    const back = shellReducer(state, { type: "back" });
    expect(activeView(back)).toEqual({ surface: "entity", ref: person });

    const twice = shellReducer(back, { type: "back" });
    expect(activeView(twice)).toEqual({ surface: "people" });
  });

  it("does not stack the same view on itself", () => {
    const state = run([
      { type: "open-entity", ref: person },
      { type: "open-entity", ref: person },
    ]);
    expect(state.history).toHaveLength(2);
  });

  it("returns to the room in one move from anywhere", () => {
    const state = run([
      { type: "go-to-surface", surface: "calendar" },
      { type: "open-entity", ref: meeting },
      { type: "go-to-scene" },
    ]);
    expect(state.history).toEqual([{ surface: "scene" }]);
  });

  it("keeps the person's record under a conversation started from it", () => {
    const talking = run([
      { type: "go-to-surface", surface: "people" },
      { type: "open-entity", ref: person },
      { type: "talk-in-scene", personId: ALICE },
    ]);
    expect(activeView(talking)).toEqual({ surface: "scene" });
    const back = shellReducer(talking, { type: "back" });
    expect(activeView(back)).toEqual({ surface: "entity", ref: person });
    expect(activeView(shellReducer(back, { type: "back" }))).toEqual({
      surface: "people",
    });
  });

  it("puts the person's record under a conversation started from their card", () => {
    const talking = run([
      { type: "go-to-surface", surface: "people" },
      { type: "open-quick-dossier", personId: ALICE },
      { type: "talk-in-scene", personId: ALICE },
    ]);
    expect(talking.quickDossierPersonId).toBeNull();
    expect(activeView(talking)).toEqual({ surface: "scene" });
    const back = shellReducer(talking, { type: "back" });
    expect(activeView(back)).toEqual({ surface: "entity", ref: person });
  });

  it("does not send Back from a room conversation to an older record", () => {
    const talking = run([
      { type: "go-to-surface", surface: "people" },
      { type: "open-entity", ref: person },
      { type: "talk-in-scene", personId: ALICE },
      { type: "open-quick-dossier", personId: ALICE },
      { type: "talk-in-scene", personId: ALICE },
    ]);
    expect(talking.history).toEqual([{ surface: "scene" }]);
    expect(canGoBack(talking)).toBe(false);
  });

  it("leaves the history alone when the conversation starts in the room", () => {
    const talking = run([
      { type: "open-quick-dossier", personId: ALICE },
      { type: "talk-in-scene", personId: ALICE },
    ]);
    expect(talking.history).toEqual(INITIAL_SHELL_STATE.history);
    expect(talking.quickDossierPersonId).toBeNull();
  });

  it("carries the chosen person, and one card replaces the last", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, {
      type: "open-quick-dossier",
      personId: BOB,
    });
    expect(state.quickDossierPersonId).toBe(BOB);

    const other = shellReducer(state, {
      type: "open-quick-dossier",
      personId: ALICE,
    });
    expect(other.quickDossierPersonId).toBe(ALICE);
    expect(other.navigation).toBe("closed");
  });

  it("asks before leaving, and Escape withdraws the question first", () => {
    const asked = shellReducer(
      shellReducer(INITIAL_SHELL_STATE, { type: "toggle-navigation" }),
      { type: "ask-leave" },
    );
    expect(asked.confirmingLeave).toBe(true);
    expect(asked.navigation).toBe("closed");
    const withdrawn = shellReducer(asked, { type: "escape" });
    expect(withdrawn.confirmingLeave).toBe(false);
    expect(shellReducer(asked, { type: "cancel-leave" }).confirmingLeave).toBe(
      false,
    );
  });

  it("keeps interruption choices as preferences with a single writer", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, {
      type: "set-interruption",
      key: "stopForWorkShifts",
      value: true,
    });
    expect(state.preferences.interruptions.stopForWorkShifts).toBe(true);
    expect(state.preferences.interruptions.stopForTentativeHolds).toBe(false);
    expect(
      shellReducer(state, {
        type: "set-interruption",
        key: "stopForWorkShifts",
        value: true,
      }),
    ).toBe(state);
  });
});

describe("pins", () => {
  it("keeps three kinds at once and opens by reference, not by row", () => {
    const state = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin", ref: bill },
    ]);
    expect(state.pins.map((pin) => pin.key)).toEqual([
      refKey(person),
      refKey(meeting),
      refKey(bill),
    ]);
    expect(isPinned(state, meeting)).toBe(true);
  });

  it("survives navigation, because a pin is a choice and not a layer", () => {
    const state = run([
      { type: "toggle-pin", ref: person },
      { type: "go-to-surface", surface: "journal" },
      { type: "open-entity", ref: bill },
      { type: "back" },
      { type: "go-to-scene" },
    ]);
    expect(state.pins).toHaveLength(1);
  });

  it("reorders by key, so a stale index cannot move the wrong pin", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin", ref: bill },
    ]);
    const moved = shellReducer(pinned, {
      type: "reorder-pin",
      key: refKey(bill),
      toIndex: 0,
    });
    expect(moved.pins.map((pin) => pin.key)).toEqual([
      refKey(bill),
      refKey(person),
      refKey(meeting),
    ]);

    const gone = shellReducer(moved, {
      type: "reorder-pin",
      key: "person:nobody",
      toIndex: 0,
    });
    expect(gone).toBe(moved);
  });

  it("moves up and down for the keyboard and leaves that menu standing", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin-menu", key: refKey(meeting) },
    ]);
    const moved = shellReducer(pinned, {
      type: "move-pin",
      key: refKey(meeting),
      direction: "up",
    });
    expect(moved.pins[0]?.key).toBe(refKey(meeting));
    expect(moved.activePinMenuKey).toBe(refKey(meeting));
  });

  it("closes only its own menu when a size is chosen", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin-menu", key: refKey(person) },
    ]);
    const sized = shellReducer(pinned, {
      type: "set-pin-size",
      key: refKey(person),
      size: "expanded",
    });
    expect(sized.pins[0]?.size).toBe("expanded");
    expect(sized.activePinMenuKey).toBeNull();

    const otherMenu = shellReducer(
      { ...pinned, activePinMenuKey: refKey(meeting) },
      { type: "set-pin-size", key: refKey(person), size: "tiny" },
    );
    expect(otherMenu.activePinMenuKey).toBe(refKey(meeting));
  });

  it("takes a new pin at the size the preferences ask for", () => {
    const state = run([
      { type: "set-default-pin-size", size: "tiny" },
      { type: "toggle-pin", ref: person },
    ]);
    expect(state.pins[0]?.size).toBe("tiny");
  });

  it("drops pins this world cannot resolve", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: bill },
    ]);
    const pruned = shellReducer(pinned, {
      type: "prune-pins",
      keep: [refKey(person)],
    });
    expect(pruned.pins.map((pin) => pin.key)).toEqual([refKey(person)]);
  });
});

describe("Escape", () => {
  it("closes exactly one layer, in stacking order", () => {
    let state = run([
      { type: "toggle-pin", ref: person },
      { type: "go-to-surface", surface: "people" },
      { type: "open-quick-dossier", personId: ALICE },
      { type: "toggle-pin-menu", key: refKey(person) },
    ]);

    state = shellReducer(state, { type: "escape" });
    expect(state.activePinMenuKey).toBeNull();
    expect(state.quickDossierPersonId).toBe(ALICE);

    state = shellReducer(state, { type: "escape" });
    expect(state.quickDossierPersonId).toBeNull();
    expect(activeView(state)).toEqual({ surface: "people" });

    state = shellReducer(state, { type: "escape" });
    expect(activeView(state)).toEqual({ surface: "scene" });
  });

  it("opens the session menu at the base of the room without changing the room", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, { type: "escape" });
    expect(state.navigation).toBe("primary");
    expect(activeView(state)).toEqual(activeView(INITIAL_SHELL_STATE));
  });
});

describe("preferences", () => {
  it("start at the documented defaults and are restored wholesale", () => {
    expect(INITIAL_SHELL_STATE.preferences).toEqual(DEFAULT_PREFERENCES);
    const restored = shellReducer(INITIAL_SHELL_STATE, {
      type: "restore",
      pins: [{ key: refKey(person), ref: person, size: "expanded" }],
      preferences: { peopleView: "list", defaultPinSize: "tiny" },
    });
    expect(restored.preferences.peopleView).toBe("list");
    expect(restored.pins).toHaveLength(1);
  });

  it("sets the map view through one validated action", () => {
    const next = shellReducer(INITIAL_SHELL_STATE, {
      type: "set-map-preferences",
      preferences: {
        mode: "senate",
        stateUsps: null,
        labels: false,
        presentation: "map",
      },
    });
    expect(next.preferences.map.mode).toBe("senate");
    expect(next.preferences.map.labels).toBe(false);
    expect(next.preferences.peopleView).toBe(
      INITIAL_SHELL_STATE.preferences.peopleView,
    );
    expect(next.history).toEqual(INITIAL_SHELL_STATE.history);
  });

  it("follows and unfollows a represented outlet without touching navigation", () => {
    const followed = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-news-outlet-follow",
      outletKey: "civic-ledger",
    });
    expect(followed.preferences.followedNewsOutletKeys).toEqual([
      "civic-ledger",
    ]);
    expect(followed.history).toEqual(INITIAL_SHELL_STATE.history);

    const unfollowed = shellReducer(followed, {
      type: "toggle-news-outlet-follow",
      outletKey: "civic-ledger",
    });
    expect(unfollowed.preferences.followedNewsOutletKeys).toEqual([]);
  });
});

describe("UI9 destinations", () => {
  it("opens Politics as a real destination and returns through shared history", () => {
    let state = shellReducer(INITIAL_SHELL_STATE, {
      type: "go-to-surface",
      surface: "politics",
    });
    expect(activeView(state)).toEqual({ surface: "politics" });
    expect(canGoBack(state)).toBe(true);

    state = shellReducer(state, {
      type: "go-to-surface",
      surface: "people",
    });
    expect(activeView(state)).toEqual({ surface: "people" });
    state = shellReducer(state, { type: "back" });
    expect(activeView(state)).toEqual({ surface: "politics" });
  });

  it("keeps Who you are and Money and property apart", () => {
    // Both entries used to dispatch the identical view, so the second was a
    // second name for the first click rather than a destination.
    let state = shellReducer(INITIAL_SHELL_STATE, {
      type: "go-to-surface",
      surface: "personal",
      section: "identity",
    });
    expect(activeView(state)).toEqual({
      surface: "personal",
      section: "identity",
    });

    state = shellReducer(state, {
      type: "go-to-surface",
      surface: "personal",
      section: "finances",
    });
    expect(activeView(state)).toEqual({
      surface: "personal",
      section: "finances",
    });

    // And Back returns to the half they came from, not to the room.
    state = shellReducer(state, { type: "back" });
    expect(activeView(state)).toEqual({
      surface: "personal",
      section: "identity",
    });
  });

  it("pins a government as its own kind of reference", () => {
    const government = {
      kind: "government" as const,
      id: "lexington-fayette-urban-county-government",
    };
    expect(refKey(government)).toBe(
      "government:lexington-fayette-urban-county-government",
    );

    let state = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-pin",
      ref: government,
    });
    expect(isPinned(state, government)).toBe(true);

    // It opens as an entity, so Back behaves as it does for every other pin.
    state = shellReducer(state, { type: "open-entity", ref: government });
    expect(activeView(state)).toEqual({ surface: "entity", ref: government });
    state = shellReducer(state, { type: "back" });
    expect(activeView(state)).toEqual({ surface: "scene" });

    // A person and a government with the same id string are different pins.
    const namesake = { kind: "person" as const, id: government.id as never };
    expect(sameRef(government, namesake)).toBe(false);
  });
});

describe("interface progress", () => {
  it("starts a fresh life unseen, with no frontier", () => {
    expect(INITIAL_SHELL_STATE.progress).toEqual(INITIAL_INTERFACE_PROGRESS);
    expect(INITIAL_SHELL_STATE.progress.orientationSeen).toBe(false);
  });

  it("finishing the introduction is idempotent and moves nothing else", () => {
    const once = run([{ type: "finish-orientation" }]);
    expect(once.progress.orientationSeen).toBe(true);
    expect(once.history).toEqual(INITIAL_SHELL_STATE.history);
    expect(shellReducer(once, { type: "finish-orientation" })).toBe(once);
  });

  it("sets the frontier only for a life that has none", () => {
    const started = run([{ type: "start-recap-frontier", sequence: 40 }]);
    expect(started.progress.recapFrontier).toBe(40);
    expect(
      shellReducer(started, { type: "start-recap-frontier", sequence: 90 }),
    ).toBe(started);
  });

  it("never moves the frontier backwards on a stale or repeated dismissal", () => {
    const caught = run([
      { type: "start-recap-frontier", sequence: 40 },
      { type: "acknowledge-recap", throughSequence: 55 },
    ]);
    expect(caught.progress.recapFrontier).toBe(55);
    expect(
      shellReducer(caught, { type: "acknowledge-recap", throughSequence: 55 }),
    ).toBe(caught);
    expect(
      shellReducer(caught, { type: "acknowledge-recap", throughSequence: 41 }),
    ).toBe(caught);
  });

  it("restores a record written before progress existed as a life already under way", () => {
    const restored = shellReducer(INITIAL_SHELL_STATE, {
      type: "restore",
      pins: [],
      preferences: DEFAULT_PREFERENCES,
    });
    expect(restored.progress).toEqual(LEGACY_INTERFACE_PROGRESS);
  });
});

/**
 * CRUNCH47 A1 — what Back means, and what is waiting when it lands.
 *
 * The recorded defect: a household conversation started from People, then
 * Politics and its Issues and budget tab, then ONE press of the workspace's
 * Back left the player on the tab they had passed through on the way in. Two
 * levels had been stacked for one workspace, because a tab dispatched the same
 * action a menu entry does.
 */
describe("the workspace, its tabs, and a conversation waiting in the room", () => {
  const HOUSEHOLD = "household-obligation" as const;

  /** People, then a conversation in the room with somebody from that list. */
  function pendingFromPeople(): ShellState {
    return run([
      { type: "go-to-surface", surface: "people" },
      { type: "set-conversation", subject: HOUSEHOLD, addressee: ALICE },
      { type: "talk-in-scene", personId: ALICE },
    ]);
  }

  it("switches a Politics tab without adding a level to come back through", () => {
    const hub = run([
      { type: "go-to-surface", surface: "work", section: "campaign" },
    ]);
    expect(hub.history).toHaveLength(2);

    const issues = shellReducer(hub, {
      type: "go-to-subroute",
      surface: "politics",
    });
    expect(activeView(issues)).toEqual({ surface: "politics" });
    expect(issues.history).toHaveLength(2);

    const transit = shellReducer(issues, {
      type: "go-to-subroute",
      surface: "transit",
    });
    expect(activeView(transit)).toEqual({ surface: "transit" });
    expect(transit.history).toHaveLength(2);

    // And one Back leaves the hub rather than walking the tabs backwards.
    expect(activeView(shellReducer(transit, { type: "back" }))).toEqual({
      surface: "scene",
    });
  });

  it("still adds a level for a menu entry, so Back returns to the last place", () => {
    const state = run([
      { type: "go-to-surface", surface: "politics" },
      { type: "go-to-surface", surface: "news" },
    ]);
    expect(state.history).toHaveLength(3);
    expect(activeView(shellReducer(state, { type: "back" }))).toEqual({
      surface: "politics",
    });
  });

  it("brings one Back from a Politics tab to the conversation still waiting", () => {
    const browsing = run(
      [
        { type: "go-to-surface", surface: "work", section: "campaign" },
        { type: "go-to-subroute", surface: "politics" },
      ],
      pendingFromPeople(),
    );
    expect(conversationSuspended(browsing)).toBe(true);
    expect(browsing.conversation).toEqual({
      subject: HOUSEHOLD,
      addressee: ALICE,
    });

    const back = shellReducer(browsing, { type: "back" });
    expect(activeView(back)).toEqual({ surface: "scene" });
    // The same conversation, not a new one: nothing about it was discarded.
    expect(back.conversation).toEqual(browsing.conversation);
    expect(conversationSuspended(back)).toBe(false);
  });

  it("returns to the waiting conversation without discarding the way there", () => {
    const browsing = run(
      [{ type: "go-to-surface", surface: "politics" }],
      pendingFromPeople(),
    );
    const resumed = shellReducer(browsing, { type: "resume-conversation" });
    expect(activeView(resumed)).toEqual({ surface: "scene" });
    expect(resumed.conversation).toEqual(browsing.conversation);
    // People is still underneath, so the next Back behaves as it always did.
    expect(activeView(shellReducer(resumed, { type: "back" }))).toEqual({
      surface: "people",
    });
  });

  it("does nothing on a return with no conversation to return to", () => {
    const browsing = run([{ type: "go-to-surface", surface: "politics" }]);
    expect(shellReducer(browsing, { type: "resume-conversation" })).toBe(
      browsing,
    );
  });

  it("ends a conversation once, and says so by identity", () => {
    const ended = shellReducer(pendingFromPeople(), {
      type: "end-conversation",
    });
    expect(ended.conversation).toBeNull();
    expect(shellReducer(ended, { type: "end-conversation" })).toBe(ended);
  });

  it("keeps a drilldown's own parent, so Back returns to the list it came from", () => {
    const state = run([
      { type: "go-to-surface", surface: "politics" },
      { type: "open-entity", ref: bill },
    ]);
    expect(state.history).toHaveLength(3);
    expect(activeView(shellReducer(state, { type: "back" }))).toEqual({
      surface: "politics",
    });
  });

  it("drops a drilldown when a tab of the workspace under it is pressed", () => {
    // The tab belongs to the hub below the record, not to the record.
    const state = run([
      { type: "go-to-surface", surface: "politics" },
      { type: "open-entity", ref: bill },
      { type: "go-to-subroute", surface: "government" },
    ]);
    expect(activeView(state)).toEqual({ surface: "government" });
    expect(state.history).toEqual([
      { surface: "scene" },
      { surface: "government" },
    ]);
  });

  it("never replaces the room at the base with a subroute", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, {
      type: "go-to-subroute",
      surface: "politics",
    });
    expect(state.history).toEqual([
      { surface: "scene" },
      { surface: "politics" },
    ]);
  });

  it("never replaces the room a conversation is waiting in either", () => {
    // Started from People, so the room the line waits on is a pushed level.
    const waiting = pendingFromPeople();
    expect(activeView(waiting)).toEqual({ surface: "scene" });

    const state = shellReducer(waiting, {
      type: "go-to-subroute",
      surface: "politics",
    });
    // The room is still under it, so one Back still lands on the conversation.
    expect(activeView(shellReducer(state, { type: "back" }))).toEqual({
      surface: "scene",
    });
    expect(shellReducer(state, { type: "back" }).conversation).toEqual(
      waiting.conversation,
    );
  });

  it("closes one transient layer at a time, and the workspace last", () => {
    const layered = run([
      { type: "go-to-surface", surface: "people" },
      { type: "open-quick-dossier", personId: BOB },
      { type: "toggle-pin", ref: person },
      // Asking to leave clears a pin menu, so the question is opened first.
      { type: "ask-leave" },
      { type: "toggle-pin-menu", key: refKey(person) },
    ]);

    const noQuestion = shellReducer(layered, { type: "escape" });
    expect(noQuestion.confirmingLeave).toBe(false);
    expect(noQuestion.activePinMenuKey).toBe(refKey(person));

    const noPinMenu = shellReducer(noQuestion, { type: "escape" });
    expect(noPinMenu.activePinMenuKey).toBeNull();
    expect(noPinMenu.quickDossierPersonId).toBe(BOB);

    const noCard = shellReducer(noPinMenu, { type: "escape" });
    expect(noCard.quickDossierPersonId).toBeNull();
    expect(activeView(noCard)).toEqual({ surface: "people" });

    const menu = shellReducer(noCard, { type: "toggle-navigation" });
    const noMenu = shellReducer(menu, { type: "escape" });
    expect(noMenu.navigation).toBe("closed");
    expect(activeView(noMenu)).toEqual({ surface: "people" });

    const closed = shellReducer(noMenu, { type: "escape" });
    expect(activeView(closed)).toEqual({ surface: "scene" });
    expect(shellReducer(closed, { type: "escape" }).navigation).toBe("primary");
  });

  it("leaves the conversation alone when Escape closes the workspace over it", () => {
    const browsing = run(
      [{ type: "go-to-surface", surface: "politics" }],
      pendingFromPeople(),
    );
    const escaped = shellReducer(browsing, { type: "escape" });
    expect(activeView(escaped)).toEqual({ surface: "scene" });
    expect(escaped.conversation).toEqual(browsing.conversation);
  });
});
