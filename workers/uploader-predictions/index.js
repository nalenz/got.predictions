const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  const [bookPred, showPred] = await Promise.all([utils.loadPredictionsBook(), utils.loadPredictionsShow()]);
  const updater = await new utils.APIUpdater().init();

  // update book predictions on server
  for (let name in bookPred) {
    console.log(await updater.updatePLODLongevity('book', name, bookPred[name], config.GOT_CURRENT_YEAR_BOOK, 1 - bookPred[name][0]));
  }

  // update show predictions on server
  for (let name in showPred) {
    console.log(await updater.updatePLODLongevity('show', name, showPred[name], config.GOT_CURRENT_YEAR_SHOW, 1 - showPred[name][0]));
  }

  // output some final statistics
  console.log(`successfully updated ${Object.keys(bookPred).length} book predictions`);
  console.log(`successfully updated ${Object.keys(showPred).length} show predictions`);
})();
