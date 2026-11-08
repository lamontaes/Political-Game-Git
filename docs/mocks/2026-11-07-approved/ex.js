/* eslint-disable -- design mock that runs in a browser, not game code */
const $ = (q, el = document) => el.querySelector(q);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
/* pack v4 figures, one per named person on this page (same people as the prototype) */
const LOOKS = {
  me: {
    f: "people/man-slim-look-suitcharcoal-gesture-tq-right.png",
    w: 271,
    h: 642,
    x: 176.5,
    t: 5,
    hw: 73,
  },
  mefig: {
    f: "people/man-slim-look-suitcharcoal-gesture-front.png",
    w: 214,
    h: 706,
    x: 102.5,
    t: 6,
    hw: 75,
  },
  hale: {
    f: "people/woman-slim-look-pantsuitblack-stand-front.png",
    w: 234,
    h: 707,
    x: 116.0,
    t: 5,
    hw: 82,
  },
};
const H = {
  face: (key, px = 64, alt = "") => {
    const L = LOOKS[key];
    if (!L) return "";
    const side = L.hw * 2.3,
      k = px / side,
      x0 = L.x - side / 2,
      y0 = L.t - L.hw * 0.18;
    return `<span class="face" role="img" aria-label="${esc(alt)}" style="width:${px}px;height:${px}px"><i style="background-image:url(img/${L.f});background-size:${(L.w * k).toFixed(1)}px ${(L.h * k).toFixed(1)}px;background-position:${(-x0 * k).toFixed(1)}px ${(-y0 * k).toFixed(1)}px"></i></span>`;
  },
  /* head to just above the hands (his figure holds a hand at the chest) */
  bust: (key, w, h, chest = 2.0, alt = "") => {
    const L = LOOKS[key];
    if (!L) return "";
    const top = L.t - L.hw * 0.22,
      ch = L.hw * chest,
      k = h / ch,
      cw = w / k,
      x0 = L.x - cw / 2;
    return `<span class="bust" role="img" aria-label="${esc(alt)}" style="width:${w}px;height:${h}px"><i style="background-image:url(img/${L.f});background-size:${(L.w * k).toFixed(1)}px ${(L.h * k).toFixed(1)}px;background-position:${(-x0 * k).toFixed(1)}px ${(-top * k).toFixed(1)}px"></i></span>`;
  },
  fig: (key, h) => {
    const L = LOOKS[key];
    return `<img class="figure" src="img/${L.f}" alt="" style="height:${h}px;width:${Math.round((L.w * h) / L.h)}px">`;
  },
  money: (n) =>
    n >= 1e6
      ? `$${(n / 1e6).toFixed(2).replace(/0$/, "")} million`
      : `$${Math.round(n).toLocaleString("en-US")}`,
  usd: (n) => `$${Math.round(n).toLocaleString("en-US")}`,
};
const I = {
  home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  cap: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c2.8 2.2 8.2 2.2 11 0v-4M20.5 10v5"/>',
  church:
    '<path d="M12 3v4M10 5h4"/><path d="M7 21v-9l5-4 5 4v9z"/><path d="M10.5 21v-4h3v4"/>',
  ballot:
    '<rect x="4" y="11" width="16" height="9" rx="1"/><path d="M8 11V5h8v6M10 8l1.5 1.5L14 7"/>',
  cash: '<rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.6"/>',
  heart:
    '<path d="M12 19s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 1.7C19 14.6 12 19 12 19z"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  wrench:
    '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  cake: '<path d="M5 20h14v-7H5z"/><path d="M5 15.5c2.3 1.4 4.7 1.4 7 0s4.7-1.4 7 0M12 13V9M12 6.5v.01"/>',
  gavel: '<path d="M13 4l5 5M10.5 6.5l5 5M4 20l7-7M12 9.5 9.5 12"/>',
  door: '<path d="M6 21V4h12v17"/><path d="M4 21h16M14.5 12.5h.01"/>',
  mic: '<rect x="9" y="3.5" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5"/>',
  receipt:
    '<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
  scale: '<path d="M12 4v15M7 19h10M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z"/>',
  badge:
    '<path d="M12 3.5 18.5 6v5.5c0 4-2.8 7.2-6.5 9-3.7-1.8-6.5-5-6.5-9V6z"/><path d="M12 9l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 11.3 11 11z"/>',
  road: '<path d="M8 20 10 4M16 20 14 4M12 6v2M12 11v2M12 16v2"/>',
  drop: '<path d="M12 3.5s-6 6.8-6 10.6a6 6 0 0 0 12 0C18 10.3 12 3.5 12 3.5z"/>',
  flame:
    '<path d="M12 21c3.6 0 6-2.5 6-5.8 0-4.4-4-6.2-4.6-10.2-2.6 1.8-4 4.2-3.8 6.8-1.2-.6-1.9-1.8-2-3C6.3 10.4 6 12.4 6 15.2 6 18.5 8.4 21 12 21z"/>',
  hall: '<path d="M3.5 20h17M5 20v-8M9.5 20v-8M14.5 20v-8M19 20v-8M3.5 12h17M4 12l8-6 8 6"/>',
  book: '<path d="M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/>',
  house2:
    '<path d="M3.5 12 12 5l8.5 7"/><path d="M5.5 10.5V20h13v-9.5M9 20v-4.5h6V20"/><path d="M15.5 6.5V4.5h2V8"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-1.9-.4-2.5-1.2M12 6.5v1.5M12 16v1.5"/>',
  bolt: '<path d="M13 3 6 13.5h5L10 21l8-11h-5z"/>',
  cart: '<path d="M3.5 5h2.5l2 10.5h10l2-7.5H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>',
  sign: '<path d="M5 4h14v9H5zM12 13v7"/>',
  page: '<path d="M6.5 3.5h8l3 3v14h-11z"/><path d="M14.5 3.5v3h3M9 11h6M9 14.5h6"/>',
  stamp:
    '<path d="M9.5 4h5l-1 6h2.5a2 2 0 0 1 2 2v2.5h-12V12a2 2 0 0 1 2-2H10.5z"/><path d="M5 18.5h14"/>',
  mill: '<path d="M4 20V10l5 3V10l5 3V6h4v14z"/><path d="M8 17h2M13 17h2"/>',
};
const ic = (k, cls = "ico") =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
const ring = (k, extra = "") => `<span class="ring"${extra}>${ic(k)}</span>`;
const tip = (title, body) =>
  ` tabindex="0" data-tip="${esc(body)}" data-tiptitle="${esc(title)}"`;

/* the player's data, from the prototype */
const ME = {
  name: "John Spencer",
  age: 24,
  money: 1940,
  camp: 940,
  raised: 1250,
  spent: 310,
  doors: 96,
  meetings: 9,
  years: 6,
};

/* ---------- You: A, Crusader Kings 3 ---------- */
function youCK() {
  const traits = [
    [
      "home",
      "Renter",
      "You rent the Pecan Street apartment with Marisol, upstairs from Hal Whitaker.",
    ],
    [
      "box",
      "Warehouse",
      "Warehouse associate at Gulf South Distribution since June 2019, $15.50 an hour.",
    ],
    [
      "house2",
      "Latimer born",
      "Born at Copiah General in 2000 and raised on Cherry Street.",
    ],
    [
      "cap",
      "Some college",
      "Latimer High, 2018. Twelve credits at Copiah-Lincoln.",
    ],
    [
      "church",
      "Baptist",
      "You grew up at Mount Zion and go when your shift allows.",
    ],
    [
      "ballot",
      "Primary voter",
      "You've voted in every town election since 2019, in the Democratic primary.",
    ],
  ];
  const skills = [
    ["cake", ME.age, "Years old"],
    ["cash", "$1,940", "Your money"],
    ["gavel", ME.meetings, "Board meetings"],
    ["door", ME.doors, "Doors knocked"],
  ];
  const kin = (k, n, r, t) =>
    `<div class="kinp pick"${tip(n, t)}>${ring(k)}<b>${n}</b><span>${r}</span></div>`;
  return `<div class="ck">
    <div class="port">${H.bust("mefig", 400, 500, 2.05, "John Spencer")}</div>
    <div>
      <div class="banner"><h2>John Spencer</h2><p>Candidate for alderman, District 2</p></div>
      <div class="traits">${traits.map(([k, n, t]) => `<div class="trait pick"${tip(n, t)}>${ring(k)}<span>${n}</span></div>`).join("")}</div>
      <div class="skills" style="margin-top:22px">${skills.map(([k, v, l]) => `<div class="skill">${ring(k)}<div><b>${v}</b><span>${l}</span></div></div>`).join("")}</div>
      <p class="prose" style="margin-top:22px">Raised by his mother on Cherry Street, he went to work at Gulf South after Latimer High and started going to board meetings when the water bill went up. Now he wants the seat Daniel Cole holds.</p>
    </div>
    <div class="kin">
      <div><div class="hdr">Family</div><div class="kingroup">${kin("heart", "Marisol Vega", "Partner", "Nurse at Copiah General. You've lived together since 2022.")}${kin("home", "Denise Spencer", "Mother", "Cafeteria manager in Jackson. She raised you on her own.")}</div></div>
      <div><div class="hdr">Close to you</div><div class="kingroup">${kin("star", "Kayla Moore", "Friend", "Friends since ninth grade. She talked you into running.")}${kin("star", "Hal Whitaker", "Neighbor", "Chairs the town's Democratic committee.")}${kin("wrench", "Earl Dunn", "Coworker", "Trained you on the forklift your first week.")}${kin("wrench", "Raj Patel", "Shift manager", "Your shift manager at Gulf South.")}</div></div>
    </div></div>`;
}

/* ---------- You: B, Suzerain dossier ---------- */
function youSZ() {
  return `<div class="dossier">
    <div class="folder"><i>SPENCER, JOHN</i></div>
    <div class="page l typed">
      <span class="clip"></span>
      <div class="photo">${H.bust("mefig", 152, 178, 2.05, "John Spencer")}</div>
      <h3>JOHN SPENCER</h3>
      <p style="max-width:330px">Twenty-four. Born in Latimer and raised by his mother on Cherry Street. Works the warehouse floor at Gulf South Distribution.</p>
      <p style="max-width:330px">Rents an apartment on Pecan Street with Marisol Vega, a nurse at Copiah General. His mother, Denise, moved to Jackson in 2021.</p>
      <p>Started coming to board meetings in 2024, when the water bill went up. Sits in the back and writes everything down. Spoke for the first time on January 6, against the rate increase.</p>
      <p>Running in the Democratic primary for District 2 on April 1, against Ruth Ellis. The winner faces Daniel Cole in June.</p>
      <span class="stamp" style="left:40px;bottom:30px">QUALIFIED · JAN 14 · DIST. 2</span>
    </div>
    <div class="page r">
      <div class="newsclip"><span class="pin"></span><b>The Latimer Ledger · January 15</b><p>Warehouse worker John Spencer, 24, qualified to run for District 2. Spencer says he wants the west side drainage finished before another spring flood.</p></div>
      <div class="typed"><p><b>Where he stands.</b> Against the water rate increase: renters pay it, and nobody on the board rents. Wants the whole $1.2 million drainage bond, not half. Nothing said yet on the Highway 8 store.</p>
      <p style="margin-top:10px"><b>Who's with him.</b> Kayla Moore, a friend since ninth grade, who talked him into it. Hal Whitaker, downstairs, who chairs the town's Democrats.</p></div>
      <p class="note-hand" style="margin-top:14px;font-size:20px">Lost student council by 11 votes. Still talks about it. (Kayla)</p>
      <div class="receipt"><p class="typed">Statement of intent filed with the city clerk, Town of Latimer, January 14, 2025, for the Democratic primary in District 2. Qualifying fee of $10 received.</p><div class="hand">M. Hale</div><span class="stamp" style="right:-92px;top:22px;font-size:15px">PAID</span></div>
    </div></div>`;
}

/* ---------- You: C, Wildermyth hero page ---------- */
function youWM() {
  const m = (img, cap, r) =>
    `<div class="cpanel pick" style="background-image:url(img/${img});--r:${r}"><div class="cap">${cap}</div></div>`;
  return `<div class="wm">
    <div class="cpanel" style="height:590px;background-image:url(img/house-suburban-living__midday.jpg)">
      <div class="who">${H.fig("mefig", 520)}</div>
      <div class="cap">Pecan Street. The apartment over Hal Whitaker's, with Marisol.</div>
    </div>
    <div>
      <h2>John Spencer</h2>
      <div class="tag">24 · Latimer, Mississippi</div>
      <div class="storylines">
        <p>He goes to every board meeting and sits in the back with a notebook.</p>
        <p>He rents, like everyone he grew up with, and he says so.</p>
        <p>He hasn't been late to a shift in five years.</p>
        <p>He lost student council by eleven votes and never stopped thinking about it.</p>
      </div>
      <div class="hdr" style="margin-bottom:10px">The moments that made him</div>
      <div class="moments">
        ${m("house-gulf-coast-raised__midday.jpg", "The creek stood in the yard on Cherry Street for three days.", "-1deg")}
        ${m("school-board-room__midday.jpg", "Eleven votes short, and Kayla told him first.", ".8deg")}
        ${m("public-meeting-room__midday.jpg", "“Nobody on this board rents.”", "-.6deg")}
      </div>
    </div></div>`;
}

/* ---------- You: D, Disco Elysium character sheet ---------- */
const DE_CARDS = [
  [
    "house-suburban-living__midday.jpg",
    "Pecan Street",
    "$425 rent",
    ["$425", "rent"],
    "You rent the apartment over Hal Whitaker's with Marisol and split the rent down the middle. It floods at the curb every spring.",
  ],
  [
    "factory-floor__midday.jpg",
    "Gulf South",
    "$15.50 an hour",
    ["6", "years"],
    "Six years on the warehouse floor. Earl Dunn taught you the forklift your first week, and Raj Patel runs your shift. You've never been late.",
  ],
  [
    "church-sanctuary__midday.jpg",
    "Mount Zion",
    "Baptist",
    "",
    "You grew up in these pews and still go when your shift allows. Your mother sang in the choir here until she moved to Jackson.",
  ],
  [
    "school-board-room__midday.jpg",
    "Latimer High",
    "Class of 2018",
    ["11", "votes short"],
    "You lost student council by eleven votes. Kayla Moore told you before they announced it.",
  ],
  [
    "public-meeting-room__midday.jpg",
    "City Hall",
    "Running",
    ["9", "meetings"],
    "Nine board meetings last year, all from the back row. On January 6 you stood up for the first time.",
  ],
  [
    "house-gulf-coast-raised__midday.jpg",
    "Cherry Street",
    "Born 2000",
    "",
    "Your mother's house with the porch that leaned left. The summer you were ten, the creek stood in the yard for three days.",
  ],
];
let deSel = 1;
function youDE() {
  const s = DE_CARDS[deSel];
  return `<div class="de">
    <div class="attrs"><div class="deface">${H.face("me", 150, "John Spencer")}</div>${[
      [ME.age, "Years<br>old"],
      [ME.meetings, "Board<br>meetings"],
      [ME.doors, "Doors<br>knocked"],
      ["$940", "In the<br>campaign"],
    ]
      .map(
        ([v, l]) =>
          `<div class="attr"><b style="${String(v).length > 3 ? "font-size:44px" : ""}">${v}</b><span>${l}</span></div>`,
      )
      .join("")}</div>
    <div class="cards">${DE_CARDS.map(([img, n, v], i) => `<button type="button" class="card${i === deSel ? " sel" : ""}" data-de="${i}" style="background-image:url(img/${img})"><div><b>${n}</b><span>${v}</span></div></button>`).join("")}</div>
    <div class="bigcard"><div class="art" style="background-image:url(img/${s[0]})">${s[3] ? `<b>${s[3][0]}<small>${s[3][1]}</small></b>` : ""}</div><h3>${s[1]}</h3><p class="prose">${s[4]}</p></div>
  </div>`;
}

