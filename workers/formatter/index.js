const utils = require('./utils');

(async () => {
  const [characters, characterLocations, cultures, houses] = await Promise.all([
    utils.loadBookData('characters'),
    utils.loadBookData('character_locations'),
    utils.loadBookData('cultures'),
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
    .filter(c => c.dateOfBirth !== undefined)
    .map(c => ({
      name: c.name,
      books: utils.arrToIndices(c.books, books),
      culture: cultures.findIndex(c => c.name === c.culture),
      dateOfBirth: c.dateOfBirth,
      dateOfDeath: c.dateOfDeath,
      house: houses.findIndex(h => h.name === c.house),
      locations: utils.arrToIndices(c.locations, locations),
      male: c.male,
      pageRank: (c.pageRank || 0) / maxPageRank,
      titles: utils.arrToIndices(c.titles, titles),
    }));

  // alive characters will be predicted later, dead characters are used for training
  const numAlive = (await utils.writeOutputData('ml-data/chars-to-predict', charsFmt.filter(c => c.dateOfDeath === undefined))).length;
  const numDead = (await utils.writeOutputData('ml-data/chars-to-train', charsFmt.filter(c => c.dateOfDeath !== undefined))).length;

  // output some final statistics
  console.log(`characters    : ${charsFmt.length} (${numAlive} alive, ${numDead} dead)`);
  console.log('books         :', books.length);
  console.log('locations     :', locations.length);
  console.log('titles        :', titles.length);
  console.log('cultures      :', cultures.length);
  console.log('houses        :', houses.length);
  console.log(`date of birth : ${utils.minAttr(charsFmt, 'dateOfBirth')} – ${utils.maxAttr(charsFmt, 'dateOfBirth')}`);
  console.log(`date of death : ${utils.minAttr(charsFmt, 'dateOfDeath')} – ${utils.maxAttr(charsFmt, 'dateOfDeath')}`);
  console.log('maximum age   :', Math.max(...charsFmt.filter(c => c.dateOfDeath !== undefined).map(c => c.dateOfDeath - c.dateOfBirth)));
})();
