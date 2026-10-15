SCREENS = []


def screen(key, title, note, html_):
    SCREENS.append((key, title, note, html_))


SCALES = ('<button class="lie-scales" title="Lie"><svg viewBox="0 0 24 24"><path d="M12 4.2v14.8M8 19h8M4.6 6.8h14.8"/><circle cx="12" cy="4.6" r=".9"/>'
          '<path d="M4.6 6.8l-2.3 5.1h4.6zM19.4 6.8l-2.3 5.1h4.6z"/><path d="M2.3 11.9c.6 1.2 1.3 1.8 2.3 1.8s1.7-.6 2.3-1.8M17.1 11.9c.6 1.2 1.3 1.8 2.3 1.8s1.7-.6 2.3-1.8"/></svg></button>')


def ic(name, cls="gi"):
    P = {
        "wage": '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.7.9-2.7 2s1 1.7 2.7 2 2.8.9 2.8 2.1-1.2 2-2.8 2c-1.2 0-2.2-.5-2.7-1.5M12 6.5v11"/>',
        "income": '<path d="M5 20V9l7-4 7 4v11"/><path d="M9 20v-6h6v6M3 20h18"/>',
        "sales": '<path d="M4 5h2l2 10h10l2-7H7"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
        "property": '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
        "health": '<path d="M12 20s-7-4.3-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.7 12 20 12 20z"/>',
        "carry": '<path d="M5 6h14v4H5zM8 10v8h8v-8"/><path d="M10 14h4"/>',
        "medicaid": '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
        "school": '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
        "police": '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/>',
        "water": '<path d="M12 4s6 6.5 6 10.5a6 6 0 0 1-12 0C6 10.5 12 4 12 4z"/>',
        "vote": '<path d="M4 11h16v9H4z"/><path d="M8 11V5h8v6M10 8h4"/>',
        "brick": '<path d="M4 7h16v10H4zM4 12h16M10 7v5M14 12v5"/>',
        "truck": '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/>',
        "loan": '<path d="M4 6h16v12H4zM4 10h16"/><path d="M8 15h4"/>',
        "gift": '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-3-5-2-4 0M12 7c2-3 5-2 4 0"/>',
        "gavel": '<path d="M13 4l5 5M11 6l5 5M12 5l-6 6 3 3 6-6M8 13l-5 5"/><path d="M4 21h9"/>',
        "hourglass": '<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>',
        "ballot": '<path d="M4 12h16v8H4z"/><path d="M8 12l2-7 6 2-1.5 5"/>',
        "coin": '<ellipse cx="12" cy="7" rx="6" ry="2.5"/><path d="M6 7v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7M6 12v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5"/>',
        "tv": '<path d="M3 7h18v11H3zM9 3l3 4 3-4"/>',
        "radio": '<path d="M4 9h16v10H4zM7 9l9-5"/><circle cx="9" cy="14" r="2.3"/><path d="M14 13h3M14 16h3"/>',
        "stubborn": '<path d="M6 18V8l6-4 6 4v10"/><path d="M6 12h12"/>',
        "curious": '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>',
        "calm": '<path d="M3 14c3-3 6-3 9 0s6 3 9 0M3 9c3-3 6-3 9 0s6 3 9 0"/>',
        "loyal": '<path d="M12 20s-7-4.3-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.7 12 20 12 20z"/><path d="M9 12l2 2 4-4"/>',
        "search": '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    }
    return f'<svg class="{cls}" viewBox="0 0 24 24">{P[name]}</svg>'


def donut(parts, total_label, size=200):
    r, c = 70, 2 * 3.14159 * 70
    off, arcs = 0, ""
    for _, p, col in parts:
        ln = c * p / 100
        arcs += f'<circle r="{r}" cx="100" cy="100" fill="none" stroke="{col}" stroke-width="26" stroke-dasharray="{ln - 2:.1f} {c - ln + 2:.1f}" stroke-dashoffset="{-off:.1f}" transform="rotate(-90 100 100)"/>'
        off += ln
    return (f'<div class="donut" style="width:{size}px;height:{size}px"><svg viewBox="0 0 200 200"><circle r="{r}" cx="100" cy="100" fill="none" stroke="#9c8350" stroke-width="30" opacity=".35"/>{arcs}'
            f'<circle r="56" cx="100" cy="100" fill="none" stroke="#9c8350" stroke-width="1.2"/><circle r="84" cx="100" cy="100" fill="none" stroke="#9c8350" stroke-width="1.2"/></svg><div class="dlab"><div>{total_label}</div></div></div>')


def legend(parts, total=None, unit="million"):
    return '<div class="legend col">' + "".join(
        f'<div class="lg"><i style="background:{c}"></i>{n}<em>{f"${total * p / 100:.1f} {unit}" if total else f"{p}%"}</em></div>' for n, p, c in parts) + "</div>"


def ybar(yes, no, label):
    t = yes + no
    n = f'<span class="n" style="flex:{no}">{no} no</span>' if no else ""
    return f'<div class="vote"><div class="vl">{label}</div><div class="vb"><span class="y" style="flex:{yes}">{yes} yes</span>{n}</div></div>'


# 1 play (column menu, hover label, toast)
screen("play", "Play", "The scene fills the window. Your card sits bottom left, with the menu as a straight column above it; hovering an icon shows its name (try it). The toast top right is the news pop-up when a story reaches you.",
       stage("home-kitchen__midday", hud(hover="calendar"), figs=fig("024", 700, 120, 520) + fig("004", 980, 110, 540, True)))

# 2 conversation: approved Lie scales, Say nothing as a plain button beside Leave
conv = panel(SCALES + '<div class="convtop"><img class="cbust" src="img/bust-look-024.png" alt=""><div><div class="name big">Evelyn Spencer</div><div class="label2">sister</div></div></div>'
             '<p class="speech">Hey, John. Have you talked to Brent? He said the plant is cutting the night shift.</p>'
             '<ol class="replies"><li>How about you? Are you still on days?</li><li>I saw Brent this morning. He didn\'t say anything.</li><li>Who told him that?</li><li>That would hit half the street.</li></ol>'
             '<div class="acts low"><button class="act sm">Say nothing</button><button class="act sm">Leave</button></div>', "conv")
screen("talk", "Conversation", "The approved Lie scales sit at the card's top right, as in the game. Four replies, then Say nothing and Leave as the two plain buttons under them.",
       stage("home-kitchen__midday", conv, figs=fig("024", 760, 120, 520) + fig("004", 1020, 110, 540, True)))

# 3 people web, rebuilt on the old People Web design: category filter, colored edges, legend, search, dimming
KIND = {"family": "#c29b48", "household": "#c8b997", "work": "#8caabe", "politics": "#b07860", "acquaintance": "#8f8778"}
nodes = [("you", 330, 220, "004", "You", "x", True),
         ("h1", 200, 110, "024", "Evelyn", "household", False), ("h2", 470, 100, "003", "Ruth, mother", "household", False), ("h3", 160, 300, "008", "Earl, father", "household", True),
         ("r1", 40, 190, "010", "Tyler, cousin", "family", False), ("w1", 520, 320, "013", "Dev", "work", False), ("w2", 610, 210, "006", "Sam, foreman", "work", False),
         ("f1", 420, 420, "007", "Kara", "acquaintance", False), ("f2", 230, 430, "017", "Luis, neighbor", "acquaintance", False),
         ("p1", 690, 70, "020", "Mayor Ida Banks", "politics", True), ("p2", 700, 400, "025", "Ald. Marcus Hill", "politics", False), ("f3", 40, 400, "036", "Pastor Nina Cole", "acquaintance", False)]
show = {"politics", "x"}
lines = ""
Y = lambda v: int(v * .8)
cx, cy = 330 + 50, Y(220) + 50
for k, x, y, look, lab, kind, lit in nodes[1:]:
    dash = ' stroke-dasharray="6 4"' if kind == "household" else ""
    dim = "" if kind in show else ' opacity=".22"'
    sel = ' stroke-width="4"' if k == "p1" else ' stroke-width="2.2"'
    lines += f'<line x1="{cx}" y1="{cy}" x2="{x + 42}" y2="{Y(y) + 42}" stroke="{KIND[kind]}"{sel}{dash}{dim}/>'
lines += f'<line x1="732" y1="{Y(70) + 42}" x2="742" y2="{Y(400) + 42}" stroke="{KIND["politics"]}" stroke-width="2.2"/>'
nh = ""
for k, x, y, look, lab, kind, lit in nodes:
    s = 100 if k == "you" else 84
    dim = "" if kind in show else " dim"
    selc = " sel" if k == "p1" else ""
    nh += (f'<div class="node{dim}{selc}" style="left:{x}px;top:{Y(y)}px;width:{s}px"><div class="nimg" style="width:{s}px;height:{s}px"><img class="np" src="img/bust-look-{look}.png" alt="">'
           f'<img class="nf" src="img/node-{"lit" if lit else "rest"}.png" alt=""></div><div class="nl">{lab}</div></div>')
leg = '<div class="wleg">' + "".join(f'<span><i style="background:{c}{";background:repeating-linear-gradient(90deg," + c + " 0 6px,transparent 6px 10px)" if k == "household" else ""}"></i>{k.capitalize() if k != "acquaintance" else "Know them"}</span>' for k, c in KIND.items()) + "</div>"
webtools = ('<div class="wtools">' + tabs(["All", "Family", "Friends", "Work", "Politics"], "Politics")
            + f'<div class="search">{ic("search", "si")}<span>Find somebody</span></div></div>')
known = ('<div class="known"><img src="img/bust-look-020.png" alt=""><div><div class="name">Ida Banks</div><div class="label2">Mayor of Latimer. You met her at the January 6 council meeting; '
         'Alderman Marcus Hill works with her.</div></div><button class="act sm">Open card</button></div>')
web = menu("People", webtools + f'<div class="web2"><svg class="wl" viewBox="0 0 800 440">{lines}</svg>{nh}</div>{leg}{known}', 1300, 740)
screen("people", "People: the web", "Built on the old People web. Filters along the top: picking Politics keeps those people in full color and dims the rest. Lines are colored by kind (family, household dashed, work, politics, people you know), with the legend underneath. Clicking a face lights their lines and says in words how you know them.",
       stage("house-suburban-living__midday", web + hud(toast=False), blur=True))

# 4 person card, tall, Skyrim-like: compact header, then their public journal
pj = [("Jan 6, 2025", "Spoke against raising water rates at the Board of Aldermen; the increase failed 2 to 4."),
      ("Oct 2024", "Opened the new splash pad at Pecan Street Park."),
      ("Jul 2021", "Sworn in as mayor after beating Harold Cobb, 58 to 42."),
      ("2013 – 2021", "Alderwoman for Ward 3."),
      ("1984 – 2013", "Taught chemistry at Latimer High School."),
      ("1963", "Born in Latimer.")]
tl = "".join(f'<div class="ev"><b>{d}</b><span>{t}</span></div>' for d, t in pj)
card = panel('<div class="pc2"><div class="pchead"><img src="img/bust-look-020.png" alt=""><div><div class="name huge">Ida Banks</div><div class="label2">Mayor of Latimer · 61 · Oak Street</div>'
             '<div class="chips"><span>Your mayor</span><span>Democrat</span><span>Met Jan 6</span></div></div></div>'
             '<div class="meter"><div class="mlab"><span>What she thinks of you</span><b>Warming</b></div><div class="mbar"><i style="left:58%"></i></div><div class="mends"><span>Cold</span><span>Warm</span></div></div>'
             + tabs(["Her story", "You and her", "Her record"], "Her story") + f'<div class="ptl">{tl}</div>'
             '<div class="acts"><button class="act primary">Talk</button><button class="act">Visit</button><button class="act">Call</button></div></div>', "card tall",
             "width:620px;height:800px;left:460px;top:50px")
screen("person", "Person card", "Taller than wide, like Skyrim's character panels. Name, age, office and home in a small header; a meter for what they think of you; then their public journal: what anyone in town could know about their life, newest first. The other tabs hold your history together and their public record.",
       stage("council-chamber__midday", card + hud(toast=False), blur=True))

# 5 government: chamber picture, roster, recent votes, coming up
gov_rows = [("025", "Marcus Hill", "Ward 1", "D"), ("029", "Daniel Cho", "Ward 2", "R"), ("028", "Angela Price", "Ward 3", "D"),
            ("027", "Walter Greer", "Ward 4", "R"), ("034", "Priya Nair", "Ward 5", "I"), ("035", "Otis Freeman", "At large", "D")]
roster = "".join(f'<div class="seat"><img src="img/bust-look-{l}.png" alt=""><div><b>{n}</b><span>{w}</span></div><em class="pty {p}">{p}</em></div>' for l, n, w, p in gov_rows)
govbody = (tabs(["Your office", "Campaigns", "Government", "Parties", "Issues", "Budget"], "Government")
           + '<div class="scope"><span class="tab on">Local</span><span class="tab">State</span><span class="tab">Federal</span><span class="sep"></span>'
           '<span class="tab on">Legislative</span><span class="tab">Executive</span><span class="tab">Judicial</span></div>'
           '<div class="gov2"><div class="gcol"><div class="ghero" style="background-image:url(img/council-chamber__midday.jpg)"><div><div class="heading sm">Latimer Board of Aldermen</div>'
           '<div class="label2">Meets 1st and 3rd Tuesdays · City Hall · next election June 3, 2025</div></div></div>'
           '<div class="split"><span style="flex:3;background:#43597a">3 Democrats</span><span style="flex:2;background:#7a2f2a">2 Republicans</span><span style="flex:1;background:#6f665a">1</span></div>'
           f'<div class="roster">{roster}</div></div>'
           '<div class="gcol"><div class="label">Recent votes</div>' + ybar(4, 2, "Drainage bond, $1.2 million · Jan 21") + ybar(2, 4, "Water rate increase · Jan 6") + ybar(6, 0, "Pecan Street paving · Dec 17")
           + '<div class="label" style="margin-top:22px">Coming up</div><div class="agenda"><div><b>Feb 4</b><span>Budget amendment for the police department</span></div>'
           '<div><b>Feb 18</b><span>Rezoning on Highway 8 for a dollar store</span></div><div><b>Mar 7</b><span>Filing deadline for all six seats</span></div></div>'
           '<div class="label" style="margin-top:22px">Mayor</div><div class="seat big"><img src="img/bust-look-020.png" alt=""><div><b>Ida Banks</b><span>Democrat · since July 2021</span></div></div></div></div>')
screen("gov", "Politics: Government", "Each body opens on its chamber, its party split, its members, how its recent votes went and what's on its agenda. Clicking a member opens their card.",
       stage("council-chamber__midday", menu("Politics", govbody, 1300, 740) + hud(toast=False), blur=True))

# 6 issues as law cards (Democracy 4 policy tiles / CK3 law cards)


def law(icon, title, value, sub, pos, lo, hi, who, tone="#c9a764"):
    return (f'<div class="law"><div class="lawtop"><span class="ring">{ic(icon)}</span><div><div class="lt">{title}</div><div class="who2">{who}</div></div></div>'
            f'<div class="lv">{value}</div><div class="spec"><i style="left:{pos}%;background:{tone}"></i></div><div class="specl"><span>{lo}</span><span>{hi}</span></div><div class="ls">{sub}</div></div>')


cats = [("Economy", [law("wage", "Minimum wage", "$7.25 an hour", "Federal law since 2009; Mississippi sets none", 8, "None", "$17+", "Congress"),
                     law("water", "Water rates", "$38 a month", "Average home; raise failed Jan 6", 40, "Low", "High", "Board of Aldermen")]),
        ("Taxes", [law("income", "State income tax", "4.4%", "On income over $10,000; falls to 4.0% in 2026", 35, "None", "10%+", "Legislature"),
                   law("sales", "Sales tax", "7% · groceries 5%", "Grocery rate cut July 2025", 62, "None", "10%+", "Legislature"),
                   law("property", "Property tax", "38 mills", "Set by the board each September", 45, "Low", "High", "Board of Aldermen")]),
        ("Rights and safety", [law("carry", "Carrying a handgun", "No permit needed", "State law since 2016", 90, "Banned", "Anyone", "Legislature", "#b07860"),
                               law("health", "Abortion", "Banned, narrow exceptions", "Life of the mother, or rape reported to police; since 2022", 6, "Banned", "Legal", "Legislature", "#b07860")]),
        ("Health", [law("medicaid", "Medicaid", "Not expanded", "Adults without children don't qualify", 15, "Narrow", "Broad", "Legislature", "#8caabe")])]
order = {"Taxes": 0, "Health": 1, "Economy": 2, "Rights and safety": 3}
cats.sort(key=lambda c: order[c[0]])
lawhtml = "".join(f'<div class="lcat"><div class="label">{c}</div><div class="lrow">{"".join(ls)}</div></div>' for c, ls in cats)
screen("issues", "Politics: Issues", "The law where you live as cards, grouped by subject, after Democracy 4's policy screen and CK3's law cards. Each card shows the law in force in large type, a marker for where it sits between the extremes, how long it's held, and who can change it. Clicking a card opens its history and the votes.",
       stage("state-house-chamber__midday", menu("Politics", tabs(["Your office", "Campaigns", "Government", "Parties", "Issues", "Budget"], "Issues") + f'<div class="laws">{lawhtml}</div>', 1300, 740) + hud(toast=False), blur=True))

# 7 budget: the chart style (donuts + compare bars)
inc = [("Property tax", 31, "#2f5f63"), ("Sales tax share", 24, "#7a2f2a"), ("State aid", 18, "#43597a"), ("Water and sewer fees", 14, "#5f6e3a"), ("Fines and fees", 6, "#b48a3c"), ("Other", 7, "#6b4a5e")]
out = [("Police", 29, "#2f5f63"), ("Streets and drainage", 21, "#7a2f2a"), ("Water and sewer", 17, "#43597a"), ("Fire", 13, "#5f6e3a"), ("Parks", 6, "#b48a3c"), ("Administration", 9, "#6b4a5e"), ("Debt", 5, "#6f665a")]
cmp = [("Police", 2.4, 2.2), ("Streets and drainage", 1.8, 1.1), ("Water and sewer", 1.4, 1.4), ("Fire", 1.1, 1.0), ("Parks", 0.5, 0.6)]
cmph = "".join(f'<div class="cmp"><div class="ch"><span>{n}</span><em>${a:.1f}M</em></div><div class="cb"><i class="ly" style="width:{b / 2.6 * 100:.0f}%"></i><i class="ty" style="width:{a / 2.6 * 100:.0f}%"></i></div></div>' for n, a, b in cmp)
bud = (tabs(["Your office", "Campaigns", "Government", "Parties", "Issues", "Budget"], "Budget")
       + '<div class="bhead"><div class="heading sm">City of Latimer, fiscal year 2025 · $8.4 million</div><div class="label2">Adopted September 12, 2024, by the Board of Aldermen, 5 to 1</div></div>'
       '<div class="bud2"><div class="bcol"><div class="btitle">Where it comes from</div><div class="dw">' + donut(inc, "$8.4M<br><small>in</small>") + legend(inc, 8.4) + '</div></div>'
       '<div class="bcol"><div class="btitle">Where it goes</div><div class="dw">' + donut(out, "$8.4M<br><small>out</small>") + legend(out, 8.4) + '</div></div>'
       f'<div class="bcol"><div class="btitle">This year against last</div>{cmph}<div class="cmpk"><span><i class="ty"></i>2025</span><span><i class="ly"></i>2024</span></div></div></div>')
screen("budget", "Charts: the budget", "Not a screen of its own: this is the chart style for any screen that compares numbers, as donuts, bars or this-year-against-last. Shown here on the city budget; Money and the votes use the same pieces.",
       stage("council-chamber__midday", menu("Politics", bud, 1300, 740) + hud(toast=False), blur=True))

# 8 calendar: one month, Coming up, a day opened between them
import calendar as cal
EV = {20: [("vote", "Inauguration")], 23: [("gavel", "Aldermen meet")], 28: [("gift", "Evelyn's birthday")], 31: [("hourglass", "Rent due")]}


def month1(y, m, today, picked):
    c = cal.Calendar(6)
    cells = ""
    for d in c.itermonthdays(y, m):
        if d == 0:
            cells += '<div class="d2 empty"></div>'
            continue
        cls = "d2" + (" today" if d == today else "") + (" past" if d < today else "") + (" picked" if d == picked else "")
        evs = "".join(f'<span title="{t}">{ic(i, "ei")}</span>' for i, t in EV.get(d, []))
        cells += f'<div class="{cls}"><b>{d}</b><div class="evs">{evs}</div></div>'
    wd = "".join(f'<div class="wd">{w}</div>' for w in ["S", "M", "T", "W", "T", "F", "S"])
    return f'<div class="month1"><div class="heading sm">{cal.month_name[m]} {y}</div><div class="grid2">{wd}{cells}</div></div>'


dayp = ('<div class="daypop"><div class="kicker">Thursday</div><div class="heading">January 23</div><div class="label2">3 days from now</div>'
        '<div class="dpev"><span class="ring sm">' + ic("gavel") + '</span><div><b>Board of Aldermen meets</b><span>6:00 PM · City Hall · open to the public</span>'
        '<em>On the agenda: the $1.2 million drainage bond, a liquor license for the Highway 8 gas station</em></div></div>'
        '<div class="dpev"><span class="ring sm">' + ic("coin") + '</span><div><b>Night shift</b><span>10:00 PM to 6:00 AM · Sunflower Catfish</span></div></div>'
        '<div class="dpgo"><button class="act primary">Go to this day</button></div></div>')
nxt = '<div class="next"><div class="heading sm">Coming up</div>' + "".join(f'<div class="nx"><b>{d}</b><span>{t}</span></div>' for d, t in [
    ("Thu, Jan 23", "Board of Aldermen meets"), ("Tue, Jan 28", "Evelyn's birthday"), ("Fri, Jan 31", "Rent due"), ("Tue, Feb 4", "Board of Aldermen meets"),
    ("Fri, Feb 14", "Filing opens for aldermen"), ("Fri, Mar 7", "Filing deadline"), ("Tue, Apr 1", "Party primaries"), ("Tue, Jun 3", "City general election")]) + "</div>"
calbody = f'<div class="cal2">{month1(2025, 1, 20, 23)}{dayp}{nxt}</div>'
screen("calendar", "Calendar", "One month and Coming up. Days are short tiles with small event icons instead of printed text. Clicking a day (here the 23rd) slides a day panel open between the month and Coming up, with what's happening, where and when, and Go to this day for future days. Past days are dimmed.",
       stage("home-kitchen__midday", menu("Calendar", calbody, 1300, 580) + hud(toast=False), blur=True))

# 9 journal (approved, unchanged)
jour = panel('<div class="page"><div class="jt">My life</div><div class="jc">Chapter one · Latimer</div><div class="jrule"></div>'
             '<p>I was born in Latimer in the spring of 2006, the second of Ruth and Earl Spencer\'s three children. Dad worked nights at the catfish plant on Highway 8; Mom kept the books for the Methodist church and kept the rest of us in line.</p>'
             '<p>Evelyn was two years older and never let me forget it. Our house on Pecan Street had a porch that leaned toward the road, and on summer evenings half the street ended up on it.</p>'
             '<p>The winter I turned seventeen, the plant cut Dad\'s shift. He came home at six in the morning for the last time and sat at the kitchen table without taking his coat off.</p></div>', "journal",
             "width:760px;height:760px;left:390px;top:40px")
screen("journal", "Journal", "Your memoir, in chapters, first person, on a plain page.",
       stage("house-suburban-living__midday", jour + hud(toast=False), blur=True))

# 10 who you are: portrait on its own painted background, trait medallions
traits = [("stubborn", "Stubborn"), ("curious", "Curious"), ("calm", "Slow to anger"), ("loyal", "Loyal")]
th = "".join(f'<div class="medal"><span class="ring">{ic(i)}</span><span>{t}</span></div>' for i, t in traits)
views = [("Jobs", "The plant should have warned people before cutting the shift.", 25), ("Taxes", "The grocery tax hurts families like his.", 30), ("Town", "Fix the north-side drainage before anything else.", 70)]
vh = "".join(f'<div class="view"><b>{t}</b><span>{v}</span></div>' for t, v, _ in views)
who = panel('<div class="who2w"><div class="portrait2" style="background-image:url(img/house-gulf-coast-raised__midday.jpg)"><img src="img/fig-look-004.png" alt=""></div>'
            '<div class="whob"><div class="name huge">John Spencer</div><div class="label2">18 · born April 3, 2006 · Pecan Street, Latimer</div>'
            f'<div class="medals">{th}</div>'
            + rows([("Household", "Your parents, Ruth and Earl, on Pecan Street"), ("School", "Graduated Latimer High School, May 2024"), ("Job", "Line worker, Sunflower Catfish, nights")])
            + f'<div class="label" style="margin-top:20px">Your views</div><div class="views2">{vh}</div>'
            + '<div class="mline">' + ic("coin") + '<span>$412 in checking · you pay $150 a month toward the house</span></div></div></div>', "card",
            "width:1180px;height:640px;left:170px;top:60px")
screen("who", "Who you are", "You at full height in front of your own house: the portrait has a real painted background from your life, not a dark keyhole. Traits are medallions with an icon each. Then household, school and job, the views you've formed, and one line of money.",
       stage("house-suburban-living__midday", who + hud(toast=False), blur=True))

# 11 money: charts and cards
spend = [("House share", 9, "#2f5f63"), ("Truck payment", 13, "#7a2f2a"), ("Gas", 10, "#43597a"), ("Groceries", 14, "#5f6e3a"), ("Phone", 5, "#b48a3c"), ("Saved", 49, "#6f665a")]
months = [("Aug", 180), ("Sep", 240), ("Oct", 205), ("Nov", 310), ("Dec", 260), ("Jan", 412)]
mb = "".join(f'<div class="mcol"><i style="height:{v / 412 * 150:.0f}px"></i><span>{m}</span></div>' for m, v in months)
moneyb = ('<div class="money2"><div class="mcard big"><div class="kicker">In checking · Delta Savings</div><div class="bignum">$412</div><div class="label2">Payday Friday: $656 from Sunflower Catfish</div>'
          f'<div class="mchart">{mb}</div><div class="label2">End-of-month balance</div></div>'
          '<div class="mcard"><div class="btitle">Where January went · $1,640 in</div><div class="dw">' + donut(spend, "$1,640") + legend(spend) + '</div></div>'
          '<div class="mcol2"><div class="mcard sm2"><span class="ring">' + ic("truck") + '</span><div><b>2014 Ford Ranger</b><span>Yours · worth about $9,500</span></div></div>'
          '<div class="mcard sm2"><span class="ring">' + ic("loan") + '</span><div><b>Truck loan · $4,900 left</b><span>9.4% · $210 a month · 26 payments to go</span><div class="pbar"><i style="width:58%"></i></div></div></div>'
          '<div class="mcard sm2"><span class="ring">' + ic("property") + '</span><div><b>Your parents\' house</b><span>Pecan Street · you pay $150 a month toward it</span></div></div></div></div>')
screen("money", "Money and property", "Cash in large type with the last six months as bars, where this month's money went as a donut (the approved chart style), and what you own and owe as cards, with the loan's progress.",
       stage("home-kitchen__midday", menu("Money", moneyb, 1300, 580) + hud(toast=False), blur=True))

# 12 jobs and study
jobsb = ('<div class="jobs2"><div class="jobcard"><div class="jimg" style="background-image:url(img/factory-floor__midday.jpg)"></div><div class="jb"><div class="kicker">Your job</div><div class="name big">Line worker</div>'
         '<div class="label2">Sunflower Catfish · Highway 8, Latimer</div>' + rows([("Pay", "$10.25 an hour"), ("Hours", "Nights, 40 a week"), ("Since", "June 2024")])
         + '<div class="warn">The night shift ends February 1.</div></div></div>'
         '<div class="jcol"><div class="label">Offers waiting</div><div class="offer"><div class="oimg" style="background-image:url(img/general-store__midday.jpg)"></div><div><b>Stocker · Dollar General</b><span>$11.00 an hour · days · answer by January 24</span>'
         '<div class="acts"><button class="act sm">Take it</button><button class="act sm">Turn it down</button></div></div></div>'
         '<div class="label" style="margin-top:20px">School</div><div class="school"><div class="sch"><span class="ring sm">' + ic("school") + '</span><div><b>Latimer High School</b><span>2020 to 2024 · diploma</span></div></div>'
         '<div class="sch"><span class="ring sm">' + ic("school") + '</span><div><b>Mississippi Delta Community College</b><span>Moorhead · you could apply for fall</span></div></div></div></div></div>')
screen("jobs", "Jobs and study", "Your job as a card with the workplace's painting; offers waiting with their own picture and Take it or Turn it down; your schooling and what you could apply for.",
       stage("home-kitchen__midday", menu("Jobs and study", jobsb, 1300, 640) + hud(toast=False), blur=True))

# 13 travel (liked; unchanged)
places = [("council-chamber__midday", "City Hall", "the clerk, Samantha Hawkins"), ("county-courtroom__midday", "Bolivar County Courthouse", "Judge Ward; 3 people waiting"),
          ("public-meeting-room__midday", "Public library meeting room", "nobody"), ("church-sanctuary__midday", "First Baptist Church", "Pastor Nina Cole"),
          ("school-board-room__midday", "School district office", "2 board members"), ("county-commission__midday", "County supervisors' room", "Supervisor Ruiz")]
th2 = "".join(f'<div class="place"><div class="thumb" style="background-image:url(img/{b}.jpg)"><span class="here"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" fill="none" stroke="#d6bd84" stroke-width="1.4"/><circle cx="16" cy="9" r="2.5" fill="none" stroke="#d6bd84" stroke-width="1.4"/><path d="M3 19c0-3.5 2.6-6 6-6s6 2.5 6 6M14 14c3 0 6 2 6 5" fill="none" stroke="#d6bd84" stroke-width="1.4"/></svg></span></div><b>{n}</b><span>{w}</span></div>' for b, n, w in places)
screen("travel", "Travel", "Where you are, then where you can go: each place's painting, its name and who is there now.",
       stage("home-kitchen__midday", menu("Travel", '<div class="label">You are at home, Pecan Street</div><div class="places">' + th2 + "</div>", 1300, 740) + hud(toast=False), blur=True))

# 14-17 newspapers: four outlets, four looks
side1 = ('<div class="side"><div class="sh">Latimer aldermen pass drainage bond, 4 to 2</div><p>The $1.2 million bond will rebuild the ditches along the north side of town.</p>'
         '<div class="sh">Catfish plant to cut night shift</div><p>Sunflower Catfish says 140 jobs end February 1.</p><div class="sh">Weather</div><p>Rain Thursday, clearing by the weekend.</p></div>')
p1 = ('<div class="paper"><div class="mast"><div class="ears"><span>Late edition</span><span>Partly cloudy, high 58</span></div><div class="nameplate">The Delta Courier</div>'
      '<div class="dateline"><span>Wednesday, November 8, 2028</span><span>Greenville, Mississippi</span><span>$2.00</span></div></div>'
      '<div class="fp"><div class="lead"><div class="hl">Walker wins the White House, 312 to 226</div><div class="deck">Ohio governor carries 30 states; Mississippi goes his way by 17 points</div>'
      '<img class="photo" src="img/np-pres.png" alt=""><div class="cap">President-elect Thomas Walker greets supporters in Columbus early Wednesday. Photo: Courier wire</div>'
      '<div class="cols"><p><b>COLUMBUS, Ohio</b> — Thomas Walker, the two-term governor of Ohio, won the presidency Tuesday night, carrying the Rust Belt and holding the South.</p>'
      '<p>In Mississippi, Walker won 57 percent of the vote. Bolivar County went the other way, as it usually does.</p></div></div>' + side1 + "</div></div>")
screen("news", "News: the old broadsheet", "A big daily's front page: blackletter nameplate, the result written as the headline, and a photo the game paints of the actual winner.",
       stage("home-kitchen__midday", f'<div class="paperwrap">{p1}</div>' + hud(toast=False), blur=True))

p2 = ('<div class="paper modern"><div class="mbanner"><span class="dot"></span><span class="mname">The Capital Herald</span><span class="mdate">Thursday, July 3, 2025 · Jackson</span></div>'
      '<div class="msec"><span>NEWS</span><span>MONEY</span><span>SPORTS</span><span>LIFE</span></div>'
      '<div class="mgrid"><div class="mlead"><div class="mkick">STATE CAPITOL</div><div class="mhl">Governor signs grocery tax cut</div><div class="mdeck">Food tax drops from 7% to 5%; a family of four saves about $230 a year</div>'
      '<img class="photo" src="img/np-gov.png" alt=""><div class="cap">Gov. Margaret Hale signs the bill in the Capitol on Wednesday.</div></div>'
      '<div class="mrail"><div class="mbox"><div class="mkick">BY THE NUMBERS</div><div class="mbig">$230</div><div class="msm">saved a year by a family of four</div></div>'
      '<div class="mbox"><div class="mkick">ALSO INSIDE</div><p>Delta catfish prices hit a five-year low</p><p>Ole Miss lands top recruit</p><p>Storms expected through the weekend</p></div></div></div></div>')
screen("news2", "News: the modern daily", "A regional daily in the modern style: color nameplate bar, section tabs, a sans-serif headline, and a numbers box. Different fonts and layout so it feels like a different paper.",
       stage("home-kitchen__midday", f'<div class="paperwrap">{p2}</div>' + hud(toast=False), blur=True))

p3 = ('<div class="paper tabloid"><div class="tname">THE DAILY BLAST</div><div class="tsub">Wednesday, Nov 8, 2028 · 50¢</div>'
      '<div class="tphoto"><img src="img/np-pres.png" alt=""><div class="thl">LANDSLIDE!</div><div class="tdeck">Walker romps to White House with 312 votes</div></div>'
      '<div class="tstrip"><div><b>PLANT SHOCK</b><span>140 night-shift jobs gone at Sunflower</span></div><div><b>RAIN, RAIN</b><span>Flood watch for the Delta</span></div><div><b>WILDCATS ROLL</b><span>Latimer 54, Cleveland 49</span></div></div></div>')
screen("news3", "News: the tabloid", "A tabloid: one huge word over the photo, bold condensed type, short punchy teasers along the bottom.",
       stage("home-kitchen__midday", f'<div class="paperwrap">{p3}</div>' + hud(toast=False), blur=True))

weekly = ('<div class="paper weekly"><div class="mast"><div class="nameplate wk">The Latimer Ledger</div><div class="dateline"><span>Thursday, January 23, 2025</span><span>Serving Latimer and Bolivar County since 1918</span><span>75&cent;</span></div></div>'
          '<div class="fp"><div class="lead"><div class="hl wk">Aldermen split 4–2 on drainage bond</div><img class="photo" src="img/np-council.png" alt="">'
          '<div class="cap">Mayor Ida Banks calls the vote at Tuesday\'s meeting at City Hall.</div>'
          '<div class="cols"><p>The Latimer Board of Aldermen voted 4 to 2 on Tuesday to borrow $1.2 million to rebuild the ditches on the north side of town, after a meeting that ran past ten o\'clock.</p>'
          '<p>Alderman Walter Greer, who voted no, said the city should wait for state money. "We\'ll be paying this off for twenty years," he said.</p></div></div>'
          '<div class="side"><div class="sh">Revival at First Baptist</div><p>February 23 through 26, 7 PM nightly.</p><div class="sh">Lady Wildcats win district</div><p>Latimer beat Cleveland 54–49.</p>'
          '<div class="sh">Obituaries</div><p>Mae Ella Hawkins, 91. Clarence T. Moore, 77.</p></div></div></div>')
screen("weekly", "News: the town weekly", "A small-town weekly: plainer and homier, local stories, sports and obituaries.",
       stage("home-kitchen__midday", f'<div class="paperwrap">{weekly}</div>' + hud(toast=False), blur=True))

# 18 overheard, chat-text style
oh = panel('<div class="ohrow"><span class="ohic">' + ic("radio") + '</span><div><div class="kicker">WLAT 98.1 · radio in the kitchen</div>'
           '<p class="speech sm">"...Sunflower Catfish confirmed this morning that the night shift at the Latimer plant ends February first..."</p></div></div>', "oh",
           "left:420px;bottom:24px;width:780px")
screen("overheard", "News you overhear", "A TV or radio on in the room speaks like anyone else: a small card in the chat-text style with a tiny radio or TV icon, the station, and the line.",
       stage("home-kitchen__midday", oh + hud(toast=False), figs=fig("003", 760, 120, 480) + fig("008", 1000, 110, 520, True)))

# 19 options (approved, unchanged)
opts = menu("Options", '<div class="opts"><div class="row"><b>Version</b><span>0.14.2 · October 14, 2026</span></div>'
            '<div class="optrow"><span class="label2">Music</span><div class="slider"><i style="width:60%"></i><em style="left:60%"></em></div></div>'
            '<div class="optrow"><span class="label2">Sound</span><div class="slider"><i style="width:80%"></i><em style="left:80%"></em></div></div>'
            '<div class="optrow"><span class="label2">Full screen</span><span class="check on">&#x2713;</span></div>'
            '<div class="acts" style="margin-top:30px"><button class="act primary">Continue</button><button class="act">Quit to title</button></div></div>', 760, 420)
screen("options", "Options", "Version, Quit to title, sound and window settings.",
       stage("home-kitchen__midday", opts + hud(toast=False), blur=True))
