"""Build the screens mockup page (every screen of the plan at 1440x900 in Kit 13)."""
import html

CORNER = ('<svg class="cn" viewBox="0 0 40 40"><defs><linearGradient id="g{n}" x1="0" y1="0" x2="1" y2="1">'
          '<stop offset="0" stop-color="#f3dba7"/><stop offset=".55" stop-color="#c9a764"/><stop offset="1" stop-color="#806337"/></linearGradient></defs>'
          '<path d="M0 0H40L0 40Z" fill="url(#g{n})"/><path d="M40 0L0 40" stroke="#5b4523" stroke-width="1.6"/><path d="M27 13A6 6 0 0 1 13 27" fill="#2a2829" stroke="#5b4523" stroke-width="1"/><circle cx="7" cy="7" r="1.6" fill="#806337"/></svg>')
_cn = [0]


def corners():
    out = []
    for pos in ("tl", "tr", "br", "bl"):
        _cn[0] += 1
        out.append(f'<span class="corner {pos}">{CORNER.format(n=_cn[0])}</span>')
    return "".join(out)


def panel(inner, cls="", style=""):
    return f'<div class="panel {cls}" style="{style}">{corners()}{inner}</div>'


ICONS = [("journal", "Journal"), ("calendar", "Calendar"), ("money", "Money"), ("politics", "Politics"),
         ("people", "People"), ("travel", "Travel"), ("options", "Options")]


def hud(hover=None, toast=True, time="8:30 PM"):
    rail = "".join(
        f'<button class="rb{" hov" if k == hover else ""}"><img src="img/ic-{k}.png" alt=""><span class="tip">{t}</span></button>'
        for k, t in ICONS)
    me = panel(f'<img class="mebust" src="img/bust-look-004.png" alt=""><div class="mewho"><div class="name">John Spencer</div>'
               f'<div class="label2">Latimer, Mississippi</div><div class="label2">Monday, January 20, 2025</div><div class="label2">{time}</div></div>'
               f'<button class="act sm">Day</button>', "me")
    t = ""
    if toast:
        t = panel('<span class="badge"><svg viewBox="0 0 24 24"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 8h3v9a2 2 0 0 1-2 2" fill="none" stroke="#d6bd84" stroke-width="1.4"/><path d="M7 9h7M7 12h7M7 15h4" stroke="#d6bd84" stroke-width="1.2"/></svg></span>'
                  '<div><div class="kicker">The Delta Courier</div><div class="toasthead">Walker wins the White House, 312 to 226</div></div>', "toast")
    return f'<div class="rail">{rail}</div>{me}{t}'


def stage(bg, inner, blur=False, figs=""):
    return (f'<div class="stage"><div class="bg{" blur" if blur else ""}" style="background-image:url(img/{bg}.jpg)"></div>{figs}{inner}</div>')


def fig(look, left, bottom, h, flip=False):
    return f'<img class="fig" src="img/fig-look-{look}.png" style="left:{left}px;bottom:{bottom}px;height:{h}px;{"transform:scaleX(-1);" if flip else ""}" alt="">'


def tabs(names, on):
    return '<div class="tabs">' + "".join(f'<span class="tab{" on" if n == on else ""}">{n}</span>' for n in names) + "</div>"


def rows(pairs):
    return '<div class="rows">' + "".join(f'<div class="row"><b>{k}</b><span>{v}</span></div>' for k, v in pairs) + "</div>"


def menu(title, body, w=1100, h=700, close=True):
    head = f'<div class="mhead"><div class="heading">{title}</div>' + ('<span class="x">&#x2715;</span>' if close else "") + "</div>"
    w = min(w, 1300); h = min(h, 740)
    return panel(head + body, "menu", f"width:{w}px;height:{h}px;left:{110 + (1300 - w) // 2}px;top:{max(20, (760 - h) // 2)}px")


