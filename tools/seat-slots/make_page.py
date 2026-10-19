"""Write the review page from seatpage/stats.json and the renders in seatpage/img."""
import json, html
stats = json.load(open("seatpage/stats.json"))
tot_seats = sum(s["seats"] for s in stats); tot_vars = sum(s["variants"] for s in stats)
cards = []
for s in stats:
    p = s["place"]; n = html.escape(s["name"])
    third_cap, third_alt = ("Night", "at night") if "night" in s["lights"] else ("About two thirds", "about two thirds full")
    cards.append(f"""<article class="room">
<header><h3>{n}</h3><p class="meta"><span>{s['seats']} seats</span><span>{s['variants']} painted people</span><span>{len(s['lights'])} lights</span></p></header>
<figure class="main"><a href="img/{p}__full.jpg"><img src="img/{p}__full.jpg" alt="{n} with every seat filled" loading="lazy"></a><figcaption>Every seat filled</figcaption></figure>
<div class="pair">
<figure><a href="img/{p}__third.jpg"><img src="img/{p}__third.jpg" alt="{n} about a third full" loading="lazy"></a><figcaption>About a third</figcaption></figure>
<figure><a href="img/{p}__night.jpg"><img src="img/{p}__night.jpg" alt="{n} {third_alt}" loading="lazy"></a><figcaption>{third_cap}</figcaption></figure>
</div></article>""")
page = f"""<title>Chamber Seat Slots</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Inter:wght@400;500;600&display=swap">
<style>
:root{{--bg:#f4f1ea;--panel:#fffdf8;--fg:#24211c;--muted:#6b645a;--line:#ddd5c6;--accent:#7a4b1e}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#171512;--panel:#211e1a;--fg:#ece6dc;--muted:#a69d90;--line:#3a352e;--accent:#d9a46a;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#171512;--panel:#211e1a;--fg:#ece6dc;--muted:#a69d90;--line:#3a352e;--accent:#d9a46a;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font:15px/1.55 Inter,system-ui,sans-serif;padding-inline:16px;padding-block:28px 72px}}
main{{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:32px}}
h1,h2,h3{{font-family:"Source Serif 4",Georgia,serif;margin:0;text-wrap:balance}}
h1{{font-size:2.1rem;line-height:1.15}} h2{{font-size:1.35rem}} h3{{font-size:1.15rem}}
p{{margin:0;max-width:72ch}} .sub{{color:var(--muted)}}
.totals{{display:flex;flex-wrap:wrap;gap:20px;font-variant-numeric:tabular-nums;color:var(--muted)}} .totals b{{color:var(--fg);font-size:1.25rem}}
.rooms{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,540px),1fr));gap:20px}}
.room{{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}}
.room header{{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 14px}}
.meta{{display:flex;gap:12px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}}
figure{{margin:0;display:flex;flex-direction:column;gap:4px;min-width:0}} figure img{{display:block;width:100%;height:auto;border-radius:4px}}
figcaption{{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}
ul{{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;max-width:75ch}}
a{{color:var(--accent)}}
</style>
<main>
<header style="display:flex;flex-direction:column;gap:10px">
<h1>Chamber seat slots</h1>
<p class="sub">Every chamber painting below now has seat slots. Firefly painted people into the real chairs of each room, a few at a time and far apart. Each person was then cut out on their own, and the cut-outs were sorted into the seats they belong to. The game draws the empty room and then one person per occupied seat, far rows first. A room can be full for an opening session, about a third full on an ordinary day, or nearly empty, and each person stays in a real seat. Each person also has a copy recolored for every light the room comes in.</p>
<div class="totals"><span><b>{len(stats)}</b> rooms</span><span><b>{tot_seats}</b> seats</span><span><b>{tot_vars}</b> painted people</span></div>
</header>
<section style="display:flex;flex-direction:column;gap:14px"><h2>The rooms</h2><div class="rooms">
{''.join(cards)}
</div></section>
<section style="display:flex;flex-direction:column;gap:10px"><h2>What the game gets</h2>
<ul>
<li>Merged in <code>art/seat-slots/</code> (PR 4158), 15.7 MB in all. Each room has one sprite sheet per light (midday, morning, night, rain) and one <code>seats.json</code>. Each seat lists its painted people. For each person, the file gives where they sit in every light, their floor line for drawing order, and an activity.</li>
<li>Activity <code>plain</code> means hands resting and empty, and it's the default. <code>reading</code> means holding papers, and it's used only when the simulation has them reading. That follows your plain-poses ruling.</li>
<li>Legislators are seen from behind or in profile, facing the rostrum or the center of the room, and nobody in a legislature faces the camera. Officials at a dais face the room, and audiences are seen from behind.</li>
<li>A person in an open-backed chair includes the back showing through the gap and the feet under the seat, so the chair never shows through them.</li>
</ul></section>
</main>"""
open("seatpage/index.html", "w").write(page)
print(len(page))
