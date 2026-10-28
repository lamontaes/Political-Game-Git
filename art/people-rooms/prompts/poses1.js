window.__poses1 = () => {
 const SH = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/people-engine/v2/sheets/';
 const BD = 'https://raw.githubusercontent.com/lamontaes/Political-Game-Git/main/art/backdrops/';
 const keep = 'Edit the reference picture. Keep the same six people exactly: the same bald heads and faces, the same builds, the same gray suit jackets, shirts, pants and shoes, the same art style, warm light and dark background, each person in the same place on the sheet and at the same size. ';
 const tail = ' Each head stays upright and faces the viewer, the same size and in the same place, unless the pose itself touches the head. Natural, relaxed body language, not stiff. Full body visible from head to shoes, and nobody overlaps anybody. Nothing in their hands, no props, no furniture except the plain seat if they sit. No text.';
 const all = (p) => keep + 'Change only their poses: all six ' + p + tail;
 const split = (w, m) => keep + 'Change only their poses. The three women on the top row: ' + w + ' The three men on the bottom row: ' + m + tail;
 const S = SH + 'clarify-31.png', C = SH + 'clarify-37.png';
 const shared = [
  ['ps-01', S, 'stand with their arms crossed over the chest, weight on one leg, waiting.'],
  ['ps-02', S, 'stand and wave hello with the right hand raised to shoulder height, palm open, the left arm relaxed.'],
  ['ps-03', S, 'stand with their hands clasped loosely in front at the waist, listening.'],
  ['ps-04', S, 'stand with the right hand over the heart, as for the national anthem, the left arm at the side.'],
  ['ps-05', S, 'stand and applaud, hands meeting in front of the chest.'],
  ['ps-06', S, 'stand and point with the right arm out toward the left side of the picture, as if showing someone the way.'],
  ['ps-07', S, 'walk toward the viewer, mid-stride, one foot ahead of the other, arms swinging naturally.'],
  ['ps-08', C, 'sit leaning forward with their elbows on their knees and hands loosely together, listening closely.'],
  ['ps-09', C, 'sit leaning back in the seat with their arms folded.'],
  ['ps-10', C, 'sit with the chin resting on one hand and that elbow on the knee, thinking.']];
 const pairs = [
  ['pp-01', S, 'one hand on her hip, weight on one leg, the other arm relaxed.', 'both hands in his trouser pockets, relaxed, weight on one leg.'],
  ['pp-02', S, 'arms folded, each hand holding the other elbow.', 'both hands on his hips, impatient.'],
  ['pp-03', S, 'one hand resting at her collarbone, worried, the other arm at her side.', 'explaining with one low firm hand held out palm down at waist height, the other arm at his side.'],
  ['pp-04', S, 'talking with one open palm turned up in front of her, the other hand at her waist.', 'pointing back over his shoulder with his thumb, the other hand in his pocket.'],
  ['pp-05', S, 'hands clasped behind her back, standing tall.', 'rubbing the back of his neck with one hand, tired and uneasy, the other arm at his side.'],
  ['pp-06', S, 'one arm across her body holding the other arm at the elbow, unsure.', 'arms out to the sides in a shrug, palms up.'],
  ['pp-07', S, 'waving to a crowd with one hand raised high above the shoulder, smiling.', 'leaning on one straight arm, his hand resting on an invisible table edge at hip height beside him.'],
  ['pp-08', C, 'sitting with her legs crossed at the knee and her hands folded on the knee.', 'sitting back with one ankle resting on the other knee, one arm along an invisible armrest.'],
  ['pp-09', C, 'sitting forward with both forearms resting on an invisible desk in front of her, hands together, working hard.', 'sitting forward with both forearms resting on an invisible desk in front of him, working hard.'],
  ['pp-10', C, 'sitting with one elbow on an invisible armrest and her fingertips at her temple, tired.', 'slumped back in the seat with one hand over his forehead and eyes, exhausted.']];
 const NEW = 'Paint a new background scene in exactly the same art style as the reference picture: the same clean dark outlines, flat soft shading, palette and level of detail. Use the reference only for its art style; the place itself is completely different: ';
 const places = [
  ['mt-ovalwin', BD + 'oval-office-resolute__night.jpg', 'the Oval Office of the White House seen from outside at night, from the South Lawn side: the curved white wall with its three tall windows glowing warm from inside, and through the glass the gold curtains, the edge of the Resolute desk and a lit desk lamp; dark lawn and clipped bushes in front, the white columns of the colonnade at one side, a deep blue night sky. The room inside is empty, with clear space behind the desk where a person could stand. No people. No text.'],
  ['mt-colonnade', BD + 'white-house-exterior__midday.jpg', 'the West Wing colonnade at the White House in early morning: a long covered walkway of white columns running from the far distance toward the viewer, the Rose Garden lawn and clipped hedges on one side, soft low sunlight and long shadows across the stone walk, the walkway empty and clear. No people. No text.'],
  ['mt-briefing', BD + 'oval-office-resolute__midday.jpg', 'a West Wing conference room at midday: a long polished wooden table with leather chairs on both sides, a fireplace with a framed portrait above it at the far end, an American flag and a dark blue flag, tall windows with drapes, a low sideboard; the chairs empty and pulled out a little. No people. No text.'],
  ['mt-crossing', BD + 'farm-field__midday.jpg', 'a railroad crossing at the edge of a small plains town: railroad tracks running across the whole picture, a gravel shoulder and a low wooden fence along the near side where people could stand in a line, a crossing sign, a grain elevator and a few houses behind, a huge sky. Midday. No people. No text.'],
  ['mt-depot', BD + 'train-platform__midday.jpg', 'a long small-town train depot platform seen from the tracks: a brick depot with a deep roof overhang, the long empty platform running across the picture with room for a line of people along its edge, benches against the wall, a water tower behind. Midday. No people. No text.'],
  ['mt-roadside', BD + 'main-street__midday.jpg', 'the shoulder of a two-lane highway passing a small town: the road running across the picture, a wide grassy shoulder and a ditch on the near side where people could stand along the road, telephone poles, a gas station and a church steeple behind, open country beyond. Midday. No people. No text.'],
  ['mt-overpass', BD + 'downtown-sidewalk__midday.jpg', 'a city street from below a highway overpass bridge: the long sidewalk of the bridge railing running across the picture where people could stand and look down, apartment buildings and a factory behind, a gray-blue sky. Midday. No people. No text.']];
 return shared.map(([k, r, p]) => ({key: k, ref: r, prompt: '[' + k + '] ' + all(p)}))
  .concat(pairs.map(([k, r, w, m]) => ({key: k, ref: r, prompt: '[' + k + '] ' + split(w, m)})))
  .concat(places.map(([k, r, d]) => ({key: k, ref: r, prompt: '[' + k + '] ' + NEW + d})));
};
