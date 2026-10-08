import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000 });

import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
} from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { projectContacts } from "../presentation/people-contacts";
import { askToMeet } from "../../tests/support/contact-fixtures";
import { recordHomePresence } from "../../tests/support/home-presence-fixture";
import { drawRandomPlace } from "../../tests/support/random-place";
import { projectChildhoodMoment } from "../presentation/childhood";
import { projectDisclosure } from "../presentation/press-disclosure";
import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import { ChildhoodMomentPanel } from "./ChildhoodMomentPanel";
import { recordedRoomPresence } from "../presentation/recorded-room-presence";
import { projectPlayedSceneExchange } from "../presentation/scene-conversation";
import { ContactsPanel } from "./ContactsPanel";
import { ConversationStarters, SceneConversation } from "./SceneConversation";
import { PressSourceDesk } from "./PressSourceDesk";

/**
 * The PEOPLE/PRESS seam mounts, as markup (CRUNCH47 A1).
 *
 * These prove what a mount is responsible for and nothing more: that the
 * adapter's own words reach the screen, that an unavailable channel or
 * arrangement is its stated reason rather than a control, that a childhood
 * moment is watched or chosen according to the producer's answer, and that an
 * empty projection draws an honest sentence rather than an empty list.
 *
 * What the adapters themselves decide is proved against them, in
 * `presentation/people-contacts.test.ts`, `presentation/childhood.test.ts` and
 * `presentation/press-disclosure.test.ts`. Pointer and keyboard activation of
 * these controls stays a browser proof and is not claimed here.
 */

interface Life {
  readonly world: World;
  readonly personId: EntityId;
}

/** An adult in a place drawn at random from all 56, named by the seed. */
function adultLife(seed: string): Life {
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
    }),
  ).game!;
  console.info("SEAM_MOUNTS_ADULT", {
    seed,
    placeKey: place.key,
    place: place.displayName,
    worldId: game.world.id,
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

function sharedHomeLife(seed: string): Life {
  const place = drawRandomPlace(seed);
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: place.key,
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  const personId = game.playerPersonId;
  return {
    world: recordHomePresence(openOrdinaryLife(game.world, personId), personId),
    personId,
  };
}

function childLife(seed: string, startAge: number): Life {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge,
      depth: "play-formative-years",
    }),
  ).game!;
  return { world: game.world, personId: game.playerPersonId };
}

function contacts(life: Life) {
  return renderToStaticMarkup(
    <ContactsPanel
      world={life.world}
      personId={life.personId}
      onWorldChange={() => {}}
    />,
  );
}

let adult: Life;
/**
 * A life with somebody at home, recorded as in the room. A home conversation
 * needs the people recorded there (`recordedRoomPresence`); a generated adult
 * often lives alone and no authored scene records it any more (EN-1), so this
 * is the explicit shared-home start with the household's presence recorded by
 * the fixture. The place is drawn at random from all 56 and named by the seed.
 */
let scened: Life;
/** The same life after asking somebody to meet, which closes a channel. */
let asked: Life;

beforeAll(() => {
  adult = adultLife("ui47-seam-mounts");
  scened = sharedHomeLife("ui47-seam-mounts-home");
  const view = projectContacts(adult.world, adult.personId);
  const other = view.contacts[0]!;
  asked = {
    world: askToMeet(adult.world, {
      personId: adult.personId,
      otherPersonId: other.personId,
      on: view.earliestMeetingOn,
    }),
    personId: adult.personId,
  };
}, 300_000);

