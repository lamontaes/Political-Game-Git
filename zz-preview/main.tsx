import { createRoot } from "react-dom/client";
import { useRef } from "react";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../src/presentation/new-game";
import { placeBackdropPeople } from "../src/presentation/backdrop-people";
import { placeBackdrop } from "../src/presentation/place-backdrops";
import { PlacePeopleLayer } from "../src/player/PlacePeopleLayer";
import { addDays, simulationMomentOnLocalDate } from "../src/simulation/dates";
import staging from "../art/backdrops/staging.json";

const game = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "people-at-work",
    placeKey: "2146027",
    startAge: 24,
    questionnaire: "skipped",
  }),
).game!;
const world = game.world;
let date = world.currentDate;
while (new Date(`${date}T12:00:00Z`).getUTCDay() !== 2) date = addDays(date, 1);
const moment = {
  ...simulationMomentOnLocalDate(world.currentMoment, date),
  minuteOfDay: 10 * 60,
};

function Cell({ place }: { place: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const people = placeBackdropPeople(world, game.playerPersonId, place, moment);
  const bg = placeBackdrop(place, moment, "dry-key");
  return (
    <div className="cell" ref={ref} data-place={place}>
      <img className="bg" src={bg?.url} />
      <PlacePeopleLayer people={people} stageRef={ref} />
      <span className="lbl">
        {place}: {people.map((p) => p.title).join(", ") || "nobody on shift"}
      </span>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <div>
    {Object.keys(staging.places).map((p) => (
      <Cell key={p} place={p} />
    ))}
  </div>,
);
