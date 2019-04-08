const utils = require('../common/utils');
const config = require('../common/config');

async function updatePredictions(callback) {
  let [bookPred, showPred, characters] = await Promise.all([
    utils.loadBayeseanPredictionsBook(),
    utils.loadBayeseanPredictionsShow(),
    utils.loadBookData('characters'),
  ]);
  const updater = await new utils.APIUpdater().init();

  // book coefficients
  let bookAttrs = bookPred.attributes;
  let bookMeanBetaExp = bookPred.meanBetaExp;
  let bookCoefficients = {};
  for (let i = 0; i < bookAttrs.length; i++) {
    bookCoefficients[bookAttrs[i]] = bookMeanBetaExp[i];
  }

  // upload book coefficients
  console.log(await updater.updateBayeseanAttributes('book', bookCoefficients));

  // book predictions
  for (let name in bookPred.characters) {
    // find date of birth
    let birth = -100;
    for (let c of characters) {
      if (c.name === name) {
        birth = c.birth;
        break;
      }
    }
    if (birth === -100 || birth === undefined || birth === null) {
      // invalid data, can't make a predictions
      continue;
    }

    let ch = bookPred.characters[name];

    // PLOD for the current year + 1
    let plod = 1;
    if (ch.survivalFunctionMean.length > config.GOT_CURRENT_YEAR_BOOK + 1 - birth) {
      plod = 1 - ch.survivalFunctionMean[config.GOT_CURRENT_YEAR_BOOK + 1 - birth];
    }

    let survFnStart = config.GOT_CURRENT_YEAR_BOOK;
    let survFn = ch.survivalFunctionMean.slice(config.GOT_CURRENT_YEAR_BOOK - birth, config.GOT_CURRENT_YEAR_BOOK - birth + 21);

    // update predictions online
    console.log(await updater.updatePLODLongevity('book', name, survFn, survFnStart, plod));
  }

  // show coefficients
  let showAttrs = showPred.attributes;
  let showMeanBetaExp = showPred.meanBetaExp;
  let showCoefficients = {};
  for (let i = 0; i < showAttrs.length; i++) {
    showCoefficients[showAttrs[i]] = showMeanBetaExp[i];
  }

  // upload show coefficients
  console.log(await updater.updateBayeseanAttributes('show', showCoefficients));

  // show predictions
  for (let name in showPred.characters) {
    // this is somewhat simpler...
    let survFnStart = config.GOT_CURRENT_YEAR_SHOW;
    let ch = showPred.characters[name];
    let plod = 1 - ch.survivalFunctionMean[config.GOT_CURRENT_YEAR_SHOW + 1 - config.GOT_SHOW_BEGIN]; // guaranteed to have that
    let survFn = ch.survivalFunctionMean.slice(
      config.GOT_CURRENT_YEAR_SHOW - config.GOT_SHOW_BEGIN,
      config.GOT_CURRENT_YEAR_SHOW - config.GOT_SHOW_BEGIN + 21,
    );

    // update predictions online
    console.log(await updater.updatePLODLongevity('show', name, survFn, survFnStart, plod));
  }

  //  output some final statistics
  console.log(`successfully updated ${Object.keys(bookPred).length} book predictions`);
  console.log(`successfully updated ${Object.keys(showPred).length} show predictions`);

  callback();
}

exports.updateBayeseanPredictions = updatePredictions;

updatePredictions(() => {});
