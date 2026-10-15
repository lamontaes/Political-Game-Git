// Second pass for legislatures: people seated deep in the seats, the seat back between them and the viewer.
window.__YS = {"state-legislative-chamber-bicameral":["bic","f",10,10],"us-house-floor":["ush","b",14,6],"state-house-chamber":["sth","b",12,6],"state-legislative-chamber-unicameral":["uni","b",12,6],"us-senate-floor":["sen","b",12,6]};
window.__ysJob = (place, n) => {
  const [code, kind, count] = window.__YS[place];
  const mix = window.__XS_MIX[n % 5], where = window.__XS_WHERE[(n + 2) % 5];
  const seat = kind === "f"
    ? "Each one sits in a black leather chair on the far side of a wooden desk, facing into the room: the desk is between them and the viewer and hides them from the chest down. They look down at the papers on the desk or turn toward a neighbor; nobody looks at the viewer. Nobody sits in front of a desk or beside a chair."
    : "Each one sits deep in a seat at a desk, seen from behind, facing the rostrum: the high seat back is between them and the viewer and hides their back, arms and legs, so only the head, neck and shoulders show above it; the desk is beyond them, toward the rostrum. Nobody sits beside a seat or in front of a desk; nobody's face is turned to the viewer.";
  const key = `y-${code}-${String(n + 1).padStart(2, "0")}`;
  return { key, ref: `https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/${place}__midday.jpg`,
    prompt: `[${key}] Edit the reference picture. Seat only ${count} lawmakers on the chamber floor, far apart from each other, ${where}, with several empty seats between any two people so that no two people touch, overlap or sit next to each other. ${seat} Business suits and blazers in navy, black, gray and burgundy. ${mix} Keep the room, the furniture, the light and everything else exactly the same. Same art style: clean dark ink outlines, flat soft cel shading. No text.` };
};
window.__ysBatch = (tab, ntabs) => { const all = []; Object.keys(window.__YS).forEach(p => { for (let n = 0; n < window.__YS[p][3]; n++) all.push(window.__ysJob(p, n)); }); const per = Math.ceil(all.length / ntabs); return all.slice(tab * per, (tab + 1) * per); };
"ys ok";
