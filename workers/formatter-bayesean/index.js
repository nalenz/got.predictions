const utils = require('../common/utils');
const config = require('../common/config');
const fs = require('fs');
const CURRENT_YEAR = 304;

/*
This file will scan the book characters and re-format some of their data.
It transforms, for example, the house the character belongs to into a set of flags, 
where for each house, a 1 or a 0 determines whether this character belongs to this house.
Same goes for culture, locations this character has been, etc.
We use integers (0 or 1) for the flags, because the model at the end will use them like that.
*/

async function reformat_book_chars() {
	//read the needed JSON files
	[characters, houses, cultures] = await Promise.all([utils.loadBookData('characters'), utils.loadBookData('houses'), utils.loadBookData('cultures')]);
	//in reformatted_chars, we will accumulate the reformatted character data
	let reformatted_chars = [];
	//Now, for every character, generate the reformatted character and add it to the array
	for(let ch of characters) {
		let ref_ch = {}; //this will be the reformatted character
		//copy data that is to stay the same
		ref_ch.name = ch.name;
		ref_ch.pageRank = ch.pageRank;
		ref_ch.male = ch.male;
		//now check whether character alive or not and estimate age
		if(ch.dateOfBirth != undefined) {
			if(ch.dateOfDeath != undefined) {
				//there is a date of death => is dead
				ref_ch.isDead = 1;
				ref_ch.age = ch.dateOfDeath-ch.dateOfBirth;
			}
			else {
				//there is no date of death => lives on to the CURRENT_YEAR
				ref_ch.isDead = 0;
				ref_ch.age = CURRENT_YEAR-ch.dateOfBirth;
			}
		}
		else {
			//filter out characters without a date of birth
			continue;
		}
		//for each house, add a flag = 0 or 1, whether the character is in that house or not
		for(let h of houses) {
			if(ch.house == h.name) { //character IS in this house
				ref_ch[h.name] = 1;
			}
			else { //character is NOT in this house
				ref_ch[h.name] = 0;
			}
		}
		//similarly, add flags for culture
		for(let c of cultures) {
			if(ch.culture == c.name) {
				ref_ch[c.name] = 1;
			}
			else {
				ref_ch[c.name] = 0;
			}
		}
		//TODO add flags for some common titles (Ser, Prince, Lord, etc.)
		//TODO add flags for locations where a character has been
		//TODO consider relations between people (heirs) and houses (overlords)
		//push the reformatted character and loop back
		reformatted_chars.push(ref_ch);
	}
	//output ready
	//TODO file output is just for the prototype. Consider how to integrate.
	fs.writeFile('ref_chs.json', JSON.stringify(reformatted_chars), function(err){});
}

reformat_book_chars();