window.__wardrobe = (sheet) => {
 const SH = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/people-engine/v2/sheets/clarify-' + sheet + '.png';
 const only = (part, rest) => `Edit the reference picture. Keep all six people exactly the same, pixel for pixel, except their ${part}: the same heads, faces, hands, bodies, poses, positions and sizes, and ${rest} stay identical. `;
 const tail = ' Draw it in the same clean dark-outline style, plain medium gray with soft shading, fitted to each body\'s own build. Nothing else changes. No text.';
 const TOPS = [['t1', 'a suit jacket over a collared button shirt (as now)'], ['t2', 'a collared button shirt with no jacket, sleeves down'], ['t3', 'a short-sleeve polo shirt'], ['t4', 'a plain long-sleeve crew-neck tee'], ['t5', 'a work vest with pockets over a collared button shirt']];
 const PANTS = [['p1', 'dress slacks (as now)'], ['p2', 'straight-leg jeans'], ['p3', 'chino khakis'], ['p4', 'knee-length shorts'], ['p5', 'loose work pants with side pockets']];
 const SHOES = [['s1', 'polished dress shoes (as now)'], ['s2', 'canvas sneakers'], ['s3', 'leather work boots'], ['s4', 'casual loafers'], ['s5', 'running shoes']];
 const J = [];
 for (const [k, t] of TOPS) J.push({key: `wd-${sheet}-${k}`, ref: SH, prompt: `[wd-${sheet}-${k}] ` + only('top (jacket and shirt)', 'their pants and shoes') + `Change only the top: everyone wears ${t}.` + tail});
 for (const [k, t] of PANTS) J.push({key: `wd-${sheet}-${k}`, ref: SH, prompt: `[wd-${sheet}-${k}] ` + only('pants', 'their jackets, shirts and shoes') + `Change only the pants: everyone wears ${t}.` + tail});
 for (const [k, t] of SHOES) J.push({key: `wd-${sheet}-${k}`, ref: SH, prompt: `[wd-${sheet}-${k}] ` + only('shoes', 'their clothes') + `Change only the shoes: everyone wears ${t}.` + tail});
 return J;
};
