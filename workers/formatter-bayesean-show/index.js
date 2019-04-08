/*
  This file will scan the show characters and re-format some of their data.
  It transforms, for example, the house the character belongs to into a set of flags, 
  where for each house, a 1 or a 0 determines whether this character belongs to this house.
  Same goes for culture, locations this character has been, etc.
  We use integers (0 or 1) for the flags, because the model at the end will use them like that.
*/
/*************************************************************************************************/
//CONSTANTS

const utils = require('../common/utils');
const config = require('../common/config');
const fs = require('fs-extra');
const path = require('path');

const outfile = path.resolve(__dirname, 'training_show_characters.json');

//const LOCATION_VISITED_THRESHOLD = 50; //min. amount of people need to visit a location before it's used
const HOUSE_THRESHOLD = 5; //min. amount of people in this house before it's used
const CULTURES_THRESHOLD = 10; //min. amount of people with this culture before it's used

/*************************************************************************************************/
// COLLECTOR FUNCTIONS (will collect data from the data-mined model)

function isSuitableChar(character) {
  if (character.alive === undefined || character.alive === null) {
    return false;
  } else if ((character.death === null || character.death === undefined) && character.alive === false) {
    return false; // character is dead, but has no date of death
  } else if (character.death > config.GOT_SHOW_BEGIN + 6) {
    return false; // character apparently died after season 7?
  }
  return true;
}

function filterChars(unfilteredChars) {
  let characters = [];
  for (let ch of unfilteredChars) {
    if (isSuitableChar(ch)) {
      characters.push(ch);
    }
  }
  return characters;
}

function collectHouses(filteredChars) {
  // first, collect all the houses from the characters' tags
  let unfilteredHouses = [];
  for (let ch of filteredChars) {
    for (let h of ch.allegiances) {
      if (h !== undefined && h !== null && !unfilteredHouses.includes(h)) {
        unfilteredHouses.push(h);
      }
    }
  }

  // only consider houses with at least HOUSE_THRESHOLD suitable characters in them
  let houses = [];
  for (let h of unfilteredHouses) {
    let house_counter = 0;
    for (let ch of filteredChars) {
      if (ch.allegiances.includes(h)) {
        house_counter += 1;
      }
    }
    if (house_counter >= HOUSE_THRESHOLD && h.includes('House')) {
      // why is the Night's Watch considered a house anyway?
      houses.push(h);
    }
  }

  return houses;
}

function collectCultures(filteredChars) {
  // collect all cultures from the character data
  let unfilteredCultures = [];
  for (let ch of filteredChars) {
    if (ch.cultures === undefined || ch.cultures === null) {
      continue;
    }
    for (let cult of ch.cultures) {
      if (!unfilteredCultures.includes(cult)) {
        unfilteredCultures.push(cult);
      }
    }
  }

  // only consider cultures with at least CULTURES_THRESHOLD suitable characters in them
  let cultures = [];
  for (let c of unfilteredCultures) {
    let culture_counter = 0;
    for (let ch of filteredChars) {
      if (ch.culture === c) {
        culture_counter += 1;
      }
    }
    if (culture_counter >= CULTURES_THRESHOLD) {
      cultures.push(c);
    }
  }

  return cultures;
}

function getMaxPagerank(characters) {
  let max_rank = 0;
  for (let ch of characters) {
    if (ch.pagerank !== null && ch.pagerank !== undefined && ch.pagerank.rank > max_rank) {
      max_rank = ch.pagerank.rank;
    }
  }
  return max_rank;
}

/*************************************************************************************************/
// FORMATTER FUNCTIONS (will use the collected data to add flags to a reformatted character model)
// They do this as a side effect and do not return anything.

function processAge(srcChar, destChar) {
  // use absolute time, since birth dates are generally unavailable
  // check whether character alive or not and calculate "age", i.e. how long in the show they lived
  destChar.isDead = !srcChar.alive ? 1 : 0;

  if (!srcChar.alive) {
    // dead
    destChar.livedTo = srcChar.death - config.GOT_SHOW_BEGIN;
  } else {
    // alive => lives on to the CURRENT_YEAR
    destChar.livedTo = config.GOT_CURRENT_YEAR_SHOW - config.GOT_SHOW_BEGIN;
  }
}

function processGender(srcChar, destChar) {
  // "male" flag = 1 if male
  if (srcChar.gender !== undefined && srcChar.gender !== null) {
    if (srcChar.gender === 'male') {
      destChar.male = 1;
    } else {
      destChar.male = 0;
    }
  } else {
    //No gender?
    destChar.male = 0;
  }
}

function processHouses(srcChar, destChar, houses) {
  // for each suitable house, add a flag = 1 if the character is in that house
  // let numHouses = 0;

  for (let h of houses) {
    if (srcChar.house === h) {
      // character IS in this house
      // numHouses += 1;
      destChar[h] = 1;
    } else {
      // character is NOT in this house
      destChar[h] = 0;
    }
  }

  // also set the house flag to = 1 if the character has pledged allegiance to it
  if (srcChar.allegiances !== null && srcChar.allegiances !== undefined) {
    for (let h of srcChar.allegiances) {
      if (houses.includes(h)) {
        /*if (destChar[h] === 0) {
          numHouses += 1;
        }*/
        destChar[h] = 1;
      }
    }
  }

  //destChar["multipleHouses"] = numHouses > 1 ? 1 : 0; // allegiance to multiple houses indicates changing allegiances. Weak predictor.
}

function processCultures(srcChar, destChar, cultures) {
  //add flags for culture of the character
  for (let c of cultures) {
    if (srcChar.culture === c) {
      destChar[c] = 1;
    } else {
      destChar[c] = 0;
    }
  }
}