/* ---------- Budgets data (the prototype's town budget) ---------- */
const BUD = {
  inTotal: 4.24e6,
  inLast: 4.05e6,
  outTotal: 4.31e6,
  outLast: 4.12e6,
  rev: [
    [
      "receipt",
      "Property tax",
      1180000,
      1140000,
      "38 mills on homes, land and businesses",
    ],
    [
      "cart",
      "Sales tax",
      1320000,
      1270000,
      "The town's share of the state's 7%",
    ],
    [
      "drop",
      "Water and sewer bills",
      1020000,
      990000,
      "Every household on the system",
    ],
    [
      "bolt",
      "Utility franchise fees",
      210000,
      205000,
      "Power, gas and cable companies",
    ],
    [
      "hall",
      "State and federal grants",
      240000,
      180000,
      "Mostly the Pecan Street paving grant",
    ],
    ["gavel", "Court fines and fees", 160000, 168000, "Municipal court"],
    [
      "page",
      "Licenses and permits",
      110000,
      97000,
      "Business licenses, building permits",
    ],
  ],
  depts: [
    [
      "scale",
      "Required payments",
      728000,
      708000,
      null,
      "Set by law and contract",
      [
        ["Water bond payments", 410000, null],
        ["State retirement", 290000, null],
        ["Yearly audit", 28000, null],
      ],
    ],
    [
      "badge",
      "Police department",
      1050000,
      1010000,
      "Ray Odom",
      "Police chief",
      [
        ["Officers' pay", 812000, 840000],
        ["Patrol cars", 96000, 120000],
        ["Fuel", 48000, 50000],
        ["Jail fees", 56000, 56000],
        ["Radios and vests", 38000, 44000],
      ],
    ],
    [
      "road",
      "Streets and drainage",
      610000,
      540000,
      "Tommy Rhodes",
      "Public works director",
      [
        ["Pecan Street paving", 170000, 170000],
        ["Crew pay", 288000, 288000],
        ["Drainage repairs", 92000, 140000],
        ["Equipment and fuel", 60000, 64000],
      ],
    ],
    [
      "drop",
      "Water and sewer",
      980000,
      950000,
      "Tommy Rhodes",
      "Public works director",
      [
        ["Treatment plant", 420000, 420000],
        ["Pipe repairs", 260000, 290000],
        ["Crew pay", 300000, 300000],
      ],
    ],
    [
      "flame",
      "Fire department",
      520000,
      505000,
      "Dale Burks",
      "Fire chief",
      [
        ["Firefighters' pay", 398000, 410000],
        ["Volunteer pay", 42000, 42000],
        ["Truck payments", 80000, 80000],
      ],
    ],
    [
      "hall",
      "Town hall and court",
      232000,
      220000,
      "Margaret Hale",
      "City clerk",
      [
        ["Clerk and elections", 128000, 128000],
        ["Municipal court", 64000, 64000],
        ["City Hall upkeep", 40000, 40000],
      ],
    ],
    [
      "book",
      "Parks and library",
      190000,
      185000,
      null,
      "Library board",
      [
        ["Library", 112000, 112000],
        ["Parks and the pool", 78000, 80000],
      ],
    ],
  ],
  detail: {
    "Police department": [
      ["Officers' pay and benefits", "11 officers", 840000, 790000, 812000],
      ["Patrol cars", "Two new cars", 120000, 90000, 96000],
      ["Fuel", "Nine patrol cars", 50000, 47000, 48000],
      ["Jail fees", "Paid to the county per night held", 56000, 52000, 56000],
      ["Equipment and radios", "Radios, vests, cameras", 44000, 31000, 38000],
    ],
  },
};
const polHead = (lev = "Latimer") =>
  `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px">${tabs(["Latimer", "Copiah County", "Mississippi", "United States"], lev, true)}<span class="sm">Fiscal year October 1, 2024 to September 30, 2025</span></div>`;
const tabs = (list, cur, small) =>
  `<div class="tabrail${small ? " small" : ""}">${list.map((t) => `<button type="button" class="${t === cur ? "on" : ""}">${t}</button>`).join("")}</div>`;
const delta = (a, b) => {
  const d = a - b;
  return d === 0
    ? "Same as last year"
    : `${d > 0 ? "Up" : "Down"} ${H.usd(Math.abs(d))} from last year`;
};

/* ---------- Budget A: Victoria 3 ---------- */
function budV3() {
  const row = (k, n, amt, last, sel = false, t = "") =>
    `<div class="v3row pick${sel ? " sel" : ""}"${tip(n, (t ? t + ". " : "") + delta(amt, last) + ".")}>${ring(k)}<b>${n}</b><em>${H.usd(amt)}</em></div>`;
  const p = BUD.depts[1],
    det = BUD.detail["Police department"];
  return `<div class="ex">${polHead()}
    <div class="v3top"><div><span class="hdr">Coming in</span><span class="big">${H.money(BUD.inTotal)}</span></div><div><span class="hdr">Going out</span><span class="big">${H.money(BUD.outTotal)}</span></div><div><span class="hdr">Balance</span><span class="big short">$70,000 short</span></div></div>
    <div class="v3cols">
      <div><div class="strip2"><b>Coming in</b><span>${H.usd(BUD.inTotal)}</span></div>${BUD.rev.map(([k, n, a, l, t]) => row(k, n, a, l, false, t)).join("")}</div>
      <div><div class="strip2"><b>Going out</b><span>${H.usd(BUD.outTotal)}</span></div>${BUD.depts.map(([k, n, a, l], i) => row(k, n, a, l, i === 1)).join("")}</div>
    </div>
    <div class="v3detail"><div><div class="hdr">Police department</div><div class="sm" style="margin-top:4px">Police chief <b>Ray Odom</b></div></div><div class="lines">${det.map(([n, , , , a]) => `<div><b>${H.usd(a)}</b><span>${n}</span></div>`).join("")}</div></div>
  </div>`;
}

/* ---------- Budget B: Democracy 4 ---------- */
function budD4() {
  const pol = (k, n, a, l, sel = false) => {
    const rc = a > l ? "#8fb873" : a < l ? "#d0705f" : "#c9a85a";
    return `<div class="pol pick${sel ? " sel" : ""}"${tip(n, delta(a, l) + ".")}><span class="ring" style="--rc:${rc}">${ic(k)}</span><b>${n}</b><em>${H.usd(a)}</em></div>`;
  };
  const d = (i) => {
    const [k, n, a, l] = BUD.depts[i];
    return pol(k, n, a, l, i === 1);
  };
  const det = BUD.detail["Police department"];
  return `<div class="ex">${polHead()}
    <div class="d4"><div class="board">
      <div class="cluster" style="grid-row:span 2"><div class="hdr">Taxes and fees</div><div class="cl-icons">${BUD.rev.map(([k, n, a, l]) => pol(k, n, a, l)).join("")}</div></div>
      <div class="cluster"><div class="hdr">Public safety</div><div class="cl-icons">${d(1)}${d(4)}</div></div>
      <div class="cluster"><div class="hdr">Streets and water</div><div class="cl-icons">${d(2)}${d(3)}</div></div>
      <div class="cluster"><div class="hdr">Required</div><div class="cl-icons">${d(0)}</div></div>
      <div class="cluster"><div class="hdr">Town hall and parks</div><div class="cl-icons">${d(5)}${d(6)}</div></div>
    </div>
    <div class="side">
      <div class="sline"><span class="hdr">Balance</span><b style="color:#f0a58e">$70,000 short</b></div>
      <h3 style="margin-top:10px">Police department</h3>
      <div class="sm">Police chief <b>Ray Odom</b></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin:4px 0 8px"><span class="big">$1,050,000</span><span class="sm">Last year <b>$1,010,000</b></span></div>
      ${det.map(([n, , ask, , a]) => `<div class="pline"><span>${n}</span><b>${H.usd(a)}</b><em>Asked ${H.usd(ask)}</em></div>`).join("")}
    </div></div></div>`;
}

/* ---------- Budget C: Suzerain document ---------- */
function budSZ() {
  const words = {
    "Required payments":
      "Bond payments on the water system, state retirement and the yearly audit, all set by law.",
    "Police department":
      "Eleven officers, two new patrol cars, and jail fees paid to the county.",
    "Streets and drainage":
      "The first half of Pecan Street paving. Drainage repairs cut from $214,000.",
    "Water and sewer": "The treatment plant, pipe repairs and a crew of six.",
    "Fire department":
      "Six firefighters, twenty volunteers paid per call, and two engines.",
    "Town hall and court":
      "The clerk's office, the town election and the municipal court.",
    "Parks and library":
      "Two library staff, mowing and lifeguards for the summer pool.",
  };
  const it = (n, a, l, w) =>
    `<div class="dl"><div class="t"><span>${n.toUpperCase()}</span><i></i><em>${H.usd(a)}</em></div><p>${w} ${delta(a, l)}.</p></div>`;
  return `<div class="ex">${polHead()}<div class="docwrap"><div class="doc">
    <div class="head"><b>TOWN OF LATIMER · MISSISSIPPI</b><h3>The Budget for the Year Beginning October 1, 2024</h3></div>
    <div class="doccols">
      ${it("Taxes and revenue", BUD.inTotal, BUD.inLast, "Property tax at 38 mills, the town's share of sales tax, water bills and grants.")}
      ${BUD.depts.map(([, n, a, l]) => it(n, a, l, words[n])).join("")}
    </div>
    <div class="docfoot"><p class="typed">The town takes in $4,240,000 and spends $4,310,000. The $70,000 difference comes from savings, which stand at $412,000.</p>
      <div style="display:flex;align-items:flex-end;gap:18px"><div style="text-align:center"><div class="note-hand" style="color:#22284a;font-size:26px">Carol Whitfield</div><div class="typed" style="font-size:13px;border-top:1px solid #3a2e1e">MAYOR · ADOPTED SEPT. 9, 2024</div></div><div class="seal">TOWN OF<br>LATIMER<br>SEAL</div></div></div>
  </div></div></div>`;
}

/* ---------- Budget D: The Political Process, cleaned up ---------- */
function budTP() {
  const det = BUD.detail["Police department"];
  const deptRow = (k, n, a, sel) =>
    `<div class="dept pick${sel ? " sel" : ""}">${n === "Town hall and court" ? `<span class="ring" style="overflow:hidden;width:40px;height:40px">${H.face("hale", 40, "Margaret Hale")}</span>` : ring(k)}<div><b>${n}</b><span>${H.usd(a)}</span></div></div>`;
  return `<div class="ex">${polHead()}
    <div class="tp">
      <div>${deptRow("coin", "Taxes and revenue", BUD.inTotal, false)}${BUD.depts.map(([k, n, a], i) => deptRow(k, n, a, i === 1)).join("")}</div>
      <div><div class="dhead"><div><h3>Police department</h3><div class="sm" style="margin-top:2px">Police chief <b>Ray Odom</b></div></div><div style="text-align:right"><div class="big">$1,050,000</div><div class="sm">Last year <b>$1,010,000</b></div></div></div>
        <div class="progs">${det.map(([n, w, ask, last, a]) => `<div class="prog pick"><b>${n}</b><span class="mid">${H.usd(a)}</span><span class="sm">${w}</span><span class="sm" style="grid-column:1/-1">Asked <b>${H.usd(ask)}</b> · Last year <b>${H.usd(last)}</b></span></div>`).join("")}</div></div>
      <div class="totals">
        <div><span class="hdr">Coming in</span><span class="mid">$4,240,000</span><span class="sm">Last year <b>$4,050,000</b></span></div>
        <div><span class="hdr">Going out</span><span class="mid">$4,310,000</span><span class="sm">Last year <b>$4,120,000</b></span></div>
        <div><span class="hdr">Balance</span><span class="mid" style="color:#f0a58e">$70,000 short</span></div>
        <div><span class="hdr">Savings</span><span class="mid">$412,000</span></div>
        <div><span class="hdr">Owed</span><span class="mid">$3,100,000</span></div>
      </div>
    </div></div>`;
}

/* ---------- Money data ---------- */
const STMT = [
  ["Jan 1", "Balance", null, 982],
  ["Jan 3", "Paycheck · Gulf South", 1048, 2030],
  ["Jan 5", "Rent · Pecan Street", -425, 1605],
  ["Jan 8", "Copiah Electric Power", -78, 1527],
  ["Jan 10", "Piggly Wiggly", -64, 1463],
  ["Jan 14", "Spencer for Alderman", -500, 963],
  ["Jan 17", "Paycheck · Gulf South", 1048, 2011],
  ["Jan 18", "Piggly Wiggly", -71, 1940],
];
const LEDG = [
  ["Jan 14", "John Spencer", 500, null, 500],
  ["Jan 14", "Qualifying fee", null, 10, 490],
  ["Jan 15", "Hal Whitaker", 250, null, 740],
  ["Jan 16", "Kayla Moore", 200, null, 940],
  ["Jan 16", "Yard signs, 70", null, 210, 730],
  ["Jan 18", "Bean There, 11 people", 300, null, 1030],
  ["Jan 18", "Flyers, Copiah Print", null, 90, 940],
];
const sgn = (n) =>
  n == null
    ? ""
    : `${n > 0 ? "+" : "−"}$${Math.abs(n).toLocaleString("en-US")}.00`;
const stmtHTML =
  () => `<div class="stmt"><h3>Copiah Bank</h3><div class="acct"><span>John Spencer · Checking ····4471</span><span>Through January 20, 2025</span></div>
  <div class="line h"><span>Date</span><span>Description</span><em>Amount</em><em>Balance</em></div>
  ${STMT.map(([d, t, a, b]) => `<div class="line"><span>${d}</span><span>${t}</span><em>${sgn(a)}</em><em>$${b.toLocaleString("en-US")}.00</em></div>`).join("")}
  <div class="bal"><span>Balance today</span><b>$1,940.00</b></div></div>`;
const ledgHTML =
  () => `<div class="ledger2"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Spencer for Alderman</h3><span style="font:600 12.5px var(--f-ui);letter-spacing:1.2px;text-transform:uppercase;opacity:.8">Report due March 25</span></div>
  <div class="line h"><span>Date</span><span>From or to</span><em>In</em><em>Out</em><em>Balance</em></div>
  ${LEDG.map(([d, t, i, o, b]) => `<div class="line"><span>${d}</span><span>${t}</span><em>${i ? "$" + i : ""}</em><em>${o ? "$" + o : ""}</em><em>$${b.toLocaleString("en-US")}</em></div>`).join("")}
  <div class="line tot"><span></span><span>Totals</span><em>$1,250</em><em>$310</em><em>$940</em></div></div>`;
const putin = () =>
  `<div class="putin"><span class="hdr" style="margin-right:6px">Put into your campaign</span><button class="kbtn small" type="button">$100</button><button class="kbtn small" type="button">$250</button><button class="kbtn small" type="button">$500</button></div>`;
