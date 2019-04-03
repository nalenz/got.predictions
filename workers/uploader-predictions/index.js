const utils = require('../common/utils');
const config = require('../common/config');
const request = require('request-promise-native');
const querystring = require('querystring');

(async () => {
  const [bookPred, showPred] = await Promise.all([utils.loadPredictionsBook(), utils.loadPredictionsShow()]);
  const formData = {
    slug: 'Jon_Snow',
    longevity: [0.3, 0.4],
    longevityStart: 304,
    plod: 42,
    token: '123secure',
  };
  const apiUrl = 'https://gotdata.northeurope.cloudapp.azure.com/api/book/characters/updateGroupB';

  let res = await request.post(apiUrl, { json: formData });
  console.log(res);
})();
