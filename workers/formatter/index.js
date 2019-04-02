const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  const [characters, characterLocations, allHouses] = await Promise.all([
    utils.loadBookData('characters'),
    utils.loadBookData('characterLocations'),
    utils.loadBookData('houses'),
  ]);

  // get maximum page rank and other uniquified attributes
  const [allegiances, books, cultures, houses, locations, regions, titles] = await Promise.all([
    utils.writeJSONSetFromAttr(characters, 'allegiance'),
    utils.writeJSONSetFromAttr(characters, 'books'),
    utils.writeJSONSetFromAttr(characters, 'culture'),
    utils.writeJSONSetFromAttr(characters, 'house'),
    utils.writeJSONSetFromAttr(characterLocations, 'locations'),
    utils.writeJSONSetFromAttr(allHouses, 'region'),
    utils.writeJSONSetFromAttr(characters, 'titles'),
  ]);

  // extract only the attributes we need for our prediction script and format them accordingly
  let charsFmt = characters
    .filter(c => c.birth !== undefined && (c.death === undefined || c.death - c.birth >= 0))
    .map(c => ({
      name: c.name,
      male: c.male || false,
      birth: c.birth,
      death: c.death,
      age: (c.death === undefined ? config.GOT_CURRENT_YEAR : c.death) - c.birth,

      pageRank: c.pagerank && c.pagerank.rank ? c.pagerank.rank : 0,
      numRelatives: utils.countAttrValues(c, ['children', 'father', 'mother', 'spouse']),

      allegiances: utils.arrToIndices(c.allegiances, allegiances),
      books: utils.arrToIndices(c.books, books),
      culture: cultures.findIndex(cu => cu === utils.sanitizeString(c.culture)),
      house: houses.findIndex(h => h === utils.sanitizeString(c.house)),
      locations: utils.arrToIndices((characterLocations.find(cl => cl.name === c.name) || {}).locations, locations),
      titles: utils.arrToIndices(c.titles, titles),

      houseRegion: (() => {
        let houseRegion = utils.sanitizeString((allHouses.find(h => utils.sanitizedCmp(h.name, c.house)) || {}).region);
        return regions.findIndex(r => r === houseRegion);
      })(),
    }))
    .filter(c => c.age <= config.AGE_MAXIMUM);

  // normalize some scalar values
  ['numRelatives', 'pageRank'].forEach(a => {
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
  console.log('allegiances   :', allegiances.length);
  console.log('books         :', books.length);
  console.log('cultures      :', cultures.length);
  console.log('houses        :', houses.length);
  console.log('locations     :', locations.length);
  console.log('regions       :', regions.length);
  console.log('titles        :', titles.length);
  console.log(`date of birth : ${utils.minAttr(charsFmt, 'birth')} – ${utils.maxAttr(charsFmt, 'birth')}`);
  console.log(`date of death : ${utils.minAttr(charsFmt, 'death')} – ${utils.maxAttr(charsFmt, 'death')}`);
  console.log(`age           : maximum ${Math.max(...ages)}, average ${ageAverage}`);
})();
