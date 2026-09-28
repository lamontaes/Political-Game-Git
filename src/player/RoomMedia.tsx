import type { RoomBroadcast, RoomFrontPage } from "../presentation/room-media";
import "./RoomMedia.css";

/**
 * The room's television as a broadcast: the station's bug in a corner, a
 * lower third with its story or its program card, and a thin ticker of the
 * day's headlines. Sized in em against the surface's own font size, so it
 * fills whatever rectangle the scene gives the screen.
 */
export function RoomTelevision({
  broadcast,
}: {
  readonly broadcast: RoomBroadcast;
}) {
  const { station, story, card, ticker } = broadcast;
  const initials = station.name
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word) && word !== "The")
    .map((word) => word[0])
    .join("")
    .slice(0, 3);
  return (
    <div
      className={`room-tv room-tv--look-${station.look}`}
      data-testid="room-tv"
      data-station={station.name}
      data-look={station.look}
    >
      <span
        className="room-tv-bug"
        data-testid="room-tv-bug"
        title={station.name}
      >
        {initials || station.name.slice(0, 3)}
      </span>
      <div className="room-tv-lower-third" data-testid="room-tv-lower-third">
        <span className="room-tv-kicker">{station.name}</span>
        <strong className="room-tv-headline">
          {story ? story.headline : card!.title}
        </strong>
        {story ? null : <span className="room-tv-detail">{card!.detail}</span>}
      </div>
      <div className="room-tv-ticker" data-testid="room-tv-ticker">
        {/* Twice over, so the loop never shows an empty band. */}
        <span className="room-tv-ticker-track">
          <span>
            {ticker.length > 0 ? ticker.join("  ·  ") : (card?.detail ?? "")}
          </span>
          <span aria-hidden="true">
            {ticker.length > 0 ? ticker.join("  ·  ") : (card?.detail ?? "")}
          </span>
        </span>
      </div>
    </div>
  );
}

/** The room's newspaper as a small front page. */
export function RoomNewspaper({
  frontPage,
}: {
  readonly frontPage: RoomFrontPage;
}) {
  const { paper, dateLine, place, story, latestEdition } = frontPage;
  return (
    <div
      className={`room-paper room-paper--look-${paper.look}`}
      data-testid="room-paper"
      data-paper={paper.name}
      data-look={paper.look}
    >
      <strong className="room-paper-masthead" data-testid="room-paper-masthead">
        {paper.name}
      </strong>
      <span className="room-paper-dateline" data-testid="room-paper-dateline">
        {place ? `${place} · ` : ""}
        {story || !latestEdition
          ? dateLine
          : `Latest edition, ${latestEdition}`}
      </span>
      {story ? (
        <>
          <span
            className="room-paper-headline"
            data-testid="room-paper-headline"
          >
            {story.headline}
          </span>
          {story.deck ? (
            <span className="room-paper-deck">{story.deck}</span>
          ) : null}
        </>
      ) : null}
      <span className="room-paper-columns" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
