// Near rows for legislatures: the big seats closest to the viewer, seen from behind, seat back hiding the body.
window.__WS = {"us-house-floor":"ush","state-house-chamber":"sth","state-legislative-chamber-unicameral":"uni"};
window.__wsJob = (place, n) => {
  const code = window.__WS[place];
  const mix = window.__XS_MIX[(n + 3) % 5];
  const near = n < 6;
  const where = near
    ? ["Seat only four lawmakers, all in the two rows of seats nearest the viewer, the big seats at the bottom of the picture,", "Seat only four lawmakers, all in the row of seats nearest the viewer,", "Seat only five lawmakers, all in the second and third rows from the viewer,"][n % 3] + ` ${["on the left side", "on the right side", "on both sides"][Math.floor(n / 2) % 3]}, with two or more empty seats between any two of them.`
    : `Seat only twelve lawmakers spread over the middle and far rows, ${window.__XS_WHERE[n % 5]}, with several empty seats between any two of them so nobody touches.`;
  const key = `w-${code}-${String(n + 1).padStart(2, "0")}`;
  return { key, ref: `https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/${place}__midday.jpg`,
    prompt: `[${key}] Edit the reference picture. ${where} Each one sits deep in the seat, seen from behind, facing the rostrum: the high seat back is between them and the viewer and hides their back, arms and legs, so only the head, neck and shoulders show above it. Nobody sits beside a seat; nobody's face is turned to the viewer. Business suits and blazers in navy, black, gray and burgundy. ${mix} Keep the room, the furniture, the light and everything else exactly the same. Same art style: clean dark ink outlines, flat soft cel shading. No text.` };
};
window.__wsBatch = (tab, ntabs) => { const all = []; Object.keys(window.__WS).forEach(p => { for (let n = 0; n < 10; n++) all.push(window.__wsJob(p, n)); }); const per = Math.ceil(all.length / ntabs); return all.slice(tab * per, (tab + 1) * per); };
"ws ok";
