window.__poseHair = () => {
 const P = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/refs/heads/claude/people-rooms-art/art/people-rooms/pose-plates/';
 const W = ['shoulder-length wavy hair','long straight hair past the shoulders','a short rounded natural afro','a chin-length bob with straight bangs','long box braids','a neat high bun','a low ponytail','a short pixie cut','shoulder-length locs','long loose curls','short two-strand twists','medium layered hair swept to one side'];
 const M = ['a short cropped cut','a short side-parted cut','short tight curls','a close buzz cut','a low fade with a short textured top','slicked-back medium-length hair','short hair with a receding hairline','a classic crew cut','short locs','neat cornrows','medium-length wavy hair','short hair on the sides with a bald crown'];
 const POSES = ['pa-i1','pa-i2','pa-i3','pa-c1','pa-c2','pd-1','pd-2','pd-3','pdo-1','pdo-2','pdo-3','pdm-1','pdg-1','pdc-1','pdcol'];
 const jobs = []; const nn = i => String(i + 1).padStart(2, '0');
 POSES.forEach(pose => W.forEach((w, i) => { const key = `ph-${pose.replace('-', '')}-${nn(i)}`;
  jobs.push({key, ref: P + pose + '.png', prompt: `[${key}] Edit the reference picture. Keep everything exactly the same: every person's pose, position, size, face, ears, body, clothes, outlines and shading, and the whole room, pixel for pixel. Only give each person hair, drawn in the same clean dark-outline style, the hair one plain medium gray. Every woman has ${w}. Every man has ${M[i]}. Draw the hair as seen from the angle each head is turned, sitting naturally on that head at the right size, following the shape of the skull, and not covering the face. Nothing else changes. No text.`}); }));
 return jobs;
};
