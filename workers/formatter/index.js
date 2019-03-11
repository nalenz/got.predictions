const utils = require('./utils');
const config = require('./config');

(async () => {
  const [characters, characterLocations, houses] = await Promise.all([
    utils.loadBookData('characters'),
    utils.loadBookData('character_locations'),
    utils.loadBookData('houses'),
  ]);

  // get maximum page rank and other uniquified attributes
  const maxPageRank = utils.maxAttr(characters, 'pageRank');
  const [books, locations, titles] = await Promise.all([
    utils.writeJSONSetFromAttr(characters, 'books'),
    utils.writeJSONSetFromAttr(characterLocations, 'locations'),
    utils.writeJSONSetFromAttr(characters, 'titles'),
  ]);

  // extract only the attributes we need for our prediction script and format them accordingly
  let charsFmt = characters
    .filter(c => c.dateOfBirth !== undefined && (c.dateOfDeath === undefined || c.dateOfDeath - c.dateOfBirth >= 0))
    .map(c => ({
      name: c.name,
      age: (c.dateOfDeath === undefined ? config.GOT_CURRENT_YEAR : c.dateOfDeath) - c.dateOfBirth,
      books: utils.arrToIndices(c.books, books),
      dateOfBirth: c.dateOfBirth,
      dateOfDeath: c.dateOfDeath,
      house: houses.findIndex(h => h.name === c.house),
      locations: utils.arrToIndices((characterLocations.find(cl => cl.name === c.name) || {}).locations, locations),
      male: c.male,
      pageRank: (c.pageRank || 0) / maxPageRank,
      titles: utils.arrToIndices(c.titles, titles),
    }))
    .filter(c => c.age <= config.AGE_MAXIMUM);

  // alive characters will be predicted later, dead characters are used for training
  const numAlive = (await utils.writeOutputData('ml-data/chars-to-predict', charsFmt.filter(c => c.dateOfDeath === undefined))).length;
  const numDead = (await utils.writeOutputData('ml-data/chars-to-train', charsFmt.filter(c => c.dateOfDeath !== undefined))).length;

  // extract age information
  const ages = charsFmt.filter(c => c.dateOfDeath !== undefined).map(c => c.dateOfDeath - c.dateOfBirth);
  const ageAverage = ages.reduce((a, b) => a + b, 0) / ages.length;

  // output some final statistics
  console.log(`characters    : ${charsFmt.length} (${numAlive} alive, ${numDead} dead)`);
  console.log('books         :', books.length);
  console.log('locations     :', locations.length);
  console.log('titles        :', titles.length);
  console.log('houses        :', houses.length);
  console.log(`date of birth : ${utils.minAttr(charsFmt, 'dateOfBirth')} – ${utils.maxAttr(charsFmt, 'dateOfBirth')}`);
  console.log(`date of death : ${utils.minAttr(charsFmt, 'dateOfDeath')} – ${utils.maxAttr(charsFmt, 'dateOfDeath')}`);
  console.log(`age           : maximum ${Math.max(...ages)}, average ${ageAverage}`);
})();
