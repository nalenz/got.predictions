'use strict';

const fs = require('fs');
const path = require('path');

const outfile = path.resolve(__dirname, 'book_predictions.json');
const infile = path.resolve(__dirname, '../predictors-bayesian/predictor-bayesean-book/book_predictor_output.json');

function reformatOutput(predictionObject, callback) {
  //onlyAlive will store alive, filtered characters
  let onlyAlive = {};
  onlyAlive.attributes = predictionObject.attributes;
  onlyAlive.meanBetaExp = predictionObject.meanBetaExp;
  onlyAlive.characters = {};

  for (let c of predictionObject.characters) {
    if (c.alive === false) continue;

    let newChar = {};
    newChar.age = c.age;
    //newChar.predictedSurvivalAge = c.predictedSurvivalAge;
    //newChar.confIntervalLower = c.confIntervalLower;
    //newChar.confIntervalHigher = c.confIntervalHigher;
    //newChar.confIntervalConfidence = c.confIntervalConfidence;
    newChar.survivalFunctionMean = c.survivalFunctionMean;

    onlyAlive.characters[c.name] = newChar;
  }

  //onlyAlive is now ready, write it to a JSON
  //transformer function will reduce precision, since it's not really needed
  let json = JSON.stringify(
    onlyAlive,
    function(key, val) {
      if (val.toPrecision) return +val.toPrecision(3);
      else return val;
    },
    2,
  );

  fs.writeFile(outfile, json, function(err) {
    //'../outputs-bayesean/processedOutputBook.json'
    if (err) throw err;
    callback();
  });
}

function reformat(callback) {
  fs.readFile(infile, function(err, data) {
    if (err) throw err;
    let predictionObject = JSON.parse(data);
    reformatOutput(predictionObject, callback);
  });
}

exports.reformatBookOutput = reformat;

reformat(() => {
  console.log('Postprocessing book predictions complete!');
});
