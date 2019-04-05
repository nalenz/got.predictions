/*
  This file will scan the book characters and re-format some of their data.
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

const outfile = path.resolve(__dirname, "training_book_characters.json");

const LOCATION_VISITED_THRESHOLD = 50; //min. amount of people need to visit a location before it's used
const HOUSE_THRESHOLD = 10; //min. amount of people in this house before it's used
const CULTURES_THRESHOLD = 10; //min. amount of people with this culture before it's used
const AGE_THRESHOLD = 100; //alive characters above this age are considered to be errors

/*************************************************************************************************/
//COLLECTOR FUNCTIONS (will collect data from the data-mined model)

function isAlive(character) {
  return character.alive;
}

function isSuitableChar(character) {
  if(character.alive == undefined || character.alive == null) {
    return false;
  } else if(character.alive == false && (character.death == null || character.death == undefined)) {
    return false;
  } else if(character.birth == undefined || character.birth == null) {
    return false; // character's date of birth is missing
  } else if (character.alive && config.GOT_CURRENT_YEAR_BOOK - character.birth > AGE_THRESHOLD) {
    return false; // character has no date of death, but is apparently over AGE_THRESHOLD years old
  } else if(character.death < character.birth) {
    return false;
  }
  return true;
}

function filterChars(unfilteredChars) {
  let characters = [];
  for(let ch of unfilteredChars) {
    if(isSuitableChar(ch)) {
      characters.push(ch);
    }
  }
  return characters;
}

function collectLocations(charLocations, filteredChars, locMap) {
  let locations_all = []; //all locations we might have flags for
  for (let c_l of charLocations) {
    // now check if any new locations will come to the locations array
    for (let loc of c_l.locations) {
      if (locations_all.includes (loc) == false) {
        //new location is not contained in the array, add it
        locations_all.push(loc);
      }
    }
  }
  
  // now, filter locations that have had at least LOCATION_VISITED_THRESHOLD
  // or more suitable characters visit them
  let locations = [];
  for(let l of locations_all) {
    loc_counter = 0;
    for(let c of filteredChars) {
      visited = locMap.get(c.name);
      if(visited != undefined && visited.includes(l)) {
        loc_counter += 1;
      }
    }
    if(loc_counter >= LOCATION_VISITED_THRESHOLD) {
      locations.push(l);
    }
  }
  
  return locations;
}

function genLocationMap(charLocations) {
  let locKeyValuePairs = []; //map character name => array of visited locations
  for (let c_l of charLocations) {
	// push the name + location array of the character into locKeyValuePairs
	locKeyValuePairs.push([c_l.name, c_l.locations]);
  }
  //build the Map from the key-value pair array
  let locMap = new Map(locKeyValuePairs);
  return locMap;
}

function collectHouses(unfilteredHouses, filteredChars) {
  // only consider houses with at least HOUSE_THRESHOLD suitable characters in them
  let houses = [];
  for(let h of unfilteredHouses) {
    let house_counter = 0;
    for(let ch of filteredChars) {
      if(ch.house == h.name) {
        house_counter += 1;
      }
	  }
	  if(house_counter >= HOUSE_THRESHOLD) {
        houses.push(h);
	  }
  }
  
  return houses;
}

function collectCultures(unfilteredCultures, filteredChars) {
  // only consider cultures with at least CULTURES_THRESHOLD suitable characters in them
  let cultures = [];
  for(let c of unfilteredCultures) {
    let culture_counter = 0;
    for(let ch of filteredChars) {
      if(ch.culture == c.name) {
        culture_counter += 1;
      }
    }
    if(culture_counter >= CULTURES_THRESHOLD) {
        cultures.push(c);
    }
  }
  
  return cultures;
}

function getMaxRank(characters) {
  //max pageRank from all characters
  let max = 0;
  for(let ch of characters) {
  if(ch.pageRank != null && ch.pagerank != undefined && ch.pageRank.rank > max) {
      max = ch.pageRank.rank;
    }
  }
  return max;
}

/*************************************************************************************************/
//FORMATTER FUNCTIONS (will use the collected data to add flags to a reformatted character model)
//They do this as a side effect and do not return anything.

function processAge(srcChar, destChar) {
  // check whether character alive or not and calculate age
  if (!isAlive(srcChar)) {
    // there is a date of death => is dead
    destChar.isDead = 1;
    destChar.age = srcChar.death - srcChar.birth;
  } else {
    // lives on to the CURRENT_YEAR
    destChar.isDead = 0;
    destChar.age = config.GOT_CURRENT_YEAR_BOOK - srcChar.birth;
  }
}

function processGender(srcChar, destChar) {
  // "male" flag = 1 if male
  if (srcChar.gender !== undefined && srcChar.gender !== null) {
    if (srcChar.gender == "male") {
      destChar.male = 1;
    }
    else {
      destChar.male = 0;
    }
  }
  else { //No gender?
    destChar.male = 0;
  }
}

