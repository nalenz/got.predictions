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
    destChar.livedTo = srcChar.death - config.GOT_SHOW_BEGIN;
  } else {
    // alive => lives on to the CURRENT_YEAR
    destChar.livedTo = config.GOT_CURRENT_YEAR - config.GOT_SHOW_BEGIN;
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

function processTitles(srcChar, destChar) {
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

function processLovers(srcChar, destChar) {
  if(srcChar["lovers"] != undefined && srcChar["lovers"] != null && srcChar["lovers"].length > 0) {
    destChar.hasLovers = 1;
  }
  else {
    destChar.hasLovers = 0;
  }
}

function processSiblings(srcChar, destChar) {
  if(srcChar["siblings"] != undefined && srcChar["siblings"] != null && srcChar["siblings"].length > 0) {
    destChar.hasSiblings = 1;
  }
  else {
    destChar.hasSiblings = 0;
  }
}

function processParent(srcChar, destChar, characters) {
  destChar.isParent = 0;
  for(let ch of characters) {
    if(ch.name == srcChar["mother"] || ch.name == srcChar["mother"]) {
      destChar.isParent = 1;
    }
  }
}

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
    processLovers(ch, ref_ch);
    processSiblings(ch, ref_ch);
    processParent(ch, ref_ch, characters);
	  
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
