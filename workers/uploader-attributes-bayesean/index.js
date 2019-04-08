const utils = require('../common/utils');

async function updatePredictions(callback) {
  let [bookPred, showPred] = await Promise.all([utils.loadBayeseanPredictionsBook(), utils.loadBayeseanPredictionsShow()]);
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

  // show coefficients
  let showAttrs = showPred.attributes;
  let showMeanBetaExp = showPred.meanBetaExp;
  let showCoefficients = {};
  for (let i = 0; i < showAttrs.length; i++) {
    showCoefficients[showAttrs[i]] = showMeanBetaExp[i];
  }

  // upload show coefficients
  console.log(await updater.updateBayeseanAttributes('show', showCoefficients));

  callback();
}

exports.updateBayeseanAttributes = updatePredictions;

updatePredictions(() => {});
