# Architecture

## Purpose

The architecture supports a desktop-first persistent political-life simulation whose world can run autonomously, headlessly, and reproducibly. The first build establishes boundaries and invariants, not the complete game.

## Dependency Direction

```text
React viewer (src/ui, src/App.tsx)
                 |
                 v
Pure simulation API (src/simulation/index.ts)
                 |
                 v
Domain state + deterministic transitions + history

Node desktop adapter (src/persistence)
                 |
                 v
          SQLite snapshots
```

- `src/simulation/` contains JSON-safe domain types, deterministic utilities, world operations, history, progressive person generation, and the demo scenario.
- `src/persistence/` contains Node-only durable-storage adapters and depends on the public simulation snapshot codec.
- `src/cli/` contains Node-only executable entry points.
- `src/ui/` contains React components that present and invoke the simulation API.
- `src/App.tsx` composes the developer viewer; `src/main.tsx` is the browser entry point.
- `data/snapshots/` is reserved for versioned real-world source material, never live save history.

The UI may depend on the simulation. The simulation must never depend on React, browser globals, UI state, SQLite drivers, paid APIs, or graphical execution.

## Simulation Boundary

The simulation owns world state and all transitions. UI code submits explicit actions and reads returned state; it does not directly invent domain facts.

The initial domain includes:

- a JSON-safe `World` with a stable ID, normalized seed, current simulated date, entities, action sequence, generator version, and history;
- stable-ID `Person` and `Jurisdiction` entities;
- lightweight and materialized person detail states;
- immutable typed biography facts for birth, place, residence, family, education, and occupation;
- historical events with unique semantic keys, stable IDs, simulated timestamps, visibility, tags, structured context, typed participants, involved entity references, and explicit person-fact constraints when history owns a biographical dimension;
- distinct append-only memories, event knowledge, claims, and relationship interactions that may disagree without changing canonical truth;
- reusable query helpers over facts, event tags, age, geography, experience, relationship context, and shared work;
- deterministic time advancement and demo occurrence generation.

Names and collection positions are not identity. Entity references use stable IDs. World construction validates and defensively copies caller-owned entity graphs. State-changing transitions return new objects and do not mutate their input world; an idempotent no-op may return the unchanged input object.

## Determinism

For a fixed generator version, the same normalized seed, starting state, and ordered valid actions must produce the same material state and history. Different seeds must vary meaningful generated content, not merely seed metadata.

All stochastic behavior in the simulation passes through `SeededRng`. It combines a pinned seeded algorithm with non-consuming keyed forks. A person materialization stream is derived from the world seed and stable person ID; a time-advance occurrence stream is derived from the seed and time-action sequence. UI selection, render order, or materialization cannot consume randomness that changes later world activity.

Persistent IDs are hashes of explicit stable keys, not random draws, names, or display positions. An event's semantic key is unique within a world, is stored with the event, and determines its ID; action parameters therefore belong in keys when they distinguish occurrences. Event sequence separately records append order.

Future saves must retain schema, generator, and ruleset versions before cross-version replay compatibility is promised. This build promises same-version reproducibility only.

## Time

Simulation dates are validated `YYYY-MM-DD` strings. Calendar arithmetic uses UTC-safe, date-only functions and never local time, locale parsing, or the machine clock. Time advancement is a positive whole-day action. Its system history record makes clock transitions auditable without pretending they are political occurrences.

## Progressive Resolution

A lightweight person has a stable identity and established facts. Materialization adds deterministic, stored background detail without changing the person's ID, name, birth date, home jurisdiction, established facts, simulated date, or history.

Materialization is additive, idempotent, order-independent, and not itself an in-world event. The first materializer checks established fact kinds and explicit person-fact constraints in canonical history; constrained fields remain unknown. Adding a later historical constraint that conflicts with stored generated detail is rejected atomically. Future materializers must retain this contract, leave details unknown when no consistent result is available, and retain the generator version used.

Progressive resolution affects computational detail, not whether an entity has existed historically.

## History

History is append-oriented and is the basis of explanation, archives, memories, relationships, and returning-player briefings. Canonical events, subjective memories, person-specific knowledge, claims, and relationship interactions are separate record families sharing one global sequence. Corrections, disputed claims, inaccurate knowledge, changed interpretations, and later statements are new linked records rather than silent rewrites.

An event's rich context preserves location and setting, participants and roles, visibility, tags, social pressure, choice, motivation, and immediate reaction when known. Knowledge provenance distinguishes direct experience, another person's account, public record, media, and rumor. A claim explicitly records its relationship to historical truth but never changes that truth. Causal graphs, automatic knowledge propagation, and correction records remain future extensions.

Person history in the viewer is a query over the canonical global event store. It is not maintained as a second mutable history.

## Institutions and Geography

Generic code models worlds, jurisdictions, people, and history. Lexington-Fayette-specific facts and rules belong in a jurisdiction definition or sourced snapshot. Institutional rules should eventually be effective-dated so lawful rule changes can occur inside a save.

The product's resolution hierarchy is explicit: Lexington-Fayette is the initial deeply modeled jurisdiction, Kentucky begins at medium resolution, and the United States begins at lower resolution. Those are product targets, not permission to hard-code one jurisdiction's institutions into generic simulation logic.

The first build's Lexington-Fayette jurisdiction is a synthetic placeholder and asserts no detailed real-world civic facts. Kentucky and United States simulation layers are not implemented yet.

## Data Domains and Persistence

Real-world starting data and simulated save history are separate domains:

1. An immutable, sourced snapshot may initialize a new world.
2. The save records exactly which snapshot was used.
3. After initialization, simulated events are authoritative for that save.
4. Updating a repository snapshot never silently rewrites an existing save.

The pure simulation exposes a versioned JSON snapshot codec that validates stable identity, entity ordering, biography invariants, references, and contiguous history sequence at the persistence boundary. A Node-only `SqliteWorldRepository` stores the complete validated snapshot in a strict SQLite table and supports save, load, update, and list operations. SQLite code remains outside `src/simulation/`, so headless domain execution and browser diagnostics do not depend on a storage driver.

This first repository intentionally stores one current snapshot per world rather than prematurely normalizing every domain record into SQL tables. Migration chains, transactional action journaling, branch lineage, recovery policy, and cross-version compatibility remain deferred.

The Vite/Sites static package is only a temporary host for the developer viewer. It is not the desktop product runtime or a persistence-platform decision.

## External Systems

The simulation runs without an LLM, paid model call, network connection, or external AI API. Future optional content assistance must not become a condition of deterministic simulation.

This is an independent work. Proprietary code, assets, text, data extraction, or implementation from _The Political Process_ or any other game is prohibited.
