window.__hairAngles = (profRef, tqbRef) => {
 const W = ['shoulder-length wavy hair','long straight hair past the shoulders','a short rounded natural afro','a chin-length bob with straight bangs','long box braids','a neat high bun','a low ponytail','a short pixie cut','shoulder-length locs','long loose curls','short two-strand twists','medium layered hair swept to one side'];
 const M = ['a short cropped cut','a short side-parted cut','short tight curls','a close buzz cut','a low fade with a short textured top','slicked-back medium-length hair','short hair with a receding hairline','a classic crew cut','short locs','neat cornrows','medium-length wavy hair','short hair on the sides with a bald crown'];
 const keep = 'Edit the reference picture. Keep all six people exactly the same: the same pose, position, size, face, ears, body, clothes, outlines and shading, pixel for pixel. ';
 const views = [['prof', profRef, 'Everyone is seen in exact profile, as in the picture; draw each hairstyle as seen from the side, with its full length and shape at the back of the head.'],
                ['tqb', tqbRef, 'Everyone is turned away from the viewer three-quarters, as in the picture; draw each hairstyle as seen from behind and to the side, covering the whole back and crown of the head.']];
 const jobs = []; const nn = i => String(i + 1).padStart(2, '0');
 for (const [v, ref, how] of views) W.forEach((w, i) => { const key = `ha-${v}-${nn(i)}`;
  jobs.push({key, ref, prompt: `[${key}] ` + keep + `Only give each person hair, drawn in the same clean dark-outline style, every person's hair the same plain medium gray. The three women in the top row all have ${w}. The three men in the bottom row all have ${M[i]}. ${how} The hair sits naturally on each head at the right size, follows the shape of the skull, and does not cover the face. Nothing else changes. No text.`}); });
 return jobs;
};
