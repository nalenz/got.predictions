const utils = require('../common/utils');
const config = require('../common/config');

(async () => {
  const [bookPred, showPred] = await Promise.all([utils.loadPredictionsBook(), utils.loadPredictionsShow()]);
  const updater = await new utils.APIUpdater().init();
  let numUpdatedBook = 0;
  let numUpdatedShow = 0;

  // update book predictions on server
  for (let name in bookPred) {
    const resp = await updater.updatePLODLongevityIfNotExists(
      'book',
      name,
      bookPred[name],
      config.GOT_CURRENT_YEAR_BOOK,
      1 - bookPred[name][0],
    );
    if (resp) {
      console.log(resp);
      ++numUpdatedBook;
    }
  }

  // update show predictions on server
  for (let name in showPred) {
    const resp = await updater.updatePLODLongevityIfNotExists(
      'show',
      name,
      showPred[name],
      config.GOT_CURRENT_YEAR_SHOW,
      1 - showPred[name][0],
    );
    if (resp) {
      console.log(resp);
      ++numUpdatedShow;
    }
  }

  // output some final statistics
  console.log(`successfully updated ${numUpdatedBook} book predictions`);
  console.log(`successfully updated ${numUpdatedShow} show predictions`);
})();
