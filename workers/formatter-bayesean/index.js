const utils = require('../common/utils');
const config = require('../common/config');
const fs = require('fs-extra');

/*
  This file will scan the book characters and re-format some of their data.
  It transforms, for example, the house the character belongs to into a set of flags, 
  where for each house, a 1 or a 0 determines whether this character belongs to this house.
  Same goes for culture, locations this character has been, etc.
  We use integers (0 or 1) for the flags, because the model at the end will use them like that.
*/

function isSuitableChar(character) {
  if(character.dateOfBirth == undefined || character.dateOfBirth == null) {
    return false;
  }
  return true;
}

(async () => {
  // read the needed JSON files
  let [characters_unfiltered, houses_unfiltered, cultures, character_locations] = await Promise.all([
    utils.loadBookData('characters'),
    utils.loadBookData('houses'),
    utils.loadBookData('cultures'),
	utils.loadBookData('character_locations'),
  ]);
  
  // make a list of all possible locations and create a map by character name of visited locations
  let locations = []; //all locations we'll have flags for
  let locKeyValuePairs = []; //map character name => array of visited locations
  for (let c_l of character_locations) {
	// push the name + location array of the character into locKeyValuePairs
	locKeyValuePairs.push([c_l.name, c_l.locations]);
	// now check if any new locations will come to the locations array
	for (let loc of c_l.locations) {
	  if (locations.includes (loc) == false) {
		//new location is not contained in the array, add it
		locations.push(loc);
	  }
	}
  }
  //build the Map from the key-value pair array
  let locMap = new Map(locKeyValuePairs);
  
  // filter out unsuitable characters (no date of birth, etc.)
  characters = [];
  for(let ch of characters_unfiltered) {
    if(isSuitableChar(ch)) {
      characters.push(ch);
	}
  }
  
  // filter out houses to which no suitable character belongs
  let houses = [];
  for(let h of houses_unfiltered) {
    for(let ch of characters) {
      if(ch.house == h.name) {
        houses.push(h);
		continue;
	  }
	}
  }

  // in reformatted_chars, we will accumulate the reformatted character data
  let reformatted_chars = [];

  // now, for every character, generate the reformatted character and add it to the array
  for (let ch of characters) {
    // this will be the reformatted character
    let ref_ch = {};
	
	// check whether character alive or not and calculate age
    if (isSuitableChar(ch)) {
      if (ch.dateOfDeath !== undefined && ch.dateOfDeath !== null) {
        // there is a date of death => is dead
        ref_ch.isDead = 1;
        ref_ch.age = ch.dateOfDeath - ch.dateOfBirth;
      } else {
        // there is no date of death => lives on to the CURRENT_YEAR
        ref_ch.isDead = 0;
        ref_ch.age = config.GOT_CURRENT_YEAR - ch.dateOfBirth;
		if (ref_ch.age > 150) {
		  //an apparent age over 150 points to an error (missing dateOfDeath)
		  continue;
		}
      }
    } else {
      // filter out unsuitable characters
      continue;
    }

    // copy data that is to stay the same
    // ref_ch.name = ch.name; //name only necessary for testing
    ref_ch.pageRank = ch.pageRank;
	// consider the case where the pageRank is missing
	if (ref_ch.pageRank == null || ref_ch.pageRank == undefined) {
	  ref_ch.pageRank = 0;
	}
	// "male" flag = 1 if male
	if (ch.male !== undefined && ch.male !== null) {
	  if (ch.male) {
	    ref_ch.male = 1;
	  }
	  else {
	    ref_ch.male = 0;
	  }
	}
	else { //TODO we might want to filter these out... (no gender)
	  ref_ch.male = 0;
	}

    // for each house, add a flag = 1 if the character is in that house
    for (let h of houses) {
      if (ch.house === h.name) {
        // character IS in this house
        ref_ch[h.name] = 1;
      } else {
        // character is NOT in this house
        ref_ch[h.name] = 0;
      }
    }
	
	//set the house flag to = 1 if the character has pledged allegiance to it
	if (ch.allegiance !== null && ch.allegiance !== undefined) {
	  for (let h of ch.allegiance) {
	    ref_ch[h.name] = 1;
	  }
	}
	
	// isHeir = 1 if the character is some house's heir.
	ref_ch.isHeir = 0;
	for (let h of houses) {
	  if (h.heir == ref_ch.name) {
	    ref_ch.isHeir = 1; //ref_ch is the heir to some house
		break;
	  }
	}

    // similarly, add flags for culture of the character
    for (let c of cultures) {
      if (ch.culture === c.name) {
        ref_ch[c.name] = 1;
      } else {
        ref_ch[c.name] = 0;
      }
    }
	
	// determine number of titles
	if(ch["titles"] != undefined && ch["titles"].length != undefined) {
	  ref_ch.numTitles = ch["titles"].length
	} else {
	  ref_ch.numTitles = 0;
	}
	
	// number of spouses
	if (ch["spouse"] != undefined && ch["spouse"].length != undefined) {
	  if (Array.isArray(ch["spouse"])){
	    ref_ch.numSpouses = ch["spouse"].length
	  }
	  else {
	    ref_ch.numSpouses = 1;
	  }
	} else {
	  ref_ch.numSpouses = 0;
	}
	
	// add flags for locations where a character has been
	// first, add zeroes for all locations
	for (let loc of locations) {
	  ref_ch[loc] = 0;
	}
	// then, write 1 on the locations the character has visited
	let visited = locMap.get(ref_ch.name); // get locations from the Map we built earlier
	if (visited !== null && visited !== undefined) { // this check might be unnecessary
	  // set the flag to 1 for all locations in the visited array
	  for (let loc of visited) {
	    ref_ch[loc] = 1;
	  }
	}
	
    // push the reformatted character and loop back
    reformatted_chars.push(ref_ch);
  }

  // output ready
  // TODO file output is just for the prototype. Consider how to integrate.
  // Wanted some more readable JSON here :)
  let readableJSON = JSON.stringify(reformatted_chars, null, 2);
  fs.writeFile('ref_chs.json', readableJSON, (err) => {});
  //await fs.writeJSON('ref_chs.json', reformatted_chars);
})();
