import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";
import { PlacePeopleLayer } from "../../../src/player/PlacePeopleLayer";
import { placeBackdropPeople } from "../../../src/presentation/backdrop-people";
import { middayBackdropUrl } from "../../../src/presentation/place-backdrops";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../../src/presentation/new-game";
import { drawRandomPlace } from "../../support/random-place";

const seed = "session11-seating-oct5";
const place = drawRandomPlace(seed);
const opened = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    questionnaire: "skipped",
  }),
);
if (!opened.game) throw new Error("The random-place game did not open.");
const { world, playerPersonId } = opened.game;
const rooms = [
  "council-chamber",
  "office",
  "diner",
  "classroom",
  "county-courtroom",
  "small-apartment",
  "store",
];
// Explicit developer placement controls use real generated identities. This is
// contact/scale evidence, not a claim that these people visited all six rooms.
const present = Object.values(world.people)
  .filter((person) => person.id !== playerPersonId && person.appearance)
  .slice(
    0,
    Math.max(
      ...rooms.map(
        (room) => placeBackdropPeople(world, playerPersonId, room).length,
      ),
    ) + rooms.length,
  )
  .map((person) => ({ personId: person.id }));
function Proof() {
  const [room, setRoom] = useState(rooms[0]!);
  const [selected, setSelected] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const people = placeBackdropPeople(
    world,
    playerPersonId,
    room,
    world.currentMoment,
    room === "store"
      ? present.slice(0, 2).map((person, index) => ({
          ...person,
          title: index === 0 ? "Customer" : "Cashier",
        }))
      : present,
  );
  return (
    <main
      data-testid="seating-room-proof"
      data-world-seed={seed}
      data-world-id={world.id}
      data-controlled-cashier-id={
        room === "store" ? present[1]!.personId : undefined
      }
    >
      <header
        style={{ background: "#151515", color: "white", padding: "0.5rem" }}
      >
        Room placement proof · {place.displayName} · {seed}
        {room === "store" ? " · controlled cashier/customer roles" : ""}
        <select
          aria-label="Room"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
        >
          {rooms.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <span data-testid="placed-count">{people.length}</span> drawn,{" "}
        <span data-testid="overflow-count">{people.overflow.length}</span>{" "}
        listed
        <output data-testid="selected-person">{selected}</output>
      </header>
      <div
        ref={stage}
        style={{
          position: "relative",
          height: "calc(100vh - 40px)",
          overflow: "hidden",
        }}
      >
        <img
          src={middayBackdropUrl(room)!}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 62%",
          }}
        />
        <PlacePeopleLayer
          people={people}
          stageRef={stage}
          onSelectPerson={setSelected}
          selectedPersonId={selected}
          nameplates
        />
      </div>
    </main>
  );
}
document.body.style.margin = "0";
createRoot(document.getElementById("root")!).render(<Proof />);