function processHouses(srcChar, destChar, houses) {
  // for each suitable house, add a flag = 1 if the character is in that house
  for (let h of houses) {
    if (h.name == null || h.name == undefined) continue;
    if (srcChar.house === h.name) {
      // character IS in this house
      destChar[h.name] = 1;
    } else {
      // character is NOT in this house
      destChar[h.name] = 0;
    }
  }
  
  // also set the house flag to = 1 if the character has pledged allegiance to it
  if (srcChar.allegiance !== null && srcChar.allegiance !== undefined) {
    for (let h of srcChar.allegiance) {
      if (destChar[h] == 0 || destChar[h] == 1) {
        destChar[h] = 1;
      }
    }
  }
}

function processCultures(srcChar, destChar, cultures) {
  //add flags for culture of the character
  for (let c of cultures) {
    if (srcChar.culture === c.name) {
      destChar[c.name] = 1;
    } else {
      destChar[c.name] = 0;
    }
  }
}

function processTitles(srcChar, destChar) {
  if(srcChar["titles"] != undefined && srcChar["titles"].length > 0) {
    destChar.hasTitles = 1;
  } else {
    destChar.hasTitles = 0;
  }
}

function processSpouses(srcChar, destChar, characters) {
  // is the character married?
  // TODO cover the case where somebody else has srcChar as a spouse, but not vice versa
  if (srcChar["spouse"] != undefined && srcChar["spouse"] != null && srcChar["spouse"].length > 0) {
    destChar.isMarried = 1;
    //destChar.hasDeadSpouse = 0;
    //determine whether character has a dead spouse
    /*if(Array.isArray(srcChar["spouse"])) {
      //multiple spouses
      for(let ch of characters) {
        if(srcChar["spouse"].includes(ch.name)) {
          if(!isAlive(ch)) {
            //found a dead spouse
            destChar.hasDeadSpouse = 1;
            break;
          }
        }
      }
    } else {
      //spouse is not an array, so only one spouse
      for(let ch of characters) {
        if(ch.name == srcChar["spouse"]) {
          if(!isAlive(ch)) {
            //the spouse is dead
            destChar.hasDeadSpouse = 1;
            break;
          }
        }
      }
    }*/
  } else { //no spouses
    destChar.isMarried = 0;
    //destChar.hasDeadSpouse = 0;
  }
}

function processLocations(srcChar, destChar, locations, locMap) {
  // add flags for locations where a character has been
  // first, add zeroes for all locations
  for (let loc of locations) {
    destChar[loc] = 0;
  }
  // then, write 1 on the locations the character has visited
  let visited = locMap.get(srcChar.name); // get locations from the Map we built earlier
  if (visited !== null && visited !== undefined) {
    // set the flag to 1 for all locations in the visited array
    for (let loc of visited) {
  	  if(locations.includes(loc)) {
        destChar[loc] = 1;
  	  }
    }
  }
}

function processParents(srcChar, destChar, characters) {
  //first: Is srcChar somebody's parent?
  destChar.hasChildren = 0;
  if(srcChar.children != null && srcChar.children != undefined && srcChar.children.length > 0) {
    destChar.hasChildren = 1;
  }
}

function processHeir(srcChar, destChar, characters) {
  //is srcChar somebody's heir?
  destChar.isHeir = 0;
  for(let ch of characters) {
    if(ch.heir == srcChar.name) {
      destChar.isHeir = 1;
      break;
    }
  }
}

function processRank(srcChar, destChar, maxRank) {
  if(srcChar.pageRank != null && srcChar.pageRank != undefined && srcChar.pageRank.rank > (0.34 * maxRank)) { //this check is similar to the 2016 project
    destChar.isMajor = 1;
  } else {
    destChar.isMajor = 0;
  }
}

/*************************************************************************************************/

async function genTrainingData (callback) {
  // read the needed JSON files
  let [characters_unfiltered, houses_unfiltered, cultures_unfiltered, character_locations] = await Promise.all([
    utils.loadBookData('characters'),
    utils.loadBookData('houses'),
    utils.loadBookData('cultures'),
    utils.loadBookData('characterLocations'),
  ]);
  
  let characters = filterChars(characters_unfiltered); // filter out unsuitable characters
  //let locMap = genLocationMap(character_locations); // generate a character-to-locations map
  //let locations = collectLocations(character_locations, characters, locMap); // collect locations and filter them
  let houses = collectHouses(houses_unfiltered, characters); // collect houses and filter them
  let cultures = collectCultures(cultures_unfiltered, characters); // collect cultures and filter them
  let maxRank = getMaxRank(characters); //max pageRank can determine who is a major character
  
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
	  processSpouses(ch, ref_ch, characters_unfiltered); // process spouses data
	  //processLocations(ch, ref_ch, locations, locMap); // process location data
    processParents(ch, ref_ch, characters_unfiltered);
    processHeir(ch, ref_ch, characters_unfiltered);
    //processRank(ch, ref_ch, maxRank);
    //TODO books the character was in
    //TODO consider dead parents/heirs/spouses somehow
	  
    // push the reformatted character and move on to the next one
    training_chars.push(ref_ch);
  }

  // output ready
  // Wanted some more readable JSON here :)
  let readableJSON = JSON.stringify(training_chars, null, 2);
  fs.writeFile(outfile, readableJSON, (err) => {
    if(err) throw err;
    //signal async completion
    callback();
  });
}

exports.formatBookData = genTrainingData;

//call the function
genTrainingData(() => {console.log("Formatting book characters complete!");});