describe("Getting in touch", () => {
  it("draws a usable channel plainly, and never as a control", () => {
    const view = projectContacts(adult.world, adult.personId);
    expect(view.contacts.length).toBeGreaterThan(0);
    const html = contacts(adult);
    expect(html).toContain('data-testid="contacts"');
    expect(html).not.toContain('data-testid="contacts-empty"');

    const usable = view.contacts
      .flatMap((contact) =>
        contact.channels.map((channel) => ({ contact, channel })),
      )
      .filter((pair) => pair.channel.note === null);
    expect(usable.length).toBeGreaterThan(0);
    for (const { contact, channel } of usable) {
      const id = `contact-channel-${contact.personId}-${channel.kind}`;
      expect(html).toContain(`data-testid="${id}"`);
      expect(html).toContain(channel.label);
      /*
       * The seam has no per-channel command — its commands are asking,
       * answering and offering another day — so a pressable "Call them" would
       * be a promise the game cannot keep. No channel is a button.
       */
      expect(html).not.toContain(`<button type="button" data-testid="${id}"`);
    }
  });

  it("draws an unavailable channel as blocked, never as a control", () => {
    /*
     * Asking somebody to meet is what closes a channel: until they answer, the
     * seam reports it unavailable and says why. That is a real state reached
     * through a real command, not a hand-built view.
     */
    const view = projectContacts(asked.world, asked.personId);
    const blocked = view.contacts
      .flatMap((contact) =>
        contact.channels.map((channel) => ({ contact, channel })),
      )
      .filter((pair) => pair.channel.note !== null);
    expect(blocked.length).toBeGreaterThan(0);
    const html = contacts(asked);
    for (const { contact, channel } of blocked) {
      const id = `contact-channel-${contact.personId}-${channel.kind}`;
      expect(html).toContain(`data-testid="${id}"`);
      expect(channel.note).toBeTruthy();
      // Blocked, with the adapter's reason kept as data (menu reset MR-6),
      // not a control that would fail if pressed.
      expect(html).toMatch(
        new RegExp(`<li data-blocked="true"[^>]*data-testid="${id}"`),
      );
      expect(html).not.toContain(`<button type="button" data-testid="${id}"`);
    }
  });

  it("holds a request inside the day window with a plain When? picker", () => {
    const view = projectContacts(adult.world, adult.personId);
    const html = contacts(adult);
    const first = view.contacts[0]!;
    /*
     * The playtest: a sentence stating the window, and a caption reciting it
     * again, read as the game's rules rather than the character's question.
     * The window is the input's min and max; the label is the question.
     */
    expect(html).not.toContain('data-testid="contacts-meeting-window"');
    expect(html).not.toContain("A meeting can be arranged");
    expect(html).not.toContain(`A day between ${view.earliestMeetingSpoken}`);
    // The meeting question and its date picker are gone from the screen.
    expect(html).not.toContain(`data-testid="contact-ask-${first.personId}"`);
    expect(html).not.toContain("<span>When?</span>");
    expect(html).not.toContain(
      `data-testid="contact-ask-unavailable-${first.personId}"`,
    );
  });

  it("carries no design commentary, and gives each part of a row its own line", () => {
    const html = contacts(adult);
    // Commentary about the system, not something the character knows.
    expect(html).not.toContain("is not a promise");
    expect(html).not.toContain("Asking costs no time");
    const first = projectContacts(adult.world, adult.personId).contacts[0]!;
    // The name is its own element, never run into what follows it.
    expect(html).toContain(
      `<strong class="pg-contact-name">${first.name}</strong>`,
    );
    if (first.lastContactSpoken && !first.livesWithYou) {
      // The recorded day under its control name, not a sentence.
      expect(html).toContain(
        `<span class="pg-contact-label">Last in touch</span> ${first.lastContactSpoken}</p>`,
      );
    }
  });

  it("says whose turn it is once a request is outstanding", () => {
    const view = projectContacts(asked.world, asked.personId);
    const waiting = view.contacts.find(
      (contact) => contact.outstanding?.direction === "you-asked",
    );
    expect(waiting).toBeTruthy();
    expect(
      waiting!.actions.some((action) => action.kind === "ask-to-meet"),
    ).toBe(false);
    const html = contacts(asked);
    // No ask control and no ask line, whether or not one is outstanding.
    expect(html).not.toContain(
      `data-testid="contact-ask-${waiting!.personId}"`,
    );
    expect(html).not.toContain(
      `data-testid="contact-ask-unavailable-${waiting!.personId}"`,
    );
  });
});

describe("Conversations in People", () => {
  function starters(life: Life) {
    return renderToStaticMarkup(
      <ConversationStarters
        world={life.world}
        personId={life.personId}
        presentPersonIds={[]}
        onStart={() => {}}
      />,
    );
  }

  /** The people the recorded room holds, who can be spoken to as scene exchanges. */
  function recordedHere(life: Life): readonly EntityId[] {
    return (recordedRoomPresence(life.world, life.personId)?.personIds ?? [])
      .filter((id) => id !== life.personId)
      .filter((id) =>
        projectPlayedSceneExchange(life.world, life.personId, id),
      );
  }

  it("offers exactly the people the room records, by name", () => {
    const here = recordedHere(scened);
    expect(here.length).toBeGreaterThan(0);
    const html = starters(scened);
    expect(html).toContain("People here");
    for (const id of here)
      expect(html).toContain(personName(scened.world.people[id]!));
    // The prop a caller passes does not add anybody: there is no second list
    // of "people who are not here".
    expect(html).not.toContain("From people who are not here");
  });

  it("offers nobody when the room records nobody, and never somebody far away", () => {
    // A life whose room has no recorded people: nobody is offered, and the
    // people the life knows elsewhere are not stood in for them.
    expect(recordedHere(adult)).toHaveLength(0);
    const html = starters(adult);
    expect(html).not.toContain("People here");
    expect(html).not.toContain("From people who are not here");
    expect(html).not.toContain('data-testid="conversations"');
  });
});

