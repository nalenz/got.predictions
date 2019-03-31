'use strict'

const fs = require('fs');

function logStats(predictionObject) {
  let characters = predictionObject.characters;
  let deadChars = characters.filter(c => c.alive == false);
  let aliveChars = characters.filter(c => c.alive);
  
  let numDead = deadChars.length;
  //TODO
}

function writeBackNoDead(predictionObject) {
  //onlyAlive will store alive, filtered characters
  let onlyAlive = {};
  onlyAlive.attributes = predictionObject.attributes;
  onlyAlive.betaExp = predictionObject.betaExp;
  onlyAlive.characters = [];
  
  for(let c of predictionObject.characters) {
    if(c.alive == false) continue;
    
    let newChar = {};
    newChar.name = c.name;
    newChar.age = c.age;
    newChar.predictedSurvivalAge = c.predictedSurvivalAge;
    newChar.confIntervalLower = c.confIntervalLower;
    newChar.confIntervalHigher = c.confIntervalHigher;
    newChar.confIntervalConfidence = c.confIntervalConfidence;
    newChar.survivalFunctionMean = c.survivalFunctionMean;
    
    onlyAlive.characters.push(newChar);
  }
  
  //onlyAlive is now ready, write it to a JSON
  //transformer function will reduce precision, since it's not really needed
  let json = JSON.stringify(onlyAlive, function(key, val) {
    if(val.toPrecision) return +val.toPrecision(3);
    else return val;
  });
  
  fs.writeFile('processedOutput.json', json, function(err) {
    if(err) throw err;
    console.log('Conversion complete!');
  });
}

fs.readFile('predictorOutput.json', function (err, data) {
  if(err) throw err;
  let predictionObject = JSON.parse(data);
  logStats(predictionObject);
  writeBackNoDead(predictionObject);
});