function processTitles(srcChar, destChar) {
  if (srcChar['titles'] !== undefined && srcChar['titles'].length !== undefined) {
    destChar.hasTitles = srcChar['titles'].length > 0 ? 1 : 0;
  } else {
    destChar.hasTitles = 0;
  }
}

function processSpouses(srcChar, destChar) {
  // whether the character is married
  if (srcChar['spouse'] !== undefined && srcChar['spouse'].length !== undefined) {
    destChar.isMarried = 1;
  } else {
    destChar.isMarried = 0;
  }
}

function processLovers(srcChar, destChar) {
  if (srcChar['lovers'] !== undefined && srcChar['lovers'] !== null && srcChar['lovers'].length > 0) {
    destChar.hasLovers = 1;
  } else {
    destChar.hasLovers = 0;
  }
}

function processSiblings(srcChar, destChar) {
  if (srcChar['siblings'] !== undefined && srcChar['siblings'] !== null && srcChar['siblings'].length > 0) {
    destChar.hasSiblings = 1;
  } else {
    destChar.hasSiblings = 0;
  }
}

function processParent(srcChar, destChar, characters) {
  destChar.isParent = 0;
  for (let ch of characters) {
    if (ch.name === srcChar['mother'] || ch.name === srcChar['mother']) {
      destChar.isParent = 1;
    }
  }
}

function processPagerank(srcChar, destChar, maxRank) {
  if (srcChar.pagerank != null && srcChar.pagerank !== undefined && srcChar.pagerank.rank >= 0.34 * maxRank) {
    destChar.isMajor = 1;
  } else {
    destChar.isMajor = 0;
  }
}

function processDeadRelations(srcChar, destChar, unfilteredChars) {
  destChar.hasDeadSiblings = 0;
  destChar.isMotherDead = 0;
  destChar.isFatherDead = 0;
  destChar.isSpouseDead = 0;
  destChar.hasDeadLovers = 0;
  // destChar.hasDeadChild = 0; // TODO do this

  // siblings
  if (srcChar.siblings !== undefined && srcChar.siblings !== null) {
    outloop_siblings: for (let sibling of srcChar.siblings) {
      for (let ch of unfilteredChars) {
        if (ch.name === sibling && ch.alive === false) {
          destChar.hasDeadSiblings = 1;
          break outloop_siblings;
        }
      }
    }
  }

  // father
  if (srcChar.father !== undefined && srcChar.father !== null) {
    for (let ch of unfilteredChars) {
      if (ch.name === srcChar.father && ch.alive === false) {
        destChar.isFatherDead = 1;
        break;
      }
    }
  }

  // mother
  if (srcChar.mother !== undefined && srcChar.mother !== null) {
    for (let ch of unfilteredChars) {
      if (ch.name === srcChar.mother && ch.alive === false) {
        destChar.isMotherDead = 1;
        break;
      }
    }
  }

  // spouse
  if (srcChar.spouse !== undefined && srcChar.spouse !== null) {
    for (let ch of unfilteredChars) {
      if (ch.name === srcChar.spouse && ch.alive === false) {
        destChar.isSpouseDead = 1;
        break;
      }
    }
  }

  // lovers
  if (srcChar.lovers !== undefined && srcChar.lovers !== null) {
    outloop_lovers: for (let lover of srcChar.lovers) {
      for (let ch of unfilteredChars) {
        if (ch.name === lover && ch.alive === false) {
          destChar.hasDeadLovers = 1;
          break outloop_lovers;
        }
      }
    }
  }
}

function processBastards(srcChar, destChar, bastards) {
  destChar.isBastard = 0;
  for (let b of bastards) {
    if (b.name === srcChar.name) {
      destChar.isBastard = 1;
      break;
    }
  }
}

/*************************************************************************************************/

async function genTrainingData(callback) {
  // read the needed JSON files
  let [characters_unfiltered, bastards] = await Promise.all([utils.loadShowData('characters'), utils.loadShowData('bastards')]);

  let characters = filterChars(characters_unfiltered); // filter out unsuitable characters
  let houses = collectHouses(characters); // collect houses and filter them
  let cultures = collectCultures(characters); // collect cultures and filter them
  let maxRank = getMaxPagerank(characters);

  // in training_chars, we will accumulate the character data used for training
  let training_chars = [];

  // now, for every character, generate the reformatted character and add it to the array
  for (let ch of characters) {
    // this will be the reformatted character
    let ref_ch = {};

    ref_ch.name = ch.name; // copy the name
    processAge(ch, ref_ch); // process age-related data
    processGender(ch, ref_ch); // process gender data
    processHouses(ch, ref_ch, houses); // process house data
    processCultures(ch, ref_ch, cultures); // process culture data
    processTitles(ch, ref_ch); // process titles data
    processSpouses(ch, ref_ch); // process spouses data
    processLovers(ch, ref_ch);
    // processSiblings(ch, ref_ch); //not influential
    // processParent(ch, ref_ch, characters); //not influential
    processPagerank(ch, ref_ch, maxRank);
    processDeadRelations(ch, ref_ch, characters_unfiltered);
    processBastards(ch, ref_ch, bastards);

    // push the reformatted character and move on to the next one
    training_chars.push(ref_ch);
  }

  // output ready
  // Wanted some more readable JSON here :)
  let readableJSON = JSON.stringify(training_chars, null, 2);
  fs.writeFile(outfile, readableJSON, err => {
    if (err) throw err;
    callback();
  });
}

exports.formatShowData = genTrainingData;

// call the function
genTrainingData(() => {
  console.log('Formatting show characters complete!');
});
