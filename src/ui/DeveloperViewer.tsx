import { useState } from "react";

import {
  DEFAULT_CORPUS_VERSION,
  DEFAULT_DEMO_SEED,
  DEFAULT_PERSON_GENERATOR_VERSION,
  advanceDemoWorld,
  createDemoWorld,
  createGeneratedWorld,
  materializePerson,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { EventHistory } from "./EventHistory";
import { PeopleList } from "./PeopleList";
import { PersonInspector } from "./PersonInspector";
import { WorldControls } from "./WorldControls";
import { WorldSummary } from "./WorldSummary";

function firstPersonId(world: World): EntityId | null {
  return world.personOrder[0] ?? null;
}

interface ViewerState {
  readonly world: World;
  readonly selectedPersonId: EntityId | null;
  readonly status: string;
}

function getSeedFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("seed");
}

function createInitialViewerState(): ViewerState {
  const seedParam = getSeedFromUrl();
  if (seedParam) {
    const world = createGeneratedWorld(seedParam);
    return {
      world,
      selectedPersonId: firstPersonId(world),
      status: `Created a fresh simulation from seed “${world.seed}” (${DEFAULT_PERSON_GENERATOR_VERSION} / ${DEFAULT_CORPUS_VERSION}).`,
    };
  }
  const world = createDemoWorld(DEFAULT_DEMO_SEED);
  return {
    world,
    selectedPersonId: firstPersonId(world),
    status:
      "Created the initial seeded demo world with six lightweight people.",
  };
}

export function DeveloperViewer() {
  const [{ world, selectedPersonId, status }, setViewerState] =
    useState<ViewerState>(createInitialViewerState);

  const selectedPerson = selectedPersonId
    ? world.people[selectedPersonId]
    : undefined;

  function loadWorld(seed: string) {
    const nextWorld = createGeneratedWorld(seed);
    setViewerState({
      world: nextWorld,
      selectedPersonId: firstPersonId(nextWorld),
      status: `Created a fresh simulation from seed “${nextWorld.seed}” (${DEFAULT_PERSON_GENERATOR_VERSION} / ${DEFAULT_CORPUS_VERSION}).`,
    });
  }

  function newSimulation() {
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    const nextSeed = `sim-${Date.now().toString(36)}-${randomSuffix}`;
    loadWorld(nextSeed);
  }

  function advanceTime() {
    setViewerState((current) => {
      const previousEventCount = current.world.history.events.length;
      const nextWorld = advanceDemoWorld(current.world, 7);
      const newEventCount =
        nextWorld.history.events.length - previousEventCount;

      return {
        ...current,
        world: nextWorld,
        status: `Advanced 7 days to ${nextWorld.currentDate}; ${newEventCount} events were recorded.`,
      };
    });
  }

  function expandSelectedPerson() {
    setViewerState((current) => {
      if (!current.selectedPersonId) {
        return current;
      }

      const nextWorld = materializePerson(
        current.world,
        current.selectedPersonId,
      );
      return {
        ...current,
        world: nextWorld,
        status:
          nextWorld === current.world
            ? "That person was already materialized; no facts or history changed."
            : "Materialized deterministic person detail without changing established facts or history.",
      };
    });
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Simulation foundation · Developer tooling</p>
          <h1>Political Life Simulation</h1>
          <p className="lede">
            Inspect a reproducible world, its persistent people, and the history
            they create.
          </p>
        </div>
        <div className="developer-viewer-actions">
          <a className="back-to-player" href="/">
            Return to player view
          </a>
          <span className="build-badge">Foundation build</span>
        </div>
      </header>

      <aside className="placeholder-notice" role="note">
        <strong>Synthetic placeholder data.</strong> All people and events are
        generated fixtures. Lexington-Fayette is the initial test jurisdiction;
        no sourced civic dataset is loaded.
      </aside>

      <WorldControls
        world={world}
        onLoad={loadWorld}
        onNewSimulation={newSimulation}
        onAdvance={advanceTime}
      />
      <p
        className="action-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status}
      </p>

      <WorldSummary world={world} />

      <div className="viewer-grid">
        <PeopleList
          world={world}
          selectedPersonId={selectedPersonId}
          onSelect={(personId) =>
            setViewerState((current) => ({
              ...current,
              selectedPersonId: personId,
            }))
          }
        />
        <PersonInspector
          world={world}
          person={selectedPerson}
          onMaterialize={expandSelectedPerson}
        />
        <EventHistory world={world} />
      </div>
    </main>
  );
}
