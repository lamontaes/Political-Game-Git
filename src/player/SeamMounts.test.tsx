import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000 });

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { askToMeet, projectContacts } from "../presentation/people-contacts";
import { projectRecallCards } from "../presentation/people-recall-cards";
import { projectChildhoodMoment } from "../presentation/childhood";
import { projectDisclosure } from "../presentation/press-disclosure";
import { recalledRequests } from "../simulation/people-recall";
import type { EntityId, World } from "../simulation";
import { ChildhoodMomentPanel } from "./ChildhoodMomentPanel";
import { availablePlayerConversations } from "../presentation/player-conversation";
import { ContactDialog } from "./ContactDialog";
import { ContactsPanel } from "./ContactsPanel";
import { ConversationStarters, SceneConversation } from "./SceneConversation";
import { PressSourceDesk } from "./PressSourceDesk";
import { RecallCardsPanel } from "./RecallCardsPanel";

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

function adultLife(seed: string): Life {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
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
/** The same life after asking somebody to meet, which closes a channel. */
let asked: Life;

beforeAll(() => {
  adult = adultLife("ui47-seam-mounts");
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

  it("draws an unavailable channel as its stated reason", () => {
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
      expect(html).toContain(channel.note!);
      // Its reason, not a control that would fail if pressed.
      expect(html).not.toContain(`<button type="button" data-testid="${id}"`);
    }
  });

  it("holds a request inside the day window with a plain When? picker", () => {
    const view = projectContacts(adult.world, adult.personId);
    const html = contacts(adult);
    const first = view.contacts[0]!;
    const ask = first.actions.find((action) => action.kind === "ask-to-meet")!;
    /*
     * The playtest: a sentence stating the window, and a caption reciting it
     * again, read as the game's rules rather than the character's question.
     * The window is the input's min and max; the label is the question.
     */
    expect(html).not.toContain('data-testid="contacts-meeting-window"');
    expect(html).not.toContain("A meeting can be arranged");
    expect(html).not.toContain(`A day between ${view.earliestMeetingSpoken}`);
    if (ask.available) {
      expect(html).toContain(`data-testid="contact-ask-${first.personId}"`);
      expect(html).toContain("<span>When?</span>");
      expect(html).toContain(`min="${view.earliestMeetingOn}"`);
      expect(html).toContain(`max="${view.latestMeetingOn}"`);
    } else {
      expect(html).toContain(
        `data-testid="contact-ask-unavailable-${first.personId}"`,
      );
      expect(html).toContain(ask.unavailableReason!);
    }
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
    if (first.lastContactSpoken) {
      expect(html).toContain(
        `<p class="pg-contact-line">Last in touch ${first.lastContactSpoken}.`,
      );
    }
  });

  it("opens one person's contact as its own screen", () => {
    const first = projectContacts(adult.world, adult.personId).contacts[0]!;
    const html = renderToStaticMarkup(
      <ContactDialog
        world={adult.world}
        playerPersonId={adult.personId}
        personId={first.personId}
        onWorldChange={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toContain('data-testid="contact-dialog"');
    expect(html).toContain(`>${first.name}</h2>`);
    expect(html).toContain('data-testid="contact-dialog-close"');
    // Its own ids, so the People list underneath is never mistaken for it.
    expect(html).toContain(`data-testid="contact-focus-${first.personId}"`);
    expect(html).not.toContain(`data-testid="contact-${first.personId}"`);
    // Only that person.
    for (const other of projectContacts(adult.world, adult.personId).contacts)
      if (other.personId !== first.personId)
        expect(html).not.toContain(`contact-focus-${other.personId}"`);
  });

  it("says whose turn it is once a request is outstanding", () => {
    const view = projectContacts(asked.world, asked.personId);
    const waiting = view.contacts.find(
      (contact) => contact.outstanding?.direction === "you-asked",
    );
    expect(waiting).toBeTruthy();
    const ask = waiting!.actions.find(
      (action) => action.kind === "ask-to-meet",
    )!;
    expect(ask.available).toBe(false);
    const html = contacts(asked);
    // No second ask while the first is unanswered; the reason stands in place
    // of the control.
    expect(html).not.toContain(
      `data-testid="contact-ask-${waiting!.personId}"`,
    );
    expect(html).toContain(
      `data-testid="contact-ask-unavailable-${waiting!.personId}"`,
    );
    expect(html).toContain(ask.unavailableReason!);
  });
});

describe("Conversations in People", () => {
  function starters(presentPersonIds: readonly EntityId[]) {
    return renderToStaticMarkup(
      <ConversationStarters
        world={adult.world}
        personId={adult.personId}
        presentPersonIds={presentPersonIds}
        onStart={() => {}}
      />,
    );
  }

  it("never says somebody is here who the room does not hold", () => {
    const available = availablePlayerConversations(
      adult.world,
      adult.personId,
    ).filter((entry) => entry.room.eligibleAddresseePersonIds.length > 0);
    expect(available.length).toBeGreaterThan(0);
    // Nobody in the room: nothing is offered under "here".
    const alone = starters([]);
    expect(alone).not.toContain("Talk to somebody here");
    expect(alone).toContain("From people who are not here");
    expect(alone).not.toContain('data-here="true"');
    for (const entry of available)
      expect(alone).toContain(
        `data-testid="conversation-start-${entry.subject}"`,
      );
    // The same people standing in the room: "here" is true of them.
    const everyone = [
      ...new Set(
        available.flatMap((entry) => entry.room.eligibleAddresseePersonIds),
      ),
    ];
    const together = starters(everyone);
    expect(together).toContain("Talk to somebody here");
    expect(together).not.toContain("From people who are not here");
  });
});

describe("A conversation with somebody who is not in the room", () => {
  function opened(presentPersonIds: readonly EntityId[]) {
    const entry = availablePlayerConversations(
      adult.world,
      adult.personId,
    ).find(
      (candidate) => candidate.room.eligibleAddresseePersonIds.length > 0,
    )!;
    const other = entry.room.eligibleAddresseePersonIds[0]!;
    const html = renderToStaticMarkup(
      <SceneConversation
        world={adult.world}
        playerPersonId={adult.personId}
        subject={entry.subject}
        addressee={other}
        onWorldChange={() => {}}
        onChange={() => {}}
        onBack={() => {}}
        presentPersonIds={presentPersonIds}
      />,
    );
    return { html, other };
  }

  it("is a phone call, not somebody standing here", () => {
    const { html, other } = opened([]);
    expect(html).toContain('data-testid="talk-remote"');
    expect(html).toMatch(
      new RegExp(`data-remote="true"[^>]*data-testid="talk-face-${other}"`),
    );
  });

  it("is face to face when they are in the room", () => {
    const first = opened([]);
    const { html, other } = opened([first.other]);
    expect(html).not.toContain('data-testid="talk-remote"');
    expect(html).toMatch(
      new RegExp(`data-remote="false"[^>]*data-testid="talk-face-${other}"`),
    );
  });
});

describe("What you remember", () => {
  it("shows a card with the day said the way a person says it", () => {
    // An ordinary life opens with somebody having asked for something, so
    // there is a real request to remember rather than a built one.
    expect(
      recalledRequests(adult.world, adult.personId).length,
    ).toBeGreaterThan(0);
    const cards = projectRecallCards(adult.world, adult.personId);
    expect(cards.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      <RecallCardsPanel
        world={adult.world}
        personId={adult.personId}
        onOpenEntity={() => {}}
      />,
    );
    expect(html).toContain('data-testid="recall-cards"');
    expect(html).not.toContain('data-testid="recall-cards-empty"');
    const card = cards[0]!;
    expect(html).toContain(`data-testid="recall-card-${card.eventId}"`);
    expect(html).toContain(card.onSpoken);
    expect(html).toContain(card.detail);
    // The ISO `on` is a sort key. It is never what a player reads.
    expect(html).not.toContain(`>${card.on}<`);
    if (card.otherPersonId) {
      // The drilldown opens the shell's own person view, and because that
      // pushes onto the navigation stack, Back returns to this card.
      expect(html).toContain(`data-testid="recall-open-${card.eventId}"`);
    }
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
    expect(html).toContain(view.note);
    // Appearing in this list is not acquaintance, and is never called one.
    expect(html).toContain("not people you know");
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

  it("with no reporter to take anything to, says so", () => {
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
    expect(html).toContain(
      "No reporter here is covering anything you could take to them.",
    );
  });
});
