import "./politics-hub.css";

/**
 * The Politics hub's tab strip (UI DECISION FOLLOW-THROUGH, OCD-UI-004).
 *
 * One compact hub over the existing political surfaces: each tab opens the
 * surface that already owns that work, so no mechanism moves or disappears.
 * Transit and taxes stay reachable as part of Issues and budget, and a place's
 * meetings and records as part of Government. Switching tabs is navigation,
 * not a game action; it never touches the World or its clock.
 */

export type PoliticsTab =
  "office" | "campaigns" | "government" | "parties" | "issues";

export interface PoliticsTabItem {
  readonly tab: PoliticsTab;
  readonly label: string;
  readonly testid: string;
}

export const POLITICS_TABS: readonly PoliticsTabItem[] = [
  {
    tab: "government",
    label: "Government",
    testid: "politics-tab-government",
  },
  { tab: "office", label: "Your office", testid: "politics-tab-office" },
  {
    tab: "campaigns",
    label: "Campaigns",
    testid: "politics-tab-campaigns",
  },
  { tab: "parties", label: "Parties", testid: "politics-tab-parties" },
  {
    tab: "issues",
    label: "Issues and budget",
    testid: "politics-tab-issues",
  },
];

export interface PoliticsSubItem {
  readonly key: string;
  readonly label: string;
  readonly current: boolean;
  readonly testid: string;
}

/**
 * On a phone the strip scrolls sideways; a tab reached by keyboard is brought
 * fully into view rather than left half-clipped at the strip's edge.
 */
function revealInStrip(event: { currentTarget: HTMLElement }): void {
  event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

export function PoliticsTabs({
  active,
  onSelect,
  hidden = [],
  subItems = [],
  onSelectSub,
}: {
  readonly active: PoliticsTab;
  readonly onSelect: (tab: PoliticsTab) => void;
  /** Tabs this life cannot use yet (a child has no office or campaign). */
  readonly hidden?: readonly PoliticsTab[];
  /** Sections inside the active tab, e.g. Budget / Transit / Taxes. */
  readonly subItems?: readonly PoliticsSubItem[];
  readonly onSelectSub?: (key: string) => void;
}) {
  const tabs = POLITICS_TABS.filter((item) => !hidden.includes(item.tab));
  return (
    <nav
      className="pg-politics-tabs"
      aria-label="Politics"
      data-testid="politics-tabs"
    >
      <ul className="pg-politics-tab-list">
        {tabs.map((item) => (
          <li key={item.tab}>
            <button
              type="button"
              className="pg-politics-tab"
              aria-current={item.tab === active ? "page" : undefined}
              data-testid={item.testid}
              onClick={() => {
                if (item.tab !== active) onSelect(item.tab);
              }}
              onFocus={revealInStrip}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      {subItems.length > 1 && onSelectSub ? (
        <ul
          className="pg-politics-sub-list"
          aria-label="Sections"
          data-testid="politics-subtabs"
        >
          {subItems.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className="pg-politics-sub"
                aria-current={item.current ? "page" : undefined}
                data-testid={item.testid}
                onClick={() => {
                  if (!item.current) onSelectSub(item.key);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
