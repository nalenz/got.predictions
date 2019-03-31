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

const LOCATION_VISITED_THRESHOLD = 50; //min. amount of people need to visit a location before it's used
const HOUSE_THRESHOLD = 10; //min. amount of people in this house before it's used
const CULTURES_THRESHOLD = 10; //min. amount of people with this culture before it's used

/*************************************************************************************************/
//COLLECTOR FUNCTIONS (will collect data from the data-mined model)

function isSuitableChar(character) {
  if(character.alive == undefined || character.alive == null) {
	return false;
  } else if ((character.death == null || character.death == undefined) && character.alive == false) {
    return false; // character is dead, but has no date of death
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
/*
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
*/

function collectHouses(filteredChars) {
  // first, collect all the houses from the characters' tags
  let unfilteredHouses = [];
  for(let ch of filteredChars) {
	for(let h of ch.allegiances) {
	  if(h != undefined && h != null && !(unfilteredHouses.includes(h))) {
	    unfilteredHouses.push(h);
	  }
	}
  }
  
  // only consider houses with at least HOUSE_THRESHOLD suitable characters in them
  let houses = [];
  for(let h of unfilteredHouses) {
    let house_counter = 0;
    for(let ch of filteredChars) {
      if(ch.allegiances.includes(h)) {
        house_counter += 1;
	  }
	}
	if(house_counter >= HOUSE_THRESHOLD) {
      houses.push(h);
	}
  }
  
  return houses;
}

function collectCultures(filteredChars) {
  // collect all cultures from the character data
  let unfilteredCultures = [];
  for(let ch of filteredChars) {
    if(ch.cultures == undefined || ch.cultures == null) {
	  continue;
	}
	for(let cult of ch.cultures) {
	  if(!(unfilteredCultures.includes(cult))) {
	    unfilteredCultures.push(cult);
	  }
	}
  }
  
  // only consider cultures with at least CULTURES_THRESHOLD suitable characters in them
  let cultures = [];
  for(let c of unfilteredCultures) {
    let culture_counter = 0;
    for(let ch of filteredChars) {
      if(ch.culture == c) {
        culture_counter += 1;
	  }
	}
	if(culture_counter >= CULTURES_THRESHOLD) {
      cultures.push(c);
	}
  }
  
  return cultures;
}

/*************************************************************************************************/
//FORMATTER FUNCTIONS (will use the collected data to add flags to a reformatted character model)
//They do this as a side effect and do not return anything.

function processAge(srcChar, destChar) {
  // use absolute time, since birth dates are generally unavailable
  // check whether character alive or not and calculate "age", i.e. how long in the show they lived
  destChar.isDead = !srcChar.alive;
  
  if (!srcChar.alive) {
    // dead
    destChar.age = srcChar.death - config.GOT_SHOW_BEGIN;
  } else {
    // alive => lives on to the CURRENT_YEAR
    destChar.age = config.GOT_CURRENT_YEAR - config.GOT_SHOW_BEGIN;
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
    if (srcChar.house === h) {
      // character IS in this house
      destChar[h] = 1;
    } else {
      // character is NOT in this house
      destChar[h] = 0;
    }
  }
  
  // also set the house flag to = 1 if the character has pledged allegiance to it
  if (srcChar.allegiances !== null && srcChar.allegiances !== undefined) {
	for (let h of srcChar.allegiances) {
	  if(houses.includes(h)) {
	    destChar[h] = 1;
	  }
	}
  }
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

function processTitles(srcChar, destChar) { //TODO most common titles?
  if(srcChar["titles"] != undefined && srcChar["titles"].length != undefined) {
    destChar.hasTitles = srcChar["titles"].length > 0 ? 1 : 0
  } else {
    destChar.hasTitles = 0;
  }
}

function processSpouses(srcChar, destChar) {
  // whether the character is married
  if (srcChar["spouse"] != undefined && srcChar["spouse"].length != undefined) {
    destChar.isMarried = 1;
  } else {
    destChar.isMarried = 0;
  }
}
/*
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
*/
/*************************************************************************************************/

async function genTrainingData (callback) {
  // read the needed JSON files
  let [characters_unfiltered] = await Promise.all([
    utils.loadShowData('characters'),
  ]);
  
  let characters = filterChars(characters_unfiltered); // filter out unsuitable characters
  let houses = collectHouses(characters); // collect houses and filter them
  let cultures = collectCultures(characters); // collect cultures and filter them

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
	
    // push the reformatted character and move on to the next one
    training_chars.push(ref_ch);
  }

  // output ready
  // Wanted some more readable JSON here :)
  let readableJSON = JSON.stringify(training_chars, null, 2);
  fs.writeFile('ref_chs.json', readableJSON, (err) => {});
  
  //call the callback to signal async completion
  callback();
}

//call the function
genTrainingData(function () {console.log("Formatting complete!")});
