'use scrict';

const {formatBookData} = require('../formatter-bayesean-book/index.js'); //(outfile, callback)
const {formatShowData} = require('../formatter-bayesean-show/index.js'); //(outfile, callback)
const {runBookPredictor} = require('../predictor-bayesean-book/runPredictor.js'); //(infile, outfile, callback)
const {runShowPredictor} = require('../predictor-bayesean-show/runPredictor.js'); //(infile, outfile, callback)
const {reformatBookOutput} = require('../predictor-bayesean-book/processOutput.js'); //(infile, outfile, callback)
const {reformatShowOutput} = require('../predictor-bayesean-show/processOutput.js'); //(infile, outfile, callback)

