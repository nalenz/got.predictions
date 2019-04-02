const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  const [characters, charactersBook] = await Promise.all([utils.loadShowData('characters'), utils.loadBookData('characters')]);

  // get maximum page rank and other uniquified attributes
  const [allegiances, appearances, cultures, titles] = await Promise.all([
    utils.writeJSONSetFromAttr(characters, 'allegiances'),
    utils.writeJSONSetFromAttr(characters, 'appearances'),
    utils.writeJSONSetFromAttr(characters, 'cultures'),
    utils.writeJSONSetFromAttr(characters, 'titles'),
  ]);

  // extract only the attributes we need for our prediction script and format them accordingly
  let charsFmt = characters
    .map(c => {
      let cb = charactersBook.find(d => d.name === c.name);
      return cb && !c.birth ? { ...c, birth: cb.dateOfBirth } : c;
    })
    .filter(c => !!c.birth && (!c.death || c.death - c.birth >= 0))
    .map(c => ({
      name: c.name,
      male: c.gender === 'male',
      age: (!c.death ? config.GOT_CURRENT_YEAR_SHOW : c.death) - c.birth,
      birth: c.birth,
      death: c.death || undefined,

      numRelatives: utils.countAttrValues(c, ['mother', 'father', 'lovers', 'siblings', 'spouse']),

      allegiances: utils.arrToIndices(c.allegiances, allegiances),
      appearances: utils.arrToIndices(c.appearances, appearances),
      cultures: utils.arrToIndices(c.cultures, cultures),
      titles: utils.arrToIndices(c.titles, titles),
    }))
    .filter(c => c.age <= config.AGE_MAXIMUM);

  // normalize some scalar values
  ['numRelatives'].forEach(a => {
    let max = utils.maxAttr(charsFmt, a);
    charsFmt.forEach(c => (c[a] /= max));
  });

  // alive characters will be predicted later, dead characters are used for training
  const numAlive = (await utils.writeOutputData('ml-data/chars-to-predict', charsFmt.filter(c => c.death === undefined), true)).length;
  const numDead = (await utils.writeOutputData('ml-data/chars-to-train', charsFmt.filter(c => c.death !== undefined), true)).length;

  // extract age information
  const ages = charsFmt.filter(c => c.death !== undefined).map(c => c.death - c.birth);
  const ageAverage = ages.reduce((a, b) => a + b, 0) / ages.length;

  // output some final statistics
  console.log(`characters    : ${charsFmt.length} (${numAlive} alive, ${numDead} dead)`);
  console.log(`birth         : ${utils.minAttr(charsFmt, 'birth')} – ${utils.maxAttr(charsFmt, 'birth')}`);
  console.log(`death         : ${utils.minAttr(charsFmt, 'death')} – ${utils.maxAttr(charsFmt, 'death')}`);
  console.log(`age           : maximum ${Math.max(...ages)}, average ${ageAverage}`);
  console.log('allegiances   :', allegiances.length);
  console.log('appearances   :', appearances.length);
  console.log('cultures      :', cultures.length);
  console.log('titles        :', titles.length);
})();