function monA() {
  return `<div class="mon"><div><div class="paperA">${stmtHTML()}</div>${putin()}</div><div class="paperA">${ledgHTML()}</div></div>`;
}
function monB() {
  return `<div class="mon"><div><div class="paperB">${stmtHTML()}</div>${putin()}</div><div class="paperB leather"><div class="inner">${ledgHTML()}</div></div></div>`;
}
function monC() {
  const icons = {
    Balance: "coin",
    "Paycheck · Gulf South": "box",
    "Rent · Pecan Street": "home",
    "Copiah Electric Power": "bolt",
    "Piggly Wiggly": "cart",
    "Spencer for Alderman": "ballot",
  };
  return `<div class="mc">
    <div><div class="hdr">Your money</div><div style="display:flex;align-items:baseline;gap:14px;margin:2px 0 10px"><span class="big" style="font-size:52px">$1,940</span></div>
      ${STMT.slice(1)
        .reverse()
        .map(
          ([d, t, a]) =>
            `<div class="mrow">${ring(icons[t])}<b>${t}<span>${d}</span></b><em class="${a > 0 ? "in" : ""}">${sgn(a).replace(".00", "")}</em></div>`,
        )
        .join("")}
      ${putin()}</div>
    <div><div class="hdr">Spencer for Alderman</div>
      <div class="hero3" style="margin-top:6px"><div><span class="big">$1,250</span><span class="sm">Raised</span></div><div><span class="big">$310</span><span class="sm">Spent</span></div><div><span class="big">$940</span><span class="sm">In the account</span></div></div>
      <div class="hdr" style="margin-top:12px">Who gave</div>
      <div class="givers"><div class="giver pick"><span class="ring">${H.face("me", 72, "You")}</span><b>You</b><em>$500</em></div><div class="giver pick"><span class="ring">${ic("star")}</span><b>Hal Whitaker</b><em>$250</em></div><div class="giver pick"><span class="ring">${ic("star")}</span><b>Kayla Moore</b><em>$200</em></div><div class="giver pick"><span class="ring">${ic("people2")}</span><b>Bean There, 11 people</b><em>$300</em></div></div>
      <div class="hdr">What it paid for</div>
      <div class="paid" style="margin-top:8px"><div>${ring("stamp")}<span><b>Qualifying fee</b><em>$10</em></span></div><div>${ring("sign")}<span><b>Yard signs, 70</b><em>$210</em></span></div><div>${ring("page")}<span><b>Flyers</b><em>$90</em></span></div></div>
      <div class="sm" style="margin-top:14px">Report due <b>March 25</b></div>
    </div></div>`;
}
I.people2 =
  '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.5-3.4 2.7-5.2 5.5-5.2s5 1.8 5.5 5.2"/><circle cx="16.6" cy="9.4" r="2.4"/><path d="M15.6 13.9c2.5 0 4.4 1.6 5 4.6"/>';

/* ---------- You: Mix (Crusader Kings 3 frame, Wildermyth lines with the people in them, what people say) ---------- */
/* people are names he can click inside the sentences; faces come with the bust bank */
const WHO = {
  marisol: [
    "Marisol Vega",
    "Your partner. A nurse in the emergency room at Copiah General.",
  ],
  hal: [
    "Hal Whitaker",
    "Your neighbor downstairs. He chairs the town's Democratic committee.",
  ],
  denise: [
    "Denise",
    "Your mother, Denise Spencer. She manages a school cafeteria in Jackson now.",
  ],
  kayla: [
    "Kayla Moore",
    "Your friend since ninth grade. She runs the counter at Bean There.",
  ],
  earl: [
    "Earl Dunn",
    "Your coworker. Forklift lead at Gulf South for twenty-two years.",
  ],
  raj: ["Raj Patel", "Your shift manager at Gulf South."],
};
const nm = (k, text) =>
  `<span class="nm pick" tabindex="0" role="button" data-tip="${esc(WHO[k][1])}" data-tiptitle="${esc(WHO[k][0] === "Denise" ? "Denise Spencer" : WHO[k][0])}">${text || WHO[k][0]}</span>`;
/* his five temperament traits, as the game records them (pole labels: TRAIT_SHAPES in
   src/core2/people-trait-definitions.ts; strength words: PEOPLE_TRAIT_SCALE in src/core2/people-trait-pack.ts) */
