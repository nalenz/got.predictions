const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  const [characters, charactersBook, bastards, battles] = await Promise.all([
    utils.loadShowData('characters'),
    utils.loadBookData('characters'),
    utils.loadShowData('bastards'),
    utils.loadShowData('battles'),
  ]);

  // get maximum page rank and other uniquified attributes
  const [allegiances, appearances, cultures, titles] = await Promise.all([
    utils.writeJSONSetFromAttr(characters, 'allegiances'),
    utils.writeJSONSetFromAttr(characters, 'appearances'),
    utils.writeJSONSetFromAttr(characters, 'cultures'),
    utils.writeJSONSetFromAttr(characters, 'titles'),
  ]);

  // extract only the attributes we need for our prediction script and format them accordingly
  const battleCommanders = [].concat(...battles.map(b => [...b.commandersOne, ...b.commandersTwo]));
  let charsFmt = characters
    .map(c => {
      // two methods to determine birth year if it's missing: 1. using the "age" attribute, 2. fallback to book data
      if (!c.birth) {
        if (c.age) c.birth = (c.death || config.GOT_CURRENT_YEAR_SHOW) - c.age.age;
        else {
          let cb = charactersBook.find(d => d.name === c.name);
          if (cb) c.birth = cb.birth;
        }
      }

      // delete invalid birth years that are in the future
      if (c.birth > config.GOT_CURRENT_YEAR_SHOW) delete c.birth;
      return c;
    })
    .filter(c => !!c.birth && (!c.death || c.death - c.birth >= 0))
    .map(c => ({
      name: c.name,
      male: c.gender === 'male',
      age: (!c.death ? config.GOT_CURRENT_YEAR_SHOW : c.death) - c.birth,
      birth: c.birth,
      death: c.death || undefined,

      isBastard: bastards.find(b => b.name === c.name) !== undefined,
      pageRank: c.pagerank && c.pagerank.rank ? c.pagerank.rank : 0,
      numRelatives: utils.countAttrValues(c, ['mother', 'father', 'lovers', 'siblings', 'spouse']),
      numCommandedBattles: battleCommanders.filter(com => com === c.name).length,

      allegiances: utils.arrToIndices(c.allegiances, allegiances),
      appearances: utils.arrToIndices(c.appearances, appearances),
      cultures: utils.arrToIndices(c.cultures, cultures),
      titles: utils.arrToIndices(c.titles, titles),
    }))
    .filter(c => c.age <= config.AGE_MAXIMUM);

  // normalize some scalar values
  ['pageRank', 'numRelatives', 'numCommandedBattles'].forEach(a => {
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
