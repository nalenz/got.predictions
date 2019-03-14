const utils = require('../common/utils');
//const config = require('../common/config');

(async () => {
  const characters = await utils.loadBookData('characters');
  const houses = utils.createSetFromAttrFunc(characters, c => [c.house]);
  const housesColors = houses.reduce((prev, curr) => ((prev[curr] = `${Math.random()} ${Math.random()} ${Math.random()}`), prev), {});

  const relationships = []
    .concat(
      ...characters.map((c, i) =>
        ['mother', 'father', 'heir', 'spouse'].map(rel => [i, rel, characters.findIndex(d => d.name === c[rel])]),
      ),
    )
    .filter(x => x[0] !== undefined && x[2] !== -1)
    .map(r => `\t${r[0]} -> ${r[2]} [label=${r[1]}];\n`);
  const characterNodes = characters.map(
    (c, i) => `\t${i} [color="${c.house ? housesColors[c.house.toLowerCase()] : 'black'}", label="${c.name}"]\n`,
  );

  console.log('digraph gotcharacters\n{\n' + characterNodes.join('') + relationships.join('') + '}');
})();