const PERKS = [
  [
    "Thinks it through",
    "Strong",
    "I read the whole agenda before I say a word.",
  ],
  [
    "Reserved",
    "Moderate",
    "I sit in the back row and let other people talk first.",
  ],
  [
    "Confrontational",
    "Moderate",
    "When the board gets it wrong, I stand up and say so.",
  ],
  [
    "Follows through",
    "Strong",
    "I haven't been late to a shift in five years.",
  ],
  [
    "Takes chances",
    "Moderate",
    "I'm twenty-four and running against two people who've done this before.",
  ],
];
/* the same content in three ways of separating its sections: strips, panes, layered */
function mxBust() {
  const L = LOOKS.mefig,
    k = 2.7,
    end = 150; /* source rows 0 to 150; his thumb starts at 153 */
  return `<div class="mxglow"><div class="mxbust" style="height:${Math.round(end * k) + 6}px"><img src="img/${L.f}" alt="John Spencer" style="height:${Math.round(L.h * k)}px;left:${Math.round(160 - L.x * k)}px;top:6px"></div></div>`;
}
function youMix(style, extra = "") {
  const said = [
    [
      "kayla",
      "my friend",
      "Can't let a loss go",
      "He lost student council by eleven votes, and he still brings it up every time we drive past the school.",
    ],
    [
      "hal",
      "my neighbor",
      "Won't stay quiet",
      "He stood up and told the board that renters pay that water bill. Nobody up there rents, and he made sure they heard it.",
    ],
    [
      "marisol",
      "my partner",
      "Remembers where he came from",
      "The creek stood in his mother's yard for three days when he was ten. He's been talking about drainage ever since.",
    ],
  ];
  const sec = (depth, title, body) =>
    `<section class="sec ${style} dp${depth}"><h3 class="sechead">${title}</h3><div class="secbody">${body}</div></section>`;
  /* a bust from his gesture-front figure: head to upper chest, fading out above where his hand comes in (row 153 of 706) */
  return `<div class="mx3 ${style} ${extra}">
    <div class="mx3left"><div class="ck"><div class="banner mxbanner"><h2>John Spencer</h2><p>Candidate for alderman, District 2</p></div></div>
      ${mxBust()}</div>
    <div class="mx3main">
      <div class="mx3cols">
        <div class="mx3col">
          ${sec(1, "Who I am", `<p class="intro">I was born and raised in Latimer. I live with ${nm("marisol")} on Pecan Street and work the warehouse floor at Gulf South. I'm running because the west side floods every spring, because the water rates land on renters like me, and because nobody on the board rents.</p>`)}
          ${sec(2, "What I'm like", `<div class="perks">${PERKS.map(([n, s, l]) => `<div class="perk"><div class="perkname"><b>${n}</b><span>${s}</span></div><p>${l}</p></div>`).join("")}</div>`)}
        </div>
        <div class="mx3col">
          ${sec(3, "What people say about me", `<div class="said">${said.map(([k, rel, tag, q]) => `<figure><div class="saidtag">${tag}</div><blockquote>“${q}”</blockquote><figcaption>${nm(k)}, ${rel}</figcaption></figure>`).join("")}</div>`)}
          ${sec(4, "My people", `<p class="hispeople">I'm closest to my mother, ${nm("denise")}, to ${nm("kayla")}, to ${nm("hal")} downstairs and to ${nm("earl")} at work.</p>`)}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- Person card: someone else, as you see them (the approved You build) ---------- */
LOOKS.hale = LOOKS.hale || {
  f: "people/woman-slim-look-pantsuitblack-stand-front.png",
  w: 234,
  h: 707,
  x: 116.0,
  t: 5,
  hw: 82,
};
WHO.hill = [
  "Marcus Hill",
  "Alderman for District 1. He chairs the board's finance committee.",
];
WHO.whitfield = ["Carol Whitfield", "Mayor of Latimer since 2021."];
/* a fading bust from any pack figure: rows 0 to `end`, scaled by k, centered in the 320px column */
function cardBust(key, k, end, alt) {
  const L = LOOKS[key];
  return `<div class="mxglow"><div class="mxbust" style="height:${Math.round(end * k) + 6}px"><img src="img/${L.f}" alt="${alt}" style="height:${Math.round(L.h * k)}px;left:${Math.round(160 - L.x * k)}px;top:6px"></div></div>`;
}
/* how I see her: only traits I've seen, as perceptions, never a strength level (pole labels from TRAIT_SHAPES) */
const HALE_SEEN = [
  [
    "Follows through",
    "She had my papers checked and stamped before City Hall closed at five.",
  ],
  [
    "Thinks it through",
    "She caught the old Cherry Street address on the voter rolls before I did.",
  ],
  ["Reserved", "She stamped my papers without looking up."],
];
function personHale() {
  const said = [
    [
      "hal",
      "my neighbor",
      "Won't take sides",
      "She's run every election since '98, and neither party has ever gotten her to lean. We've both tried.",
    ],
    [
      "hill",
      "alderman for District 1",
      "Runs a clean election",
      "Every ballot in this town goes through her hands. Nobody's ever asked for a recount.",
    ],
    [
      "earl",
      "my coworker",
      "Never forgets a name",
      "I paid a water bill at that counter once, eleven years ago. She still says hello to me by name.",
    ],
  ];
  const sec = (depth, title, body) =>
    `<section class="sec strips dp${depth}"><h3 class="sechead">${title}</h3><div class="secbody">${body}</div></section>`;
  return `<div class="mx3 strips ol-g">
    <div class="mx3left"><div class="ck"><div class="banner mxbanner"><h2>Margaret Hale</h2><p>City clerk, Town of Latimer</p></div></div>
      ${cardBust("hale", 2.7, 158, "Margaret Hale")}</div>
    <div class="mx3main">
      <div class="mx3cols">
        <div class="mx3col">
          ${sec(1, "Who she is", `<p class="intro">She's run the clerk's office at City Hall since 1998, after twelve years in the tax office, and every Latimer election since. She remembers every name. She doesn't take sides, and she says so.</p>`)}
          ${sec(2, "How I see her", `<div class="perks">${HALE_SEEN.map(([n, l]) => `<div class="perk"><div class="perkname"><b>${n}</b></div><p>${l}</p></div>`).join("")}</div>`)}
          ${sec(5, "Between us", `<p class="intro">She took my qualifying papers on January 14 and told me the voter rolls still had me on Cherry Street, in District 4. I have until February 7 to fix it. She was fair about it, and I think she'd be fair to anyone.</p>`)}
        </div>
        <div class="mx3col">
          ${sec(3, "What people say about her", `<div class="said">${said.map(([k, rel, tag, q]) => `<figure><div class="saidtag">${tag}</div><blockquote>“${q}”</blockquote><figcaption>${nm(k)}, ${rel}</figcaption></figure>`).join("")}</div>`)}
          ${sec(4, "Her people", `<p class="hispeople">I don't know her family. At City Hall she answers to the Board of Aldermen and Mayor ${nm("whitfield")}, and ${nm("hal")} has known her since he sat on the board.</p>`)}
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- Budget: Mix (The Political Process's departments, Suzerain's typed pages) ---------- */
const DEPTS = [
  {
    n: "Taxes and revenue",
    head: "Margaret Hale",
    title: "City clerk",
    amt: 4240000,
    last: 4050000,
    about:
      "What the town takes in this year: property tax at 38 mills, its share of the state's sales tax, water bills, fees and grants.",
    items: [
      ["Property tax", null, 1140000, 1180000],
      ["Sales tax", null, 1270000, 1320000],
      ["Water and sewer bills", null, 990000, 1020000],
      ["Utility franchise fees", null, 205000, 210000],
      ["State and federal grants", null, 180000, 240000],
      ["Court fines and fees", null, 168000, 160000],
      ["Licenses and permits", null, 97000, 110000],
    ],
  },
  {
    n: "Required payments",
    head: null,
    title: "Set by law and contract",
    amt: 728000,
    last: 708000,
    about:
      "Payments the town owes no matter what the board decides: the water bonds, state retirement and the yearly audit.",
    items: [
      ["Water bond payments", null, 410000, 410000],
      ["State retirement", null, 272000, 290000],
      ["Yearly audit", null, 26000, 28000],
    ],
  },
  {
    n: "Police department",
    head: "Ray Odom",
    title: "Police chief",
    amt: 1050000,
    last: 1010000,
    about:
      "Eleven officers on patrol, two new patrol cars to replace the oldest, and the fees the county charges for every night someone is held in its jail.",
    items: [
      ["Officers' pay and benefits", 840000, 790000, 812000],
      ["Patrol cars", 120000, 90000, 96000],
      ["Fuel", 50000, 47000, 48000],
      ["Jail fees", 56000, 52000, 56000],
      ["Equipment and radios", 44000, 31000, 38000],
    ],
  },
  {
    n: "Streets and drainage",
    head: "Tommy Rhodes",
    title: "Public works director",
    amt: 610000,
    last: 540000,
    about:
      "The first half of the Pecan Street paving, Main to Cypress, and a crew of five. Drainage repairs on the west side were cut back this year.",
    items: [
      ["Pecan Street paving", 170000, 0, 170000],
      ["Crew pay and benefits", 288000, 276000, 288000],
      ["Drainage repairs", 140000, 214000, 92000],
      ["Equipment and fuel", 64000, 50000, 60000],
    ],
  },
  {
    n: "Water and sewer",
    head: "Tommy Rhodes",
    title: "Public works director",
    amt: 980000,
    last: 950000,
    about:
      "The treatment plant runs around the clock. Pipe repairs and a crew of six keep the old lines going.",
    items: [
      ["Treatment plant", 420000, 410000, 420000],
      ["Pipe repairs", 290000, 250000, 260000],
      ["Crew pay and benefits", 300000, 290000, 300000],
    ],
  },
  {
    n: "Fire department",
    head: "Dale Burks",
    title: "Fire chief",
    amt: 520000,
    last: 505000,
    about:
      "Six paid firefighters, twenty volunteers paid by the call, and the payments on two engines.",
    items: [
      ["Firefighters' pay and benefits", 410000, 388000, 398000],
      ["Volunteer pay", 42000, 40000, 42000],
      ["Truck payments and upkeep", 80000, 77000, 80000],
    ],
  },
  {
    n: "Town hall and court",
    head: "Margaret Hale",
    title: "City clerk",
    face: "hale",
    amt: 232000,
    last: 220000,
    about:
      "The clerk's office, the town election in April and June, and the municipal court.",
    items: [
      ["Clerk's office and elections", 128000, 120000, 128000],
      ["Municipal court", 64000, 62000, 64000],
      ["Building and insurance", 40000, 38000, 40000],
    ],
  },
  {
    n: "Parks and library",
    head: null,
    title: "Library board",
    amt: 190000,
    last: 185000,
    about:
      "Two library staff and new books, mowing the parks, and lifeguards for the summer pool.",
    items: [
      ["Library", 112000, 110000, 112000],
      ["Parks and the summer pool", 80000, 75000, 78000],
    ],
  },
];
let mixSel = 2;
function budMix() {
  const d = DEPTS[mixSel];
  const lead = (label, amt) =>
    `<div class="t"><span>${label}</span><i></i><em>${amt}</em></div>`;
  return `<div class="ex">${polHead()}
    <div class="bm">
      <div class="bmlist">${DEPTS.map((x, i) => `<div class="bmdept pick${i === mixSel ? " sel" : ""}" data-mix="${i}" tabindex="0" role="button"><div><b>${x.n}</b><em>${H.usd(x.amt)}</em><span>${x.head ? `${x.head}, ${x.title.toLowerCase()}` : x.title}</span></div></div>`).join("")}</div>
      <div class="bmpage ink">
        <h3>${d.n.toUpperCase()}</h3>
        <p class="bmabout">${d.about}</p>
        <div class="bmlines">${d.items.map(([n, ask, last, amt]) => `<div class="dl">${lead(n, H.usd(amt))}<p class="bmsub">${ask != null ? `Asked ${H.usd(ask)} · ` : ""}Last year ${H.usd(last)}</p></div>`).join("")}</div>
        <div class="dl bmtotal">${lead("TOTAL", H.usd(d.amt))}<p class="bmsub">Last year ${H.usd(d.last)}</p></div>
        ${d.head ? `<div class="bmsign"><div class="hand">${d.head}</div><span>${d.title.toUpperCase()}</span></div>` : `<div class="bmsign"><span>${d.title.toUpperCase()}</span></div>`}
      </div>
      <div class="bmtot ink">
        <h3>TOWN OF LATIMER</h3><p class="bmsub" style="margin-bottom:10px">Fiscal year 2025</p>
        <div class="dl">${lead("COMING IN", "$4,240,000")}<p class="bmsub">Last year $4,050,000</p></div>
        <div class="dl">${lead("GOING OUT", "$4,310,000")}<p class="bmsub">Last year $4,120,000</p></div>
        <div class="dl">${lead("BALANCE", "$70,000 short")}</div>
        <div class="dl">${lead("SAVINGS", "$412,000")}</div>
        <div class="dl">${lead("OWED", "$3,100,000")}</div>
      </div>
    </div></div>`;
}

/* ---------- Money: Mix (statement and ledger set straight on the panel) ---------- */
function monMix() {
  return `<div class="mm ink">
    <div><h3 class="docH">COPIAH BANK</h3><p class="typedI small" style="margin-bottom:12px">John Spencer · Checking ····4471 · through January 20, 2025</p>
      <div class="stmtI">${STMT.map(([d, t, a, b]) => `<div class="dl"><div class="t"><span>${d}  ${t}</span><i></i><em>${a == null ? "" : sgn(a)}</em><em class="bal">$${b.toLocaleString("en-US")}.00</em></div></div>`).join("")}</div>
      <div class="dl" style="margin-top:12px"><div class="t tbal"><span>BALANCE TODAY</span><i></i><em>$1,940.00</em></div></div>
      ${putin()}
    </div>
    <div><h3 class="handI" style="font-size:34px;line-height:1;margin-bottom:2px">Spencer for Alderman</h3><p class="typedI small" style="margin-bottom:10px">Campaign account · report due March 25</p>
      <div class="ledgI">${LEDG.map(([d, t, i, o, b]) => `<div class="lrow"><span class="handI">${d}</span><span class="handI">${t}</span><em class="handI">${i ? "+$" + i : "−$" + o}</em><em class="handI">$${b.toLocaleString("en-US")}</em></div>`).join("")}</div>
      <div class="lrow tot"><span></span><span class="typedI">Raised $1,250 · spent $310</span><em></em><em class="typedI">$940</em></div>
    </div></div>`;
}

/* ---------- Government: Local, State, Federal, in the approved build (strips, fading busts, names in sentences) ---------- */
/* faces: the prototype's own mapping, one pack person each; everyone else is a name */
Object.assign(LOOKS, {
  garrity: {
    f: "people/man-heavy-look-suitnavy-stand-front.png",
    w: 240,
    h: 707,
    x: 120.0,
    t: 6,
    hw: 80,
  },
  marsh: {
    f: "people/woman-medium-look-pantsuitnavy-stand-front.png",
    w: 232,
    h: 710,
    x: 114.5,
    t: 8,
    hw: 81,
  },
  holcomb: {
    f: "people/man-medium-look-suitnavy-s05.png",
    w: 261,
    h: 675,
    x: 125.0,
    t: 4,
    hw: 90,
  },
  whitfield: {
    f: "people/woman-heavy-look-blazercamel-s05.png",
    w: 260,
    h: 622,
    x: 121.5,
    t: 6,
    hw: 95,
  },
});
const PTY = { D: "Democrat", R: "Republican", I: "independent" };
const pty = (p) => (p ? `<em class="pt pt${p}">${PTY[p]}</em>` : "");
/* everyone you can click on Government: name, title, party, a few plain facts, and what's between you */
const GP = {
  whitfield: {
    n: "Carol Whitfield",
    t: "Mayor of Latimer",
    p: "D",
    face: "whitfield",
    who: "She ran the Latimer Chamber of Commerce for ten years, then won the open mayor's race in 2021 with 61 percent. She signs almost everything the board sends her.",
    us: "We've shaken hands at the Christmas parade. She doesn't know I'm running yet.",
  },
  hale: {
    n: "Margaret Hale",
    t: "City clerk",
    face: "hale",
    who: "She's run the clerk's office since 1998 and every Latimer election since. She doesn't take sides, and says so.",
    us: "She took my qualifying papers on January 14 and caught the old address on the voter rolls.",
  },
  odom: {
    n: "Ray Odom",
    t: "Police chief",
    who: "He came up through the department and has led its eleven officers since 2018. He knows most people in town by their cars.",
    us: "We've never talked.",
  },
  burks: {
    n: "Dale Burks",
    t: "Fire chief",
    who: "He has led the fire department since 2012: six paid firefighters and twenty volunteers.",
    us: "We've never talked.",
  },
  rhodes: {
    n: "Tommy Rhodes",
    t: "Public works director",
    who: "The board hired him from the county road department in 2022. He keeps a map of every storm drain in town on the wall of his truck shed.",
    us: "I asked him about the west side ditches after the January 6 meeting. He said it's all in the bond.",
  },
  hill: {
    n: "Marcus Hill",
    t: "Alderman, District 1",
    p: "D",
    who: "He took over Hill's Pharmacy from his father in 2002 and won District 1 in 2015. He chairs the finance committee and opens every meeting with a prayer.",
    us: "He voted for the water rate increase.",
  },
  cole: {
    n: "Daniel Cole",
    t: "Alderman, District 2",
    p: "R",
    who: "He owns the insurance office on Highway 51 and won District 2 by 92 votes in 2021. He voted for the water rate increase and says he'd do it again.",
    us: "He holds the seat I'm running for. We've shaken hands once, at the Christmas parade.",
  },
  price: {
    n: "Angela Price",
    t: "Alderwoman, District 3",
    p: "D",
    who: "She teaches fifth grade and won District 3 in 2019 after the fight to keep the library open.",
    us: "She voted against the water rate increase, with Priya Nair.",
  },
  greer: {
    n: "Walter Greer",
    t: "Alderman, District 4",
    p: "R",
    who: "The longest-serving member of the board, since 2009. He votes no on new spending unless it's for roads.",
    us: "We've never talked.",
  },
  nair: {
    n: "Priya Nair",
    t: "Alderwoman, District 5",
    p: "I",
    who: "A pharmacist who ran as an independent in 2021 and won a three-way race. She's the swing vote on most things.",
    us: "She voted against the water rate increase.",
  },
  freeman: {
    n: "Joyce Freeman",
    t: "Alderwoman, at large",
    p: "D",
    who: "She runs the funeral home her parents opened and won the at-large seat in 2017. She speaks last at every meeting.",
    us: "We've never talked.",
  },
  holcomb: {
    n: "Wade Holcomb",
    t: "Governor of Mississippi",
    p: "R",
    face: "holcomb",
    who: "Insurance commissioner from Rankin County before he was governor. He signed the 2022 income tax cut and can't run again in 2027.",
    us: "We've never met.",
  },
  haynes: {
    n: "Delbert Haynes",
    t: "Lieutenant governor",
    p: "R",
    who: "He has presided over the state Senate since 2020.",
    us: "We've never met.",
  },
  carver: {
    n: "Lynn Carver",
    t: "Attorney general",
    p: "R",
    who: "The state's attorney general.",
    us: "We've never met.",
  },
  ritter: {
    n: "Paul Ritter",
    t: "Secretary of state",
    p: "R",
    who: "He runs the state's elections and keeps its business filings.",
    us: "We've never met.",
  },
  hollins: {
    n: "Tamika Hollins",
    t: "State representative, House District 73",
    p: "D",
    who: "She has represented House District 73 since 2016.",
    us: "She's my representative. We've never met.",
  },
  lofton: {
    n: "Bobby Ray Lofton",
    t: "State senator, Senate District 37",
    p: "R",
    who: "He has held Senate District 37 since 2012.",
    us: "He's my state senator. We've never met.",
  },
  bufkin: {
    n: "Clay Bufkin",
    t: "Speaker of the House",
    p: "R",
    who: "Speaker of the Mississippi House since 2024.",
    us: "We've never met.",
  },
  garrity: {
    n: "Thomas Garrity",
    t: "President of the United States",
    p: "R",
    face: "garrity",
    who: "Two terms as governor of Ohio. He won with 49.8 percent and carried Mississippi by 21 points. He was sworn in today at noon.",
    us: "I didn't vote for him.",
  },
  marsh: {
    n: "Ellen Marsh",
    t: "Vice president",
    p: "R",
    face: "marsh",
    who: "Eight years as a U.S. senator from Arizona. She was sworn in today and breaks ties in a Senate split 53 to 47.",
    us: "We've never met.",
  },
  okafor: {
    n: "Ruth Okafor",
    t: "Secretary of state, nominated",
    p: "R",
    who: "Nominated for secretary of state. The Senate hasn't voted yet.",
    us: "We've never met.",
  },
  pryor: {
    n: "Daniel Pryor",
    t: "Treasury secretary, nominated",
    p: "R",
    who: "Nominated for the Treasury. The Senate hasn't voted yet.",
    us: "We've never met.",
  },
  velez: {
    n: "Karen Velez",
    t: "Attorney general, nominated",
    p: "R",
    who: "Nominated for attorney general. The Senate hasn't voted yet.",
    us: "We've never met.",
  },
  ashby: {
    n: "Glenn Ashby",
    t: "U.S. representative, Mississippi's 3rd District",
    p: "R",
    who: "He has held the 3rd District since 2019.",
    us: "He's my congressman. We've never met.",
  },
  sloan: {
    n: "Margaret Sloan",
    t: "U.S. senator",
    p: "R",
    who: "In the Senate since 2018. She's up again in 2026.",
    us: "We've never met.",
  },
  wicks: {
    n: "Roger Wicks",
    t: "U.S. senator",
    p: "R",
    who: "In the Senate since 2008. He's up again in 2030.",
    us: "We've never met.",
  },
  tate: {
    n: "Lorraine Tate",
    t: "Municipal judge",
    who: "Appointed by the board in 2016. She hears traffic tickets and misdemeanors inside town.",
    us: "We've never met.",
  },
  mangold: {
    n: "Billy Mangold",
    t: "Justice court judge",
    who: "Elected in 2011. He's up again in 2027.",
    us: "We've never met.",
  },
  rowe: {
    n: "Samuel Rowe",
    t: "Circuit judge, 22nd District",
    who: "Elected in 2015. He's up again in 2026.",
    us: "We've never met.",
  },
  pickett: {
    n: "Anne Pickett",
    t: "Chancellor",
    who: "Elected in 2019. She's up again in 2026.",
    us: "We've never met.",
  },
};
const SUP_MS = [
  ["Harold Beasley", "Chief justice", "Central District, since 2009"],
  ["Diane Kwan", "Presiding justice", "Northern District, since 2012"],
  ["Earl Tisdale", "Justice", "Southern District, since 2016"],
  ["Nadia Rao", "Justice", "Central District, since 2019"],
  ["Colby Strait", "Justice", "Northern District, since 2021"],
  ["Mei Ford", "Justice", "Southern District, since 2018"],
  ["Grant Mabry", "Justice", "Central District, since 2014"],
  ["Lucia Ortega", "Justice", "Northern District, since 2020"],
  ["Samir Haddad", "Justice", "Southern District, since 2023"],
];
const SUP_US = [
  [
    "Arthur Kessler",
    "Chief justice",
    "appointed by President Morrow, since 2005",
  ],
  ["Helen Park", "Justice", "President Ashford, since 2010"],
  ["Vikram Sethi", "Justice", "President Ashford, since 2009"],
  ["Leela Menon", "Justice", "President Brennan, since 2022"],
  ["Michael Brandt", "Justice", "President Morrow, since 2006"],
  ["Maya Kapoor", "Justice", "President Brennan, since 2020"],
  ["Peter Lowell", "Justice", "President Lyle, since 2017"],
  ["Carmen Diaz", "Justice", "President Lyle, since 2018"],
  ["Grace Yun", "Justice", "President Ashford, since 2012"],
];
for (const [list, court] of [
  [SUP_MS, "Supreme Court of Mississippi"],
  [SUP_US, "Supreme Court of the United States"],
])
  for (const [n, t, l] of list)
    GP["j-" + n] = {
      n,
      t: `${t}, ${court}`,
      who: `${t} on the ${court}: ${l}.`,
      us: "We've never met.",
    };
/* every vote opens a bill card */
const BILLS2 = {
  "water-rate": {
    n: "Water rate increase, $6 a month",
    body: "Latimer Board of Aldermen",
    res: "Passed 4 to 2 on January 6.",
    how: "Yes: Hill, Cole, Greer and Freeman. No: Price and Nair.",
    now: "In force since February 1. I spoke against it that night.",
    what: "Raises every household's water bill by $6 a month to pay for the treatment plant and the water bonds.",
  },
  paving: {
    n: "Pecan Street paving, $340,000",
    body: "Latimer Board of Aldermen",
    res: "Passed 6 to 0 on December 17.",
    how: "All six voted yes.",
    now: "Work starts in March, Main to Cypress first.",
    what: "Paves Pecan Street in two halves, half paid by a state grant.",
  },
  homestead: {
    n: "Homestead exemption raised to $9,000",
    body: "Latimer Board of Aldermen",
    res: "Passed 5 to 1 on November 19.",
    how: "Walter Greer voted no.",
    now: "In force for the 2025 tax bills.",
    what: "Takes the first $9,000 of a home's value off the town's property tax.",
  },
  grocery: {
    n: "Grocery sales tax cut from 7% to 5%",
    body: "Mississippi Legislature",
    res: "Passed the House 109 to 10 on January 16.",
    how: "Tamika Hollins voted yes.",
    now: "In the Senate Finance Committee.",
    what: "Cuts the state's sales tax on groceries from 7 percent to 5.",
  },
  teacher: {
    n: "Teacher pay raise, $2,000",
    body: "Mississippi Legislature",
    res: "Passed the Senate 50 to 1 on January 14.",
    how: "Bobby Ray Lofton voted yes.",
    now: "In the House Education Committee.",
    what: "Raises every public school teacher's pay by $2,000 a year.",
  },
  disaster: {
    n: "Disaster aid for Gulf Coast flooding, $4.1 billion",
    body: "Congress",
    res: "Passed the House 351 to 72 on January 15.",
    how: "Glenn Ashby voted yes.",
    now: "In the Senate.",
    what: "Pays for flood recovery on the Gulf Coast after last fall's storms.",
  },
};
const gnm = (id, text) =>
  `<span class="nm pick" tabindex="0" role="button" data-card="${esc(id)}">${esc(text || GP[id].n)}</span>`;
const vote = (id) => {
  const b = BILLS2[id];
  return `<div class="vote2 pick" tabindex="0" role="button" data-bill="${id}"><b>${esc(b.n)}</b><p>${esc(b.res)} ${esc(b.how)}</p></div>`;
};
function govBust(key, w, end, k) {
  const L = LOOKS[key];
  return `<div class="mxglow gbglow" style="width:${w}px"><div class="mxbust" style="width:${w}px;height:${Math.round(end * k) + 6}px"><img src="img/${L.f}" alt="" style="height:${Math.round(L.h * k)}px;left:${Math.round(w / 2 - L.x * k)}px;top:6px"></div></div>`;
}
const gsec = (depth, title, body, cls = "") =>
  `<section class="sec strips dp${depth} ${cls}"><h3 class="sechead">${title}</h3><div class="secbody">${body}</div></section>`;
const seats = (rows) =>
  rows
    .map(
      ([label, parts]) =>
        `<div class="seatrow">${label ? `<span class="seatlabel">${label}</span>` : ""}${parts.map(([p, n]) => `<div class="seatn"><b class="pt${p}">${n}</b><span>${n === 1 && p === "I" ? "independent" : p === "I" ? "independents" : PTY[p] + "s"}</span></div>`).join("")}</div>`,
    )
    .join("");
const leader = (id, role, facts, wants) => {
  const g = GP[id];
  return `<div class="leader2">${govBust(g.face, 210, 168, 1.62)}<div class="lead2text"><h4>${gnm(id)}</h4><p class="lead2sub">${pty(g.p)} · ${esc(role)}</p><p class="intro">${facts}</p>${wants ? `<div class="wants2"><span>What ${wants[0]} wants</span>${wants[1].map((w) => `<p>${esc(w)}</p>`).join("")}</div>` : ""}</div></div>`;
};

const GOVBODY = {
  Local: {
    Legislative: () => ({
      pic: "public-meeting-room__midday.jpg",
      name: "Latimer Board of Aldermen",
      line: "City Hall · meets the 1st and 3rd Tuesdays at 6 PM",
      body: `<div class="gcols g3">
        ${gsec(
          1,
          "The board",
          `${seats([
            [
              "",
              [
                ["D", 3],
                ["R", 2],
                ["I", 1],
              ],
            ],
          ])}<p class="intro">Five aldermen are elected by district and one by the whole town. The next town election is June 3.</p>`,
        )}
        ${gsec(2, "Who's on it", `<p class="intro">${gnm("hill")} for District 1, ${gnm("cole")} for District 2, ${gnm("price")} for District 3, ${gnm("greer")} for District 4, ${gnm("nair")} for District 5 and ${gnm("freeman")} at large.</p><p class="intro" style="margin-top:8px">${gnm("cole")} holds my seat. He's the one I'm running to replace.</p>`)}
        ${gsec(3, "Recent votes", `${vote("water-rate")}${vote("paving")}${vote("homestead")}`)}
      </div>`,
    }),
    Executive: () => ({
      pic: "public-meeting-room__midday.jpg",
      name: "Latimer City Hall",
      line: "Latimer, Mississippi",
      body: `<div class="gcols g2w">
        ${gsec(1, "The mayor", leader("whitfield", "Mayor of Latimer", "She won the open mayor's race in 2021 with 61 percent and is up again on June 3. Before that she ran the Chamber of Commerce for ten years.", ["she", ["Bring the Highway 8 store and its nine jobs to town", "Finish the Pecan Street paving before summer", "Keep the town's property tax at 38 mills"]]))}
        ${gsec(2, "Who runs City Hall", `<p class="intro">${gnm("hale")} has been city clerk since 1998. ${gnm("odom")} has led the eleven officers of the police department since 2018, and ${gnm("burks")} the fire department's six firefighters and twenty volunteers since 2012. ${gnm("rhodes")} has run public works since 2022.</p>`)}
      </div>`,
    }),
    Judicial: () => ({
      pic: "county-courtroom__midday.jpg",
      name: "The courts that hear Latimer's cases",
      line: "Copiah County, Mississippi",
      body: `<div class="gcols g2">
        ${gsec(1, "In town and the county", `<p class="intro">The Latimer Municipal Court hears traffic tickets and misdemeanors inside town. Judge ${gnm("tate")} has sat there since 2016, appointed by the board.</p><p class="intro" style="margin-top:8px">The Copiah County Justice Court takes small claims, evictions and county misdemeanors, under Judge ${gnm("mangold")}, elected in 2011.</p>`)}
        ${gsec(2, "The district", `<p class="intro">The Circuit Court for the 22nd District hears felonies and large lawsuits for Copiah, Claiborne and Jefferson counties. Judge ${gnm("rowe")} was elected in 2015.</p><p class="intro" style="margin-top:8px">The Copiah County Chancery Court handles divorce, custody, wills and land. Chancellor ${gnm("pickett")} was elected in 2019.</p>`)}
      </div>`,
    }),
  },
  State: {
    Legislative: () => ({
      pic: "state-house-chamber__midday.jpg",
      name: "Mississippi Legislature",
      line: "In session January 7 to April 6, 2025 · Jackson",
      body: `<div class="gcols g3">
        ${gsec(
          1,
          "The chamber",
          `${seats([
            [
              "House",
              [
                ["R", 79],
                ["D", 41],
                ["I", 2],
              ],
            ],
            [
              "Senate",
              [
                ["R", 36],
                ["D", 16],
              ],
            ],
          ])}<p class="intro">Bills have to clear committee by February 4 and pass the other chamber by March 13.</p>`,
        )}
        ${gsec(2, "Who represents me", `<p class="intro">${gnm("hollins")}, a Democrat, has held House District 73 since 2016. ${gnm("lofton")}, a Republican, has been my state senator for District 37 since 2012.</p>`)}
        ${gsec(3, "Recent votes", `${vote("grocery")}${vote("teacher")}`)}
        ${gsec(4, "Who leads", `<p class="intro">${gnm("bufkin")} has been speaker of the House since 2024. Lieutenant Governor ${gnm("haynes")} has presided over the Senate since 2020.</p>`, "span2")}
      </div>`,
    }),
    Executive: () => ({
      pic: "state-house-chamber__midday.jpg",
      name: "Mississippi State Capitol",
      line: "Jackson",
      body: `<div class="gcols g2w">
        ${gsec(1, "The governor", leader("holcomb", "Governor of Mississippi", "Insurance commissioner from Rankin County before this. He's governor since 2020, signed the 2022 income tax cut, and can't run again in 2027.", ["he", ["Phase out the state income tax", "Fix 1,100 closed rural bridges", "No Medicaid expansion"]]))}
        ${gsec(2, "The statewide offices", `<p class="intro">Lieutenant Governor ${gnm("haynes")} has presided over the Senate since 2020. ${gnm("carver")} is attorney general, and ${gnm("ritter")} is secretary of state. All three are Republicans.</p>`)}
      </div>`,
    }),
    Judicial: () => ({
      pic: "county-courtroom__midday.jpg",
      name: "Supreme Court of Mississippi",
      line: "Jackson",
      body: `<div class="gcols g1">${gsec(
        1,
        "The justices",
        `<p class="intro">It hears appeals from every court in the state. Chief Justice ${gnm("j-Harold Beasley", "Harold Beasley")} has led it since 2009, with Presiding Justice ${gnm("j-Diane Kwan", "Diane Kwan")}. The other justices are ${SUP_MS.slice(
          2,
        )
          .map(([n]) => gnm("j-" + n, n))
          .join(", ")
          .replace(/, ([^,]*)$/, " and $1")}.</p>`,
      )}</div>`,
    }),
  },
  Federal: {
    Legislative: () => ({
      pic: "chamber.jpg",
      name: "Congress",
      line: "The 119th Congress · Washington",
      body: `<div class="gcols g3">
        ${gsec(
          1,
          "The chamber",
          `${seats([
            [
              "House",
              [
                ["R", 220],
                ["D", 215],
              ],
            ],
            [
              "Senate",
              [
                ["R", 53],
                ["D", 45],
                ["I", 2],
              ],
            ],
          ])}<p class="intro">Government funding runs out on March 14.</p>`,
        )}
        ${gsec(2, "Who represents me", `<p class="intro">${gnm("ashby")} has held Mississippi's 3rd District since 2019. My senators are ${gnm("sloan")}, up in 2026, and ${gnm("wicks")}, up in 2030. All three are Republicans.</p>`)}
        ${gsec(3, "Recent votes", vote("disaster"))}
      </div>`,
    }),
    Executive: () => ({
      pic: "white-house-exterior__midday.jpg",
      name: "The White House",
      line: "Washington",
      body: `<div class="gcols g3w">
        ${gsec(1, "The president", leader("garrity", "President of the United States", "Two terms as governor of Ohio. He won with 49.8 percent, carried Mississippi by 21 points, and was sworn in today at noon.", ["he", ["Cut income taxes for working families", "Secure the southern border", "Bring factory jobs back from overseas"]]))}
        ${gsec(2, "The vice president", leader("marsh", "Vice president", "Eight years as a U.S. senator from Arizona. Sworn in today, she breaks ties in a Senate split 53 to 47.", null))}
        ${gsec(3, "The cabinet", `<p class="intro">${gnm("okafor")} for secretary of state, ${gnm("pryor")} for the Treasury and ${gnm("velez")} for attorney general are nominated and waiting on the Senate.</p>`)}
      </div>`,
    }),
    Judicial: () => ({
      pic: "county-courtroom__midday.jpg",
      name: "Supreme Court of the United States",
      line: "Washington",
      body: `<div class="gcols g1">${gsec(
        1,
        "The justices",
        `<p class="intro">The last word on the Constitution and federal law. Chief Justice ${gnm("j-Arthur Kessler", "Arthur Kessler")} has led it since 2005. The other justices are ${SUP_US.slice(
          1,
        )
          .map(([n]) => gnm("j-" + n, n))
          .join(", ")
          .replace(/, ([^,]*)$/, " and $1")}.</p>`,
      )}</div>`,
    }),
  },
};
let govBranch = "Executive";
function govScreen(level) {
  const b = GOVBODY[level][govBranch]();
  return `<div class="ex gov2">
    <div style="display:flex;gap:12px;align-items:center">${tabsData(["Local", "State", "Federal"], level, "gl")}${tabsData(["Legislative", "Executive", "Judicial"], govBranch, "gb")}</div>
    <div class="govpic" style="background-image:url(img/${b.pic})"><div><b>${esc(b.name)}</b><span>${esc(b.line)}</span></div></div>
    ${b.body}
  </div>`;
}
const tabsData = (list, curv, key) =>
  `<div class="tabrail small">${list.map((t) => `<button type="button" data-${key}="${t}" class="${t === curv ? "on" : ""}">${t}</button>`).join("")}</div>`;
/* the small cards a click opens: a person, in the approved person-card style, or a bill */
const SHE = new Set([
  "whitfield",
  "hale",
  "price",
  "nair",
  "freeman",
  "hollins",
  "marsh",
  "okafor",
  "velez",
  "sloan",
  "tate",
  "pickett",
]);
function personCard2(id) {
  const g = GP[id];
  return `<div class="card2"><button class="x cx" type="button" data-cardclose aria-label="Close">${X}</button>
    <div class="card2head">${g.face ? govBust(g.face, 150, 150, 1.2) : ""}<div><h4>${esc(g.n)}</h4><p class="lead2sub">${g.p ? pty(g.p) + " · " : ""}${esc(g.t)}</p></div></div>
    ${gsec(1, id.startsWith("j-") || id === "carver" ? "Who they are" : SHE.has(id) ? "Who she is" : "Who he is", `<p class="intro">${esc(g.who)}</p>`)}
    ${gsec(5, "Between us", `<p class="intro">${esc(g.us)}</p>`)}
  </div>`;
}
function billCard(id) {
  const b = BILLS2[id];
  return `<div class="card2"><button class="x cx" type="button" data-cardclose aria-label="Close">${X}</button>
    <div class="card2head"><div><h4>${esc(b.n)}</h4><p class="lead2sub">${esc(b.body)}</p></div></div>
    ${gsec(1, "What it does", `<p class="intro">${esc(b.what)}</p>`)}
    ${gsec(2, "The vote", `<p class="intro">${esc(b.res)} ${esc(b.how)}</p>`)}
    ${gsec(5, "Where it is now", `<p class="intro">${esc(b.now)}</p>`)}
  </div>`;
}

/* ---------- Budgets, Mix: strips (the approved build: departments, a typed page set on the panel, the money, who wrote it) ---------- */
/* items: [name, asked (null when nobody asks), last year, this year], from the prototype's BUDGETS */
const BUDLV = {
  Latimer: {
    whose: "The town's money",
    fy: "Fiscal year October 1, 2024 to September 30, 2025",
    tot: {
      in: 4240000,
      inLast: 4050000,
      out: 4310000,
      outLast: 4120000,
      bal: "$70,000 short",
      save: 412000,
      owed: 3100000,
    },
    wrote: {
      id: "whitfield",
      line: "proposed this budget in August, and the Board of Aldermen adopted it on September 9, 2024.",
    },
    depts: DEPTS.map((d) => ({
      n: d.n,
      head:
        {
          "Margaret Hale": "hale",
          "Ray Odom": "odom",
          "Tommy Rhodes": "rhodes",
          "Dale Burks": "burks",
        }[d.head] || null,
      title: d.title,
      amt: d.amt,
      last: d.last,
      about: d.about,
      items: d.items,
    })),
  },
  "Copiah County": {
    whose: "The county's money",
    fy: "Fiscal year October 1, 2024 to September 30, 2025",
    tot: {
      in: 31800000,
      inLast: 30600000,
      out: 31200000,
      outLast: 30900000,
      bal: "$600,000 left over",
      save: 5400000,
      owed: 12700000,
    },
    wrote: null,
    depts: [
      {
        n: "Taxes and revenue",
        head: null,
        title: "Chancery clerk",
        amt: 31800000,
        last: 30600000,
        about:
          "Property tax at 52 mills, the state's road and bridge aid, the county's share of sales tax, fees and federal grants.",
        items: [
          ["Property tax", null, 13600000, 14100000],
          ["State road and bridge aid", null, 6700000, 6900000],
          ["Sales tax share", null, 4050000, 4200000],
          ["Fees and fines", null, 3050000, 3100000],
          ["Federal grants", null, 3200000, 3500000],
        ],
      },
      {
        n: "Required payments",
        head: null,
        title: "Set by law and contract",
        amt: 4200000,
        last: 4100000,
        about:
          "Debt payments on the county's bonds and its share of state retirement, both set by law.",
        items: [
          ["Debt payments", null, 1900000, 1900000],
          ["State retirement", null, 2200000, 2300000],
        ],
      },
      {
        n: "Sheriff and jail",
        head: null,
        title: "Sheriff",
        amt: 8600000,
        last: 8300000,
        about:
          "Forty-two deputies, the 120-bed jail, and the patrol cars and fuel to cover the county.",
        items: [
          ["Deputies' pay and benefits", 5600000, 5300000, 5400000],
          ["The jail", 2600000, 2400000, 2500000],
          ["Patrol cars and fuel", 800000, 600000, 700000],
        ],
      },
      {
        n: "Roads and bridges",
        head: null,
        title: "Road manager",
        amt: 9800000,
        last: 9900000,
        about:
          "Paving and repairs on county roads, and work on the fourteen bridges that are closed.",
        items: [
          ["Paving and repairs", 4800000, 5000000, 4600000],
          ["Bridges", 3900000, 3100000, 3400000],
          ["Crews and equipment", 1900000, 1800000, 1800000],
        ],
      },
      {
        n: "Courts and county offices",
        head: null,
        title: "Board of Supervisors",
        amt: 5200000,
        last: 5000000,
        about:
          "The circuit, chancery and justice courts, the tax assessor and collector, and the clerks who run elections.",
        items: [
          ["Courts", 2100000, 2000000, 2100000],
          ["Tax assessor and collector", 1400000, 1400000, 1400000],
          ["Elections and the clerks", 1800000, 1600000, 1700000],
        ],
      },
      {
        n: "Health and welfare",
        head: null,
        title: "Board of Supervisors",
        amt: 3400000,
        last: 3600000,
        about:
          "Support for Hardy Wilson Memorial Hospital, the health department, and the county's share of state programs.",
        items: [
          ["Hospital support", 2000000, 2200000, 1900000],
          ["Health department", 900000, 900000, 900000],
          ["Welfare share", 600000, 500000, 600000],
        ],
      },
    ],
  },
  Mississippi: {
    whose: "The state's money",
    fy: "Fiscal year July 1, 2024 to June 30, 2025",
    tot: {
      in: 7.6e9,
      inLast: 7.5e9,
      out: 7.5e9,
      outLast: 7.3e9,
      bal: "$100,000,000 left over",
      save: 1.2e9,
      owed: 5.3e9,
    },
    wrote: {
      id: "holcomb",
      line: "signed this budget on April 28, 2024, after the Legislature passed it.",
    },
    depts: [
      {
        n: "Taxes and revenue",
        head: null,
        title: "State treasurer",
        amt: 7.6e9,
        last: 7.5e9,
        about:
          "The 7 percent sales tax, the income tax at 4.7 percent above $10,000, corporate taxes, and casino, alcohol and tobacco taxes.",
        items: [
          ["Sales tax", null, 2.61e9, 2.69e9],
          ["Individual income tax", null, 2.28e9, 2.15e9],
          ["Corporate income tax", null, 0.72e9, 0.76e9],
          ["Use and other taxes", null, 1.02e9, 1.11e9],
          ["Casino, alcohol and tobacco", null, 0.87e9, 0.89e9],
        ],
      },
      {
        n: "Required payments",
        head: null,
        title: "Set by law and contract",
        amt: 1.53e9,
        last: 1.46e9,
        about:
          "The state's share of Medicaid under the federal matching rules, and payments on the state's bonds.",
        items: [
          ["Medicaid, the state's share", null, 1.05e9, 1.11e9],
          ["Debt payments", null, 0.41e9, 0.42e9],
        ],
      },
      {
        n: "Public schools",
        head: null,
        title: "State superintendent",
        amt: 2.9e9,
        last: 2.8e9,
        about:
          "The school funding formula at $6,300 a student, the buses that get them there, and the testing and the department that runs it.",
        items: [
          ["The school funding formula", 2.85e9, 2.62e9, 2.7e9],
          ["Buses and transportation", 0.12e9, 0.1e9, 0.11e9],
          ["Testing and the department", 0.09e9, 0.08e9, 0.09e9],
        ],
      },
      {
        n: "Universities and colleges",
        head: null,
        title: "Commissioner of higher education",
        amt: 1.05e9,
        last: 1.01e9,
        about:
          "Eight universities, fifteen community colleges, and aid for the students in them.",
        items: [
          ["Eight universities", 0.8e9, 0.72e9, 0.74e9],
          ["Fifteen community colleges", 0.3e9, 0.26e9, 0.27e9],
          ["Student aid", 0.05e9, 0.03e9, 0.04e9],
        ],
      },
      {
        n: "Prisons",
        head: null,
        title: "Corrections commissioner",
        amt: 0.41e9,
        last: 0.395e9,
        about:
          "About 19,000 people in state prisons, probation and parole, and their medical care.",
        items: [
          ["Prisons", 0.35e9, 0.31e9, 0.32e9],
          ["Probation and parole", 0.07e9, 0.06e9, 0.065e9],
          ["Medical care", 0.03e9, 0.025e9, 0.025e9],
        ],
      },
      {
        n: "Attorney general",
        head: "carver",
        title: "Attorney general",
        amt: 0.03e9,
        last: 0.028e9,
        about:
          "The state's prosecutors and appeals, and its consumer protection office.",
        items: [
          ["Prosecutors and appeals", 0.022e9, 0.02e9, 0.021e9],
          ["Consumer protection", 0.01e9, 0.008e9, 0.009e9],
        ],
      },
      {
        n: "Everything else",
        head: null,
        title: "The Legislature",
        amt: 1.58e9,
        last: 1.597e9,
        about:
          "The health department and the Medicaid office, roads and bridges, and every other agency.",
        items: [
          ["Health department and Medicaid office", 0.62e9, 0.62e9, 0.6e9],
          ["Roads and bridges", 0.6e9, 0.53e9, 0.55e9],
          ["Other agencies", 0.45e9, 0.447e9, 0.43e9],
        ],
      },
    ],
  },
  "United States": {
    whose: "The country's money",
    fy: "Fiscal year October 1, 2024 to September 30, 2025",
    tot: {
      in: 5.2e12,
      inLast: 4.9e12,
      out: 7.0e12,
      outLast: 6.75e12,
      bal: "$1,800,000,000,000 short",
      save: 0,
      owed: 36.2e12,
    },
    wrote: null,
    depts: [
      {
        n: "Taxes and revenue",
        head: "pryor",
        title: "Treasury secretary, nominated",
        amt: 5.2e12,
        last: 4.9e12,
        about:
          "Income taxes, the payroll taxes for Social Security and Medicare, the 21 percent corporate tax, and tariffs and excise taxes.",
        items: [
          ["Individual income taxes", null, 2.43e12, 2.6e12],
          ["Payroll taxes", null, 1.69e12, 1.75e12],
          ["Corporate income taxes", null, 0.42e12, 0.45e12],
          ["Everything else", null, 0.36e12, 0.4e12],
        ],
      },
      {
        n: "Required by law",
        head: null,
        title: "Set by law",
        amt: 4.4e12,
        last: 4.05e12,
        about:
          "Social Security, Medicare, Medicaid and the interest on the debt, all paid out by law.",
        items: [
          ["Social Security", null, 1.46e12, 1.58e12],
          ["Medicare", null, 0.87e12, 1.01e12],
          ["Medicaid and other health", null, 0.84e12, 0.86e12],
          ["Interest on the debt", null, 0.88e12, 0.95e12],
        ],
      },
      {
        n: "Defense",
        head: null,
        title: "Secretary of defense",
        amt: 0.86e12,
        last: 0.84e12,
        about:
          "The Army, the Navy and Marines, the Air Force and Space Force, and the rest of the department.",
        items: [
          ["Army", 0.2e12, 0.185e12, 0.19e12],
          ["Navy and Marines", 0.27e12, 0.25e12, 0.26e12],
          ["Air Force and Space Force", 0.27e12, 0.255e12, 0.26e12],
          ["Everything else in defense", 0.16e12, 0.15e12, 0.15e12],
        ],
      },
      {
        n: "Veterans",
        head: null,
        title: "Veterans affairs secretary",
        amt: 0.33e12,
        last: 0.3e12,
        about:
          "Veterans' health care, disability pay and the offices that handle their benefits.",
        items: [
          ["Veterans' health care", 0.15e12, 0.13e12, 0.14e12],
          ["Disability pay", 0.17e12, 0.15e12, 0.17e12],
          ["Benefits offices", 0.02e12, 0.02e12, 0.02e12],
        ],
      },
      {
        n: "Justice",
        head: "velez",
        title: "Attorney general, nominated",
        amt: 0.04e12,
        last: 0.039e12,
        about:
          "The FBI, the federal prisons, and the prosecutors, courts and grants.",
        items: [
          ["FBI", 0.012e12, 0.011e12, 0.011e12],
          ["Federal prisons", 0.009e12, 0.009e12, 0.009e12],
          ["Prosecutors, courts and grants", 0.021e12, 0.019e12, 0.02e12],
        ],
      },
      {
        n: "State Department",
        head: "okafor",
        title: "Secretary of state, nominated",
        amt: 0.06e12,
        last: 0.058e12,
        about: "Embassies and diplomats abroad, and foreign aid.",
        items: [
          ["Embassies and diplomats", 0.02e12, 0.019e12, 0.02e12],
          ["Foreign aid", 0.045e12, 0.039e12, 0.04e12],
        ],
      },
      {
        n: "Everything else",
        head: null,
        title: "Congress",
        amt: 1.31e12,
        last: 1.463e12,
        about:
          "Education, transportation, homeland security and every other agency.",
        items: [
          ["Education", 0.09e12, 0.08e12, 0.08e12],
          ["Transportation", 0.12e12, 0.105e12, 0.11e12],
          ["Homeland security", 0.06e12, 0.06e12, 0.06e12],
          ["Other agencies", 1.1e12, 1.218e12, 1.06e12],
        ],
      },
    ],
  },
};
let budLevel = "Latimer";
const budSelBy = {
  Latimer: 2,
  "Copiah County": 2,
  Mississippi: 2,
  "United States": 2,
};
/* one number style everywhere: whole dollars with commas, so the digits line up */
const usd2 = (n) => "$" + Math.round(n).toLocaleString("en-US");
function budStrips() {
  const L = BUDLV[budLevel],
    sel = budSelBy[budLevel],
    d = L.depts[sel];
  const headWords = (x) =>
    x.head ? `${gnm(x.head)}, ${esc(x.title.toLowerCase())}` : esc(x.title);
  const lead = (label, amt) =>
    `<div class="t"><span>${label}</span><i></i><em>${amt}</em></div>`;
  const sec = (depth, title, body, cls = "") =>
    `<section class="sec strips dp${depth} ${cls}"><h3 class="sechead">${esc(title)}</h3><div class="secbody">${body}</div></section>`;
  const t = L.tot;
  const wrote = L.wrote
    ? sec(
        5,
        "Who wrote it",
        `<div class="wrote2">${govBust(GP[L.wrote.id].face, 120, 150, 0.95)}<p class="intro">${gnm(L.wrote.id)} ${esc(L.wrote.line)}</p></div>`,
      )
    : "";
  return `<div class="ex">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">${tabsData(["Latimer", "Copiah County", "Mississippi", "United States"], budLevel, "bl")}<span class="bfy">${esc(L.fy)}</span></div>
    <div class="bs3">
      ${sec(1, "Departments", `<div class="bsdepts">${L.depts.map((x, i) => `<div class="bsdept pick${i === sel ? " sel" : ""}" data-bsel="${i}" tabindex="0" role="button"><b>${esc(x.n)}</b><em>${usd2(x.amt)}</em><span>${headWords(x)}</span></div>`).join("")}</div>`)}
      ${sec(
        2,
        d.n,
        `<div class="ink bspage">
        <p class="typedI">${esc(d.about)}</p>
        <div class="bmlines">${d.items.map(([n, ask, last, amt]) => `<div class="dl">${lead(esc(n), usd2(amt))}<p class="bmsub">${ask != null ? `Asked ${usd2(ask)} · ` : ""}Last year ${usd2(last)}</p></div>`).join("")}</div>
        <div class="dl bmtotal">${lead("TOTAL", usd2(d.amt))}<p class="bmsub">Last year ${usd2(d.last)}</p></div>
        <div class="bmsign">${d.head ? `<div class="hand">${esc(GP[d.head].n)}</div>` : ""}<span>${esc(d.title.toUpperCase())}</span></div>
      </div>`,
      )}
      <div class="bscol">
        ${sec(
          3,
          L.whose,
          `<div class="ink bstot">
          <div class="dl">${lead("COMING IN", usd2(t.in))}<p class="bmsub">Last year ${usd2(t.inLast)}</p></div>
          <div class="dl">${lead("GOING OUT", usd2(t.out))}<p class="bmsub">Last year ${usd2(t.outLast)}</p></div>
          <div class="dl">${lead("BALANCE", esc(t.bal))}</div>
          <div class="dl">${lead("SAVINGS", usd2(t.save))}</div>
          <div class="dl">${lead("OWED", usd2(t.owed))}</div>
        </div>`,
        )}
        ${wrote}
      </div>
    </div></div>`;
}

/* ---------- Calendar, Strips: the month set on the panel like a printed planner, Today, Coming up ---------- */
Object.assign(GP, {
  kayla: {
    n: "Kayla Moore",
    t: "My friend",
    who: "My friend since ninth grade. She runs the counter at Bean There and talked me into running.",
    us: "She's running my volunteers.",
  },
  hal: {
    n: "Hal Whitaker",
    t: "My neighbor",
    p: "D",
    who: "He lives downstairs and chairs the town's Democratic committee. He held District 2 from 2001 to 2009.",
    us: "He's knocking doors with me on the west side.",
  },
  marisol: {
    n: "Marisol Vega",
    t: "My partner",
    who: "A nurse in the emergency room at Copiah General. We've lived together on Pecan Street since 2022.",
    us: "She keeps the campaign's books.",
  },
  banks: {
    n: "Leroy Banks",
    t: "Copiah County Democratic chair",
    p: "D",
    who: "He owns Banks Hardware in Hazlehurst and has chaired the county Democrats for eleven years.",
    us: "He invited me to speak at the February 13 meeting.",
  },
});
SHE.add("kayla");
SHE.add("marisol");
/* [date, kind, time, what, where, people, what I'd write in the square] from the prototype's calendar */
const CAL2 = [
  [
    "2025-01-06",
    "meeting",
    "6 PM",
    "Board of Aldermen: the water rate vote",
    "City Hall",
    [],
    "Aldermen 6 PM",
  ],
  [
    "2025-01-14",
    "campaign",
    "4:45 PM",
    "Qualified for the District 2 primary",
    "City Hall",
    ["hale"],
    "Qualified!",
  ],
  [
    "2025-01-21",
    "meeting",
    "6 PM",
    "Board of Aldermen: final vote on the $1.2 million drainage bond",
    "City Hall",
    [],
    "Aldermen 6 PM",
  ],
  [
    "2025-01-23",
    "campaign",
    "4 PM",
    "Talk with voters",
    "Bean There, Main Street",
    ["kayla"],
    "Bean There 4 PM",
  ],
  [
    "2025-01-25",
    "birthday",
    "",
    "Kayla Moore turns 25",
    "",
    ["kayla"],
    "Kayla's birthday",
  ],
  [
    "2025-01-25",
    "campaign",
    "9 AM",
    "Knock doors on the west side",
    "Cypress and Elm streets",
    ["hal"],
    "Doors, west side 9 AM",
  ],
  [
    "2025-01-30",
    "press",
    "7:40 AM",
    "WMSU morning show, ten minutes on the water rates",
    "WMSU studio",
    [],
    "WMSU 7:40 AM",
  ],
  [
    "2025-02-01",
    "campaign",
    "8 AM",
    "Men's breakfast, speaking",
    "First Baptist",
    [],
    "First Baptist 8 AM",
  ],
  [
    "2025-02-04",
    "meeting",
    "6 PM",
    "Board of Aldermen: the police budget amendment for two more officers",
    "City Hall",
    [],
    "Aldermen 6 PM",
  ],
  [
    "2025-02-06",
    "press",
    "",
    "My Ledger profile runs",
    "The Latimer Ledger",
    [],
    "Ledger profile",
  ],
  [
    "2025-02-07",
    "deadline",
    "5 PM",
    "Qualifying closes, and my voter registration has to read Pecan Street",
    "City Hall",
    ["hale"],
    "Address fixed by 5 PM",
  ],
  [
    "2025-02-13",
    "campaign",
    "7 PM",
    "Speak to the county Democrats, five minutes",
    "Courthouse annex, Hazlehurst",
    ["banks"],
    "County Dems 7 PM",
  ],
  [
    "2025-02-14",
    "birthday",
    "",
    "Marisol turns 27",
    "",
    ["marisol"],
    "Marisol's birthday",
  ],
  [
    "2025-02-18",
    "meeting",
    "6 PM",
    "Hearing on the Highway 8 rezoning",
    "City Hall",
    [],
    "Hwy 8 hearing 6 PM",
  ],
  ["2025-03-03", "birthday", "", "My 25th birthday", "", [], "My birthday"],
  [
    "2025-03-04",
    "meeting",
    "6 PM",
    "Board of Aldermen",
    "City Hall",
    [],
    "Aldermen 6 PM",
  ],
  [
    "2025-03-22",
    "press",
    "2 PM",
    "Candidate forum with Ruth Ellis",
    "Latimer Library",
    [],
    "Forum 2 PM",
  ],
  [
    "2025-03-25",
    "deadline",
    "",
    "Campaign finance report due",
    "City Hall",
    ["hale"],
    "Finance report",
  ],
  [
    "2025-04-01",
    "election",
    "7 AM to 7 PM",
    "Democratic primary",
    "Latimer Community Center",
    [],
    "PRIMARY",
  ],
];
const KIND2 = {
  campaign: "Your campaign",
  meeting: "Meetings",
  deadline: "Deadlines",
  press: "Press",
  birthday: "Birthdays",
  election: "Elections",
};
const CALTODAY = "2025-01-20";
let calMonth = 0,
  calSel = CALTODAY,
  calPage = 0;
const calOn = new Set(Object.keys(KIND2));
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const iso = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const longDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DOW[dt.getUTCDay()]}, ${MONTHS[m - 1]} ${d}`;
};
const shortDate = (s) => {
  const [, m, d] = s.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
};
const evs = () => CAL2.filter((e) => calOn.has(e[1]));
const whoLine = (ids) =>
  ids.length ? ` With ${ids.map((i) => gnm(i)).join(" and ")}.` : "";
/* a name already in the title becomes the click there, not a "with" line */
const titleWho = (e) => {
  let t = esc(e[3]);
  const rest = [];
  for (const id of e[5]) {
    const n = esc(GP[id].n);
    if (t.includes(n)) t = t.replace(n, gnm(id));
    else rest.push(id);
  }
  return [t, rest];
};
const nb = (s) => s.replace(/ (AM|PM)\b/g, "\u00a0$1");
function calStrips() {
  const y = 2025,
    m = calMonth,
    first = new Date(Date.UTC(y, m, 1)).getUTCDay(),
    days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<div class="plday off"></div>`);
  for (let d = 1; d <= days; d++) {
    const s = iso(y, m, d),
      here = evs().filter((e) => e[0] === s);
    cells.push(
      `<div class="plday pick${s < CALTODAY ? " past" : ""}${s === calSel && s !== CALTODAY ? " sel" : ""}" data-day="${s}" tabindex="0" role="button"><span class="plnum">${d}${s === CALTODAY ? '<svg class="pen" viewBox="0 0 40 30" aria-hidden="true"><path d="M8 6c9-5 24-4 28 4 4 9-6 16-17 16C7 26 1 19 5 11c2-4 7-6 13-6"/></svg>' : ""}</span>${here.map((e) => `<span class="plev k-${e[1]}">${nb(esc(e[6]))}</span>`).join("")}</div>`,
    );
  }
  while (cells.length % 7) cells.push(`<div class="plday off"></div>`);
  /* the chosen day: Today with its date large, or another day titled with its date */
  const dayEvents = evs().filter((e) => e[0] === calSel);
  const lines = dayEvents.length
    ? dayEvents
        .map(
          (e) =>
            `<div class="dayline"><b class="k-${e[1]}">${esc(e[2] || "All day")}</b><div><strong>${titleWho(e)[0]}</strong>${e[4] || titleWho(e)[1].length ? `<p class="where">${esc(e[4])}${e[4] ? "." : ""}${whoLine(titleWho(e)[1])}</p>` : ""}</div></div>`,
        )
        .join("")
    : `<p class="intro">Nothing planned.</p>`;
  const isToday = calSel === CALTODAY;
  const dayBody = isToday
    ? `<div class="bigdate">${longDate(CALTODAY)}</div>${lines}`
    : lines;
  /* coming up: after today, paged five at a time */
  const up = evs().filter((e) => e[0] > CALTODAY),
    per = 5,
    pages = Math.max(1, Math.ceil(up.length / per));
  calPage = Math.min(calPage, pages - 1);
  const upRows = up
    .slice(calPage * per, calPage * per + per)
    .map(
      (e) =>
        `<div class="upline pick${e[0] === calSel ? " sel" : ""}" data-day="${e[0]}" data-month="${Number(e[0].slice(5, 7)) - 1}" tabindex="0" role="button"><b>${shortDate(e[0])}</b><span>${esc(e[3])}${e[2] ? ", " + nb(esc(e[2])) : ""}</span></div>`,
    )
    .join("");
  const sec = (depth, title, body, extra = "") =>
    `<section class="sec strips dp${depth}"><h3 class="sechead">${title}${extra}</h3><div class="secbody">${body}</div></section>`;
  const arrows = (key, a, b) =>
    `<span class="secarrows"><button type="button" class="arrow" data-${key}="-1"${a ? "" : " disabled"} aria-label="Earlier">‹</button><button type="button" class="arrow" data-${key}="1"${b ? "" : " disabled"} aria-label="Later">›</button></span>`;
  const filters = `<span class="kfilters">${Object.entries(KIND2)
    .map(
      ([k, t]) =>
        `<button type="button" class="tog ktog2 k-${k}" data-kind="${k}" aria-pressed="${calOn.has(k)}">${t}</button>`,
    )
    .join("")}</span>`;
  return `<div class="cal3">
    ${sec(1, `<span class="monthname">${MONTHS[m]} ${y}</span>`, `<div class="plgrid"><div class="pldow">${DOW.map((d) => `<span>${d}</span>`).join("")}</div><div class="plcells">${cells.join("")}</div></div>`, `${arrows("cm", m > 0, m < 5)}${filters}`)}
    <div class="calside">
      ${sec(isToday ? 2 : 5, isToday ? "Today" : longDate(calSel), dayBody)}
      ${sec(3, "Coming up", `<div class="uplist">${upRows || '<p class="intro">Nothing else on the calendar.</p>'}</div>`, pages > 1 ? arrows("cp", calPage > 0, calPage < pages - 1) : "")}
    </div>
  </div>`;
}

/* ---------- Calendar options B to E (same events, same approved build) ---------- */
const PEN =
  '<svg class="pen" viewBox="0 0 40 30" aria-hidden="true"><path d="M8 6c9-5 24-4 28 4 4 9-6 16-17 16C7 26 1 19 5 11c2-4 7-6 13-6"/></svg>';
const csec = (depth, title, body, extra = "") =>
  `<section class="sec strips dp${depth}"><h3 class="sechead">${title}${extra}</h3><div class="secbody">${body}</div></section>`;
const carrows = (key, a, b) =>
  `<span class="secarrows"><button type="button" class="arrow" data-${key}="-1"${a ? "" : " disabled"} aria-label="Earlier">‹</button><button type="button" class="arrow" data-${key}="1"${b ? "" : " disabled"} aria-label="Later">›</button></span>`;
const cfilters = () =>
  `<span class="kfilters">${Object.entries(KIND2)
    .map(
      ([k, t]) =>
        `<button type="button" class="tog ktog2 k-${k}" data-kind="${k}" aria-pressed="${calOn.has(k)}">${t}</button>`,
    )
    .join("")}</span>`;
const addDays = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};
const dowOf = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
/* one event written in full: time, what, where, who */
const fullEvent = (e) => {
  const [t, rest] = titleWho(e);
  return `<div class="dayline"><b class="k-${e[1]}">${esc(nb(e[2] || "All day"))}</b><div><strong>${t}</strong>${e[4] || rest.length ? `<p class="where">${esc(e[4])}${e[4] ? "." : ""}${whoLine(rest)}</p>` : ""}</div></div>`;
};
/* a small month for jumping around: days with something on them in their ink, today looped, the chosen day lit */
function smallMonth() {
  const y = 2025,
    m = calMonth,
    first = new Date(Date.UTC(y, m, 1)).getUTCDay(),
    days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<span class="sm-d off"></span>`);
  for (let d = 1; d <= days; d++) {
    const s = iso(y, m, d),
      e = evs().find((x) => x[0] === s);
    cells.push(
      `<span class="sm-d pick${s < CALTODAY ? " past" : ""}${s === calSel && s !== CALTODAY ? " sel" : ""}${e ? " has k-" + e[1] : ""}" data-day="${s}" tabindex="0" role="button">${d}${s === CALTODAY ? PEN : ""}</span>`,
    );
  }
  return csec(
    4,
    `<span class="monthname small">${MONTHS[m]} ${y}</span>`,
    `<div class="smgrid">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span class="sm-h">${d}</span>`).join("")}${cells.join("")}</div>`,
    carrows("cm", m > 0, m < 5),
  );
}
function comingUp(per = 5) {
  const up = evs().filter((e) => e[0] > CALTODAY),
    pages = Math.max(1, Math.ceil(up.length / per));
  calPage = Math.min(calPage, pages - 1);
  const rows = up
    .slice(calPage * per, calPage * per + per)
    .map(
      (e) =>
        `<div class="upline pick${e[0] === calSel ? " sel" : ""}" data-day="${e[0]}" data-month="${Number(e[0].slice(5, 7)) - 1}" tabindex="0" role="button"><b>${shortDate(e[0])}</b><span>${esc(e[3])}${e[2] ? ", " + nb(esc(e[2])) : ""}</span></div>`,
    )
    .join("");
  return csec(
    3,
    "Coming up",
    `<div class="uplist">${rows || '<p class="intro">Nothing else on the calendar.</p>'}</div>`,
    pages > 1 ? carrows("cp", calPage > 0, calPage < pages - 1) : "",
  );
}
/* B: Week. The week of the chosen day across the main area, every event in full */
function calWeek() {
  const start = addDays(calSel, -dowOf(calSel));
  const days = [...Array(7)].map((_, i) => addDays(start, i));
  const [, sm, sd] = start.split("-").map(Number),
    end = days[6].split("-").map(Number);
  const title = `<span class="monthname">${MONTHS[sm - 1]} ${sd} to ${end[1] !== sm ? MONTHS[end[1] - 1] + " " : ""}${end[2]}</span>`;
  const cols = days
    .map((s) => {
      const here = evs().filter((e) => e[0] === s);
      const [, , d] = s.split("-").map(Number);
      return `<div class="wkcol pick${s < CALTODAY ? " past" : ""}${s === calSel ? " sel" : ""}" data-day="${s}" data-month="${Number(s.slice(5, 7)) - 1}" tabindex="0" role="button"><div class="wkhead"><span>${DOW[dowOf(s)]}</span><b class="wknum">${d}${s === CALTODAY ? PEN : ""}</b></div>${
        here.length
          ? here
              .map((e) => {
                const [t, rest] = titleWho(e);
                return `<div class="wkev"><b class="k-${e[1]}">${esc(nb(e[2] || "All day"))}</b><strong>${t}</strong>${e[4] ? `<span>${esc(e[4])}</span>` : ""}${rest.length ? `<span>With ${rest.map((i) => gnm(i)).join(" and ")}</span>` : ""}</div>`;
              })
              .join("")
          : `<p class="wkopen">Open</p>`
      }</div>`;
    })
    .join("");
  return `<div class="cal3 calB">
    ${csec(1, title, `<div class="wkgrid">${cols}</div>`, `${carrows("cw", true, true)}${cfilters()}`)}
    <div class="calside">${smallMonth()}${comingUp(5)}</div>
  </div>`;
}
/* C: Day planner. The chosen day split into morning, afternoon and evening */
const partOf = (t) => {
  if (!t) return "all";
  const m = t.match(/(\d+)(?::\d+)?\s*(AM|PM)/);
  if (!m) return "all";
  let h = (+m[1] % 12) + (m[2] === "PM" ? 12 : 0);
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
};
function calPlanner() {
  const here = evs().filter((e) => e[0] === calSel),
    isToday = calSel === CALTODAY;
  const band = (key, name, hours) => {
    const list = here.filter((e) => partOf(e[2]) === key);
    return `<div class="band"><div class="bandname"><b>${name}</b><span>${hours}</span></div><div class="bandbody">${list.length ? list.map(fullEvent).join("") : `<p class="wkopen">Open</p>`}</div></div>`;
  };
  const allDay = here.filter((e) => partOf(e[2]) === "all");
  return `<div class="cal3 calC">
    ${csec(isToday ? 2 : 5, isToday ? "Today" : longDate(calSel), `<div class="bigdate">${longDate(calSel)}</div>${allDay.length ? `<div class="allday">${allDay.map(fullEvent).join("")}</div>` : ""}<div class="bands">${band("morning", "Morning", "Until noon")}${band("afternoon", "Afternoon", "Noon to 5")}${band("evening", "Evening", "After 5")}</div>`, `${carrows("cd", true, true)}${cfilters()}`)}
    <div class="calside">${smallMonth()}${comingUp(5)}</div>
  </div>`;
}
/* D: With places. Coming up is the main section, each event with a fading picture of where it happens */
const PLACEPIC = {
  "City Hall": "public-meeting-room__midday.jpg",
  "Bean There, Main Street": "home-kitchen__midday.jpg",
  "First Baptist": "church-sanctuary__midday.jpg",
  "Courthouse annex, Hazlehurst": "county-courtroom__midday.jpg",
  "Cypress and Elm streets": "house-gulf-coast-raised__midday.jpg",
};
function calPlaces() {
  const here = evs().filter((e) => e[0] === calSel),
    isToday = calSel === CALTODAY,
    pic = here.map((e) => PLACEPIC[e[4]]).find(Boolean);
  const up = evs().filter((e) => e[0] > CALTODAY),
    per = 6,
    pages = Math.max(1, Math.ceil(up.length / per));
  calPage = Math.min(calPage, pages - 1);
  const rows = up
    .slice(calPage * per, calPage * per + per)
    .map((e) => {
      const [t, rest] = titleWho(e),
        p = PLACEPIC[e[4]];
      return `<div class="plrow pick${e[0] === calSel ? " sel" : ""}" data-day="${e[0]}" data-month="${Number(e[0].slice(5, 7)) - 1}" tabindex="0" role="button"><div class="plpic"${p ? ` style="background-image:url(img/${p})"` : ""}></div><div class="pldate"><b>${shortDate(e[0])}</b><span class="k-${e[1]}">${esc(nb(e[2] || "All day"))}</span></div><div class="plwhat"><strong>${t}</strong><span>${esc(e[4])}${e[4] && rest.length ? ". " : ""}${rest.length ? "With " + rest.map((i) => gnm(i)).join(" and ") : ""}</span></div></div>`;
    })
    .join("");
  return `<div class="cal3 calD">
    <div class="calside">
      ${csec(isToday ? 2 : 5, isToday ? "Today" : longDate(calSel), `${pic ? `<div class="daypic" style="background-image:url(img/${pic})"></div>` : ""}${isToday ? `<div class="bigdate">${longDate(CALTODAY)}</div>` : ""}${here.length ? here.map(fullEvent).join("") : `<p class="intro">Nothing planned.</p>`}`)}
      ${smallMonth()}
    </div>
    ${csec(3, "Coming up", `<div class="plrows">${rows}</div>`, `${pages > 1 ? carrows("cp", calPage > 0, calPage < pages - 1) : ""}${cfilters()}`)}
  </div>`;
}
/* E: Typed. Strips, with the events typed in Courier Prime and kind shown by ink color only */
const calTyped = () =>
  calStrips().replace('<div class="cal3">', '<div class="cal3 calE">');

/* ---------- the examples ---------- */
const EX = {
  "cal-week": [
    "Calendar",
    "B Week",
    "the calendar as this week, every event in full, with a small month and Coming up beside it",
    calWeek,
  ],
  "cal-planner": [
    "Calendar",
    "C Day planner",
    "the calendar as a day planner: morning, afternoon and evening, with a small month and Coming up beside it",
    calPlanner,
  ],
  "cal-places": [
    "Calendar",
    "D With places",
    "the calendar led by Coming up, each event with a picture of where it happens",
    calPlaces,
  ],
  "cal-typed": [
    "Calendar",
    "E Typed",
    "Strips, with the events typed like the approved budget pages and kind shown by ink color only",
    calTyped,
  ],
  "cal-strips": [
    "Calendar",
    "Strips",
    "the calendar in the approved build: the month set on the panel like a printed planner, Today, and Coming up",
    calStrips,
  ],
  "bud-strips": [
    "Politics",
    "Mix: strips",
    "the budget mix in the approved build: departments, a typed page set on the panel, the money, and who wrote it",
    budStrips,
  ],
  "gov-local": [
    "Politics",
    "Local",
    "Government, local: the approved build, with every name and vote clickable",
    () => govScreen("Local"),
  ],
  "gov-state": [
    "Politics",
    "State",
    "Government, state: the approved build, with every name and vote clickable",
    () => govScreen("State"),
  ],
  "gov-federal": [
    "Politics",
    "Federal",
    "Government, federal: the approved build, with every name and vote clickable",
    () => govScreen("Federal"),
  ],
  "per-hale": [
    "People",
    "Margaret Hale",
    "the approved You build, as the card for someone you know: how you see her",
    personHale,
  ],
  "you-mix-strips": [
    "You",
    "Mix: strips",
    "the mix, with Victoria 3 style header strips for each section",
    () => youMix("strips"),
  ],
  "you-ol-g": [
    "You",
    "Outline: middles + fades down",
    "the strips, with nothing touching a corner and the outline fading as it goes down",
    () => youMix("strips", "ol-g"),
  ],
  "you-ol-a": [
    "You",
    "Outline: fades down",
    "the strips, with the outline full along the top, sides fading as they go down, and the middle of the bottom",
    () => youMix("strips", "ol-a"),
  ],
  "you-ol-b": [
    "You",
    "Outline: corners",
    "the strips, with only the four corners drawn, each arm fading toward the middle of its side",
    () => youMix("strips", "ol-b"),
  ],
  "you-ol-c": [
    "You",
    "Outline: middles",
    "the strips, with each side brightest at its middle and fading before the corners",
    () => youMix("strips", "ol-c"),
  ],
  "you-ol-d": [
    "You",
    "Outline: open corners",
    "the strips, with every side drawn in full but stopping short of the corners",
    () => youMix("strips", "ol-d"),
  ],
  "you-ol-e": [
    "You",
    "Outline: rails",
    "the strips, with full lines along the top and bottom that fade at the ends, and no sides",
    () => youMix("strips", "ol-e"),
  ],
  "you-ol-f": [
    "You",
    "Outline: dotted",
    "the strips, with a fine dotted line all the way around",
    () => youMix("strips", "ol-f"),
  ],
  "you-mix-panes": [
    "You",
    "Mix: panes",
    "the mix, with each section on its own inset pane",
    () => youMix("panes"),
  ],
  "you-mix-layered": [
    "You",
    "Mix: layered",
    "the mix, built in layers: a see-through panel with raised glass plates",
    () => youMix("layered"),
  ],
  "mon-mix": [
    "Money",
    "Mix",
    "typed and handwritten straight on the panel, no paper sheets",
    monMix,
  ],
  "bud-mix": [
    "Politics",
    "Mix",
    "a mix: The Political Process's departments with Suzerain's typed pages",
    budMix,
  ],
  "you-ck": [
    "You",
    "Crusader Kings 3",
    "Crusader Kings 3's character window",
    youCK,
  ],
  "you-sz": ["You", "Suzerain", "Suzerain's dossiers", youSZ],
  "you-wm": ["You", "Wildermyth", "Wildermyth's hero page", youWM],
  "you-de": ["You", "Disco Elysium", "Disco Elysium's character sheet", youDE],
  "bud-v3": ["Politics", "Victoria 3", "Victoria 3's budget panel", budV3],
  "bud-d4": ["Politics", "Democracy 4", "Democracy 4's policy board", budD4],
  "bud-sz": [
    "Politics",
    "Suzerain",
    "Suzerain's budget, as a government document",
    budSZ,
  ],
  "bud-tp": [
    "Politics",
    "The Political Process",
    "The Political Process's budget, cleaned up",
    budTP,
  ],
  "mon-a": [
    "Money",
    "Paper in the room's light",
    "Paper in the room's light",
    monA,
  ],
  "mon-b": [
    "Money",
    "Dark objects",
    "Dark objects made from the panel's own colors",
    monB,
  ],
  "mon-c": ["Money", "Panels instead", "Game panels, no paper", monC],
};
let cur = "you-mix-strips";
const ICONS = {
  journal:
    '<path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14.5H7.5A1.5 1.5 0 0 1 6 18z"/><path d="M6 18a1.5 1.5 0 0 1 1.5-1.5h11"/><path d="M13.5 3.5v6.2l-1.8-1.3-1.8 1.3V3.5"/>',
  calendar:
    '<rect x="4" y="5.5" width="16" height="14.5" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><rect x="13" y="13" width="3.5" height="3.5" rx=".5"/>',
  money:
    '<rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.6"/><path d="M5.6 9.6h.01M18.4 14.4h.01"/>',
  politics:
    '<path d="M4 20h16M5.8 20v-6.2M9.6 20v-6.2M14.4 20v-6.2M18.2 20v-6.2M4 13.8h16M7 13.8a5 5 0 0 1 10 0M12 8.8V5.2M12 5.2h2"/>',
  news: '<path d="M4.5 5.5h12v13a1.5 1.5 0 0 0 1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M16.5 9h3v9.5a1.5 1.5 0 0 1-3 0"/><path d="M7.5 9h6M7.5 12h6M7.5 15h4"/>',
  people:
    '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.5-3.4 2.7-5.2 5.5-5.2s5 1.8 5.5 5.2"/><circle cx="16.6" cy="9.4" r="2.4"/><path d="M15.6 13.9c2.5 0 4.4 1.6 5 4.6"/>',
  travel:
    '<path d="M12 21s-6-5.4-6-10.2a6 6 0 0 1 12 0C18 15.6 12 21 12 21z"/><circle cx="12" cy="10.6" r="2.2"/>',
  guide:
    '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6"/><path d="M12 16.9h.01"/>',
};
const RAIL = [
  ["journal", "Journal"],
  ["calendar", "Calendar"],
  ["money", "Money"],
  ["politics", "Politics"],
  ["news", "News"],
  ["people", "People"],
  ["travel", "Travel"],
  ["guide", "Guide"],
];
const X =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
/* the owner's switches on the You screen: Name font, Close, Glow (classes on the stage) */
const OPT = { name: "a", close: "a", glow: "on" };
let closed = false;
function applyOpts() {
  for (const [g, v] of Object.entries(OPT))
    for (const b of document.querySelectorAll(`[data-opt^="${g}:"]`))
      b.setAttribute("aria-pressed", String(b.dataset.opt === `${g}:${v}`));
  stage.className = stage.className
    .replace(/\b(nf|close|glow)-\S+/g, "")
    .trim();
  stage.classList.add(
    `nf-${OPT.name}`,
    `close-${OPT.close}`,
    `glow-${OPT.glow}`,
  );
}
function renderHud(menuKey) {
  $("#hud").innerHTML =
    `<nav class="navrow" aria-label="Menus">${RAIL.map(([k, t]) => `<button type="button" class="rbtn${k === menuKey ? " on" : ""}" data-rail="${k}" aria-label="${t}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span class="tip">${t}</span></button>`).join("")}</nav>
    <div class="pcard"><button class="me${menuKey === "you" ? " on" : ""}" type="button" data-rail="you" aria-label="You">${H.face("me", 104, "You")}</button>
    <div class="pinfo"><b>John Spencer</b><span>Latimer, Mississippi</span><span class="when">Monday, January 20, 2025</span><span>8:30 PM</span></div>
    <div class="tbtns"><button class="kbtn" type="button">Day</button><button class="kbtn" type="button">Week</button></div></div>`;
}
function menuKeyFor(title) {
  return title === "You"
    ? "you"
    : title === "Money"
      ? "money"
      : title === "People"
        ? "people"
        : title === "Calendar"
          ? "calendar"
          : "politics";
}
function render() {
  const [title, , follows, fn] = EX[cur];
  const menuKey = menuKeyFor(title);
  const head =
    title === "Politics"
      ? `<div class="phead"><h2 class="ptitle">Politics</h2>${tabs(["Government", "Elections", "Parties", "Issues", "Budgets", "Metrics", "Campaign"], cur.startsWith("gov-") ? "Government" : "Budgets")}</div>`
      : `<div class="phead"><h2 class="ptitle">${title}</h2></div>`;
  $("#menuhost").innerHTML = closed
    ? ""
    : `<div class="frost"></div><section class="panel" aria-label="${title}"><button class="x" type="button" data-close aria-label="Close">${X}</button>${head}<div class="pbody">${fn()}</div></section>`;
  renderHud(closed ? null : menuKey);
  stage.classList.toggle("menu-open", !closed);
  stage.classList.toggle("youmix", /^(you-(mix|ol)|per-)/.test(cur));
  applyOpts();
  stage.classList.toggle("layered", cur === "you-mix-layered");
  $("#follows").innerHTML = `<b>Follows:</b> ${follows}`;
  document
    .querySelectorAll(".strip [data-ex]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.ex === cur)),
    );
  requestAnimationFrame(fitPanel);
}
function fitPanel() {
  const pn = $("#menuhost .panel"),
    fr = $("#menuhost .frost");
  if (pn && fr) fr.style.height = pn.offsetHeight - 4 + "px";
}
const vp = $("#viewport"),
  stage = $("#stage");
function fit() {
  stage.style.transform = `scale(${vp.clientWidth / 1440})`;
}
addEventListener("resize", fit);
fit();
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ex]");
  if (b) {
    cur = b.dataset.ex;
    closed = false;
    closeCard();
    hideTip();
    render();
    return;
  }
  const gl = e.target.closest("[data-gl]");
  if (gl) {
    cur = "gov-" + gl.dataset.gl.toLowerCase();
    closeCard();
    render();
    return;
  }
  const gb = e.target.closest("[data-gb]");
  if (gb) {
    govBranch = gb.dataset.gb;
    closeCard();
    render();
    return;
  }
  if (e.target.closest("[data-card]")) {
    const pc2 = e.target.closest("[data-card]");
    if (GP[pc2.dataset.card]) {
      hideTip();
      $("#cardhost").innerHTML = personCard2(pc2.dataset.card);
    }
    return;
  }
  const kd = e.target.closest("[data-kind]");
  if (kd) {
    const k = kd.dataset.kind;
    calOn.has(k) ? calOn.delete(k) : calOn.add(k);
    render();
    return;
  }
  const cw = e.target.closest("[data-cw]");
  if (cw) {
    calSel = addDays(calSel, 7 * +cw.dataset.cw);
    calMonth = Number(calSel.slice(5, 7)) - 1;
    render();
    return;
  }
  const cdd = e.target.closest("[data-cd]");
  if (cdd) {
    calSel = addDays(calSel, +cdd.dataset.cd);
    calMonth = Number(calSel.slice(5, 7)) - 1;
    render();
    return;
  }
  const cm = e.target.closest("[data-cm]");
  if (cm) {
    calMonth = Math.max(0, Math.min(5, calMonth + +cm.dataset.cm));
    render();
    return;
  }
  const cp = e.target.closest("[data-cp]");
  if (cp) {
    calPage = Math.max(0, calPage + +cp.dataset.cp);
    render();
    return;
  }
  const dy = e.target.closest("[data-day]");
  if (dy) {
    calSel = dy.dataset.day;
    if (dy.dataset.month != null) calMonth = +dy.dataset.month;
    render();
    return;
  }
  const bl = e.target.closest("[data-bl]");
  if (bl) {
    budLevel = bl.dataset.bl;
    closeCard();
    render();
    return;
  }
  const bsel = e.target.closest("[data-bsel]");
  if (bsel && !e.target.closest("[data-card]")) {
    budSelBy[budLevel] = +bsel.dataset.bsel;
    render();
    return;
  }
  if (e.target.closest("[data-cardclose]")) {
    closeCard();
    return;
  }
  const pc = e.target.closest("[data-card]");
  if (pc && GP[pc.dataset.card]) {
    hideTip();
    $("#cardhost").innerHTML = personCard2(pc.dataset.card);
    return;
  }
  const bc = e.target.closest("[data-bill]");
  if (bc && BILLS2[bc.dataset.bill]) {
    hideTip();
    $("#cardhost").innerHTML = billCard(bc.dataset.bill);
    return;
  }
  const o = e.target.closest("[data-opt]");
  if (o) {
    const [g, v] = o.dataset.opt.split(":");
    OPT[g] = v;
    applyOpts();
    requestAnimationFrame(fitPanel);
    return;
  }
  if (e.target.closest("[data-close]")) {
    closed = true;
    hideTip();
    render();
    return;
  }
  const r = e.target.closest("[data-rail]");
  if (r) {
    const [title] = EX[cur];
    const key = menuKeyFor(title);
    if (r.dataset.rail === key) {
      closed = !closed;
      hideTip();
      render();
    }
    return;
  }
  const c = e.target.closest("[data-de]");
  if (c) {
    deSel = +c.dataset.de;
    render();
    return;
  }
  const m = e.target.closest("[data-mix]");
  if (m) {
    mixSel = +m.dataset.mix;
    render();
  }
});
/* hover tips */
const tipEl = $("#tip");
function showTip(el) {
  const r = el.getBoundingClientRect(),
    s = stage.getBoundingClientRect(),
    k = s.width / 1440;
  tipEl.innerHTML = `<b>${esc(el.dataset.tiptitle)}</b>${esc(el.dataset.tip)}`;
  tipEl.hidden = false;
  let x = (r.left - s.left) / k,
    y = (r.bottom - s.top) / k + 8;
  const w = 340;
  if (x + w > 1420) x = 1420 - w;
  if (y + 120 > 880) y = (r.top - s.top) / k - 110;
  tipEl.style.left = x + "px";
  tipEl.style.top = y + "px";
}
function hideTip() {
  tipEl.hidden = true;
}
document.addEventListener("mouseover", (e) => {
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t);
  else hideTip();
});
document.addEventListener("focusin", (e) => {
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t);
});
/* Esc closes the open menu (the only way with Close C, besides its rail button) */
function closeCard() {
  const h = $("#cardhost");
  if (h) h.innerHTML = "";
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if ($("#cardhost") && $("#cardhost").innerHTML) {
    closeCard();
    return;
  }
  if (!closed) {
    closed = true;
    hideTip();
    render();
  }
});
/* #key~group-value~group-value opens an example with options set, for renders */
const hash = location.hash.slice(1);
{
  const [k, ...opts] = hash.split("~");
  if (EX[k]) cur = k;
  for (const p of opts) {
    const [g, v] = p.split("-");
    if (g in OPT) OPT[g] = v;
    if (g === "branch") govBranch = v;
    if (g === "blevel") budLevel = v.replace(/_/g, " ");
    if (g === "csel") calSel = iso(2025, calMonth, +v);
    if (g === "bsel") budSelBy[budLevel] = +v;
    if (g === "card" && GP[v])
      setTimeout(() => {
        $("#cardhost").innerHTML = personCard2(v);
      }, 50);
    if (g === "bill" && BILLS2[v])
      setTimeout(() => {
        $("#cardhost").innerHTML = billCard(v);
      }, 50);
  }
}
render();
