/**
 * The title rotation's Oval Office plate predates the other finished rooms.
 * Its desk is a broad set of flat rectangles, so it loses the carved joinery
 * that makes the Resolute desk recognizable. Keep the repair beside the title
 * renderer instead of changing every civic backdrop or inventing simulation
 * state: this traced overlay shares the plate's 1672 by 941 coordinate system
 * and therefore follows the same cover transform at every viewport.
 */
export function OvalOfficeDeskDetail() {
  return (
    <svg
      aria-hidden="true"
      data-testid="oval-office-resolute-detail"
      viewBox="0 0 1672 941"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        <linearGradient id="resolute-carving" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b452d" />
          <stop offset="1" stopColor="#3b2119" />
        </linearGradient>
      </defs>

      {/* Molding beneath the writing surface and around all three bays. */}
      <path
        d="M635 432H1036M643 443H1028M655 459H1017"
        fill="none"
        stroke="#2b1812"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M666 466h92v62h-92zm247 0h92v62h-92z"
        fill="url(#resolute-carving)"
        stroke="#25130e"
        strokeWidth="5"
      />
      <path
        d="M681 480h62v34h-62zm247 0h62v34h-62z"
        fill="none"
        stroke="#a26b47"
        strokeWidth="3"
      />

      {/* The central carved panel, with its recessed arch and floral scroll. */}
      <path
        d="M775 462h121v67H775z"
        fill="#4c291e"
        stroke="#24130e"
        strokeWidth="5"
      />
      <path
        d="M790 516v-25c0-13 10-22 22-22h47c12 0 22 9 22 22v25"
        fill="none"
        stroke="#9b6542"
        strokeWidth="4"
      />
      <path
        d="M804 502c9-2 12-12 17-20 4 8 8 14 15 18 8-4 12-10 16-18 5 8 8 18 17 20M811 510c8-5 16-7 25-7s17 2 25 7"
        fill="none"
        stroke="#bd8050"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Brass keyhole escutcheons and the desk's heavy corner blocks. */}
      <g fill="#c6a45d" stroke="#3a2918" strokeWidth="2">
        <path d="M705 476a6 6 0 1 1 12 0c0 3-2 5-4 6l3 9h-10l3-9c-2-1-4-3-4-6z" />
        <path d="M954 476a6 6 0 1 1 12 0c0 3-2 5-4 6l3 9h-10l3-9c-2-1-4-3-4-6z" />
      </g>
      <path
        d="M637 531h403M650 537v14h101v-14m169 0v14h101v-14"
        fill="none"
        stroke="#28150f"
        strokeWidth="6"
        strokeLinecap="square"
      />
      <path
        d="M650 535h101M920 535h101"
        fill="none"
        stroke="#9b6542"
        strokeWidth="3"
      />
    </svg>
  );
}
