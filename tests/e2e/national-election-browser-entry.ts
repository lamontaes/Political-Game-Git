import React from "react";
import { createRoot } from "react-dom/client";
import { NationalElectionResults } from "../../src/player/NationalElectionResults";
import { fixtureWorld, electionId } from "./national-election-browser-fixture";
const state = window as unknown as { __s30Before: string; __s30World: unknown };
state.__s30Before = JSON.stringify(fixtureWorld);
state.__s30World = fixtureWorld;
createRoot(document.getElementById("root")!).render(
  React.createElement(NationalElectionResults, {
    world: fixtureWorld,
    electionId,
  }),
);
