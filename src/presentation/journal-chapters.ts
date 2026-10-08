import type { EntityId, IsoDate, World } from "../simulation";
import { projectLifeRecord } from "./life-record";

/** Canonical entry packet shared with Session 7's World 39 journal. */
export interface World39BiographyEntry {
  readonly id: string;
  readonly at: IsoDate;
  readonly sequence: number;
  readonly kind: "life" | "event" | "memory" | "account" | "view";
  readonly text: string;
  readonly sourceId: EntityId;
}

/** Canonical chapter packet shared with Session 7's World 39 journal. */
export interface World39BiographyChapter {
  readonly key: string;
  readonly year: string;
  readonly heading: string;
  readonly entries: readonly World39BiographyEntry[];
}

/**
 * Temporary B19 adapter until Session 7's shared composer is merged. It
 * preserves the shared packet and cutoff contract while reusing canonical
 * life-record entries; it adds no biography store or authored life facts.
 */
export function composeChapters(
  world: World,
  personId: EntityId,
  through: IsoDate,
): readonly World39BiographyChapter[] {
  const cutoff = through > world.currentDate ? world.currentDate : through;
  const life = projectLifeRecord({ ...world, currentDate: cutoff }, personId);

  return life.chapters.flatMap((chapter) => {
    const entries = chapter.entries.filter((entry) => entry.at <= cutoff);
    if (entries.length === 0) return [];
    const firstYear = entries[0]!.at.slice(0, 4);
    const lastYear = entries.at(-1)!.at.slice(0, 4);
    const year =
      firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`;
    const heading =
      firstYear === lastYear
        ? `In ${firstYear}`
        : `${firstYear} to ${lastYear}`;

    return [
      {
        key: chapter.key,
        year,
        heading,
        entries: entries.map((entry) => {
          const anchor = entry.anchors[0];
          const kind: World39BiographyEntry["kind"] =
            anchor?.store === "events"
              ? "event"
              : anchor?.store === "memories"
                ? "memory"
                : anchor
                  ? "account"
                  : "life";
          return {
            id: entry.key,
            at: entry.at,
            sequence: anchor?.sequence ?? 0,
            kind,
            text: entry.sentence,
            sourceId: anchor?.recordId ?? personId,
          };
        }),
      },
    ];
  });
}
