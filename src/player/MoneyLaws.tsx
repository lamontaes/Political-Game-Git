import {
  projectMoneyLaws,
  type MoneyLawLine,
} from "../presentation/money-laws";
import type { EntityId, World } from "../simulation";

/**
 * Money and property → what new laws did to money: the player's own lines,
 * then each law's reach across their town. A law's name opens its page.
 * Reading it spends no time and changes nothing.
 */
export function MoneyLawsPanel({
  world,
  personId,
  onOpenMeasure,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenMeasure: (measureId: EntityId) => void;
}) {
  const laws = projectMoneyLaws(world, personId);
  if (!laws) return null;
  const list = (lines: readonly MoneyLawLine[], testid: string) => (
    <ul className="pg-dossier-laws" data-testid={testid}>
      {lines.map((line) => (
        <li key={line.key} data-testid="money-law-line">
          <button
            type="button"
            className="pg-dossier-law-title"
            data-testid={`money-law-${line.measureId}`}
            onClick={() => onOpenMeasure(line.measureId)}
          >
            {line.lawLabel}
          </button>
          <p className="pg-dossier-law-effect">
            {line.dateLabel ? `${line.dateLabel}: ${line.text}` : line.text}
          </p>
        </li>
      ))}
    </ul>
  );
  return (
    <section
      className="pg-personal-section"
      aria-label="What new laws did to money"
      data-testid="money-laws"
    >
      <h3>What new laws did to money</h3>
      {laws.empty ? (
        <p className="game-note" data-testid="money-laws-none">
          {laws.empty}
        </p>
      ) : null}
      {laws.yours.length > 0 ? (
        <>
          <h4>Yours</h4>
          {list(laws.yours, "money-laws-yours")}
        </>
      ) : null}
      {laws.town.length > 0 ? (
        <>
          <h4>In {laws.placeName}</h4>
          {list(laws.town, "money-laws-town")}
        </>
      ) : null}
    </section>
  );
}