describe("A conversation is only with somebody in the room", () => {
  function opened(life: Life) {
    const other = recordedRoomPresence(
      life.world,
      life.personId,
    )!.personIds.find(
      (id) =>
        id !== life.personId &&
        projectPlayedSceneExchange(life.world, life.personId, id),
    )!;
    const html = renderToStaticMarkup(
      <SceneConversation
        world={life.world}
        playerPersonId={life.personId}
        subject="life-talk"
        addressee={other}
        onWorldChange={() => {}}
        onChange={() => {}}
        onBack={() => {}}
        presentPersonIds={[]}
      />,
    );
    return { html, other };
  }

  it("is face to face, with nothing drawn as a phone call", () => {
    const { html } = opened(scened);
    expect(html).toContain('data-testid="scene-conversation"');
    expect(html).not.toContain('data-testid="talk-remote"');
    expect(html).not.toContain("On the phone");
    expect(html).not.toContain('data-remote="true"');
  });
});

describe("A childhood moment", () => {
  it("is watched at an age the producer says is caregiver-led", () => {
    const child = childLife("ui47-seam-childhood-watch", 6);
    const moment = projectChildhoodMoment(child.world, child.personId);
    expect(moment).toBeTruthy();
    expect(moment!.action).toBe("watch");
    const html = renderToStaticMarkup(
      <ChildhoodMomentPanel
        world={child.world}
        personId={child.personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain('data-testid="childhood-moment"');
    expect(html).toContain('data-action="watch"');
    expect(html).toContain('data-testid="childhood-moment-watch"');
    expect(html).toContain(moment!.actionLabel);
    expect(html).toContain(moment!.note!);
    // At this age the adult decides, so no option is offered to the player.
    expect(html).not.toContain('data-testid="childhood-moment-choices"');
  });

  it("is chosen at an age the producer says is the young person's own", () => {
    const teen = childLife("ui47-seam-childhood-choose", 16);
    const moment = projectChildhoodMoment(teen.world, teen.personId);
    expect(moment).toBeTruthy();
    expect(moment!.action).toBe("choose");
    expect(moment!.scene).toBeTruthy();
    const html = renderToStaticMarkup(
      <ChildhoodMomentPanel
        world={teen.world}
        personId={teen.personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain('data-action="choose"');
    expect(html).toContain('data-testid="childhood-moment-choices"');
    expect(html).not.toContain('data-testid="childhood-moment-watch"');
    for (const option of moment!.scene!.options) {
      expect(html).toContain(
        `data-testid="childhood-moment-choose-${option.key}"`,
      );
      expect(html).toContain(option.label);
    }
  });

  it("draws nothing at all outside the formative years", () => {
    // The producer gates the years. This mount adds no age logic of its own,
    // so where there is no moment there is no section.
    expect(projectChildhoodMoment(adult.world, adult.personId)).toBeNull();
    expect(
      renderToStaticMarkup(
        <ChildhoodMomentPanel
          world={adult.world}
          personId={adult.personId}
          onWorldChange={() => {}}
        />,
      ),
    ).toBe("");
  });
});

describe("The press desk", () => {
  it("names reporters at outlets, and claims no relationship with them", () => {
    const view = projectDisclosure(adult.world, adult.personId);
    expect(view.contacts.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      <PressSourceDesk
        world={adult.world}
        personId={adult.personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain('data-testid="press-source-desk"');
    expect(html).not.toContain(view.note);
    expect(html).not.toContain("not people you know");
    expect(html).not.toMatch(/covers [a-z-]+/);
    expect(html).not.toContain('data-testid="press-source-empty"');
    const contact = view.contacts[0]!;
    expect(html).toContain(
      `data-testid="press-source-${contact.reporterPersonId}"`,
    );
    expect(html).toContain(contact.reporterName);
    expect(html).toContain(contact.outletName);
    // Nothing is said by arriving here: the exchange opens on a press.
    expect(html).not.toContain(
      `data-testid="press-tell-${contact.reporterPersonId}"`,
    );
  });

  it("with no reporter to take anything to, shows an empty list", () => {
    /*
     * The press family reads `history.pressRecords`, so a world with none is a
     * world with no outlet and no reporter — the honest empty state rather
     * than a hand-built view.
     */
    const empty: World = {
      ...adult.world,
      history: { ...adult.world.history, pressRecords: [] },
    };
    expect(projectDisclosure(empty, adult.personId).contacts).toHaveLength(0);
    const html = renderToStaticMarkup(
      <PressSourceDesk
        world={empty}
        personId={adult.personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain('data-testid="press-source-empty"');
    expect(html).not.toContain("No reporter here is covering");
  });
});
