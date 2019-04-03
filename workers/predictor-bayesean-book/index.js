'use strict';

const {exec} = require('child_process');
const path = require('path');

function runBookPredictor(callback) {
  exec("python3 predictor.py", {
    "cwd": path.resolve(__dirname)
  }, 
  (error, stdout, stderr) => {
    if(error) {throw error;} 
    console.log(stdout);
    console.log(stderr);
    callback();
  });
}

exports.runBookPredictor = runBookPredictor;

runBookPredictor(() => {console.log("Prediction complete!");});