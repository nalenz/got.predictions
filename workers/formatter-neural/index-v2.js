const utils = require('../common/utils');

(async () => {
  // attributes for data
  const dataScalarAttrs = ['male', 'pageRank', 'numRelatives'];
  const dataVectorAttrs = ['age', 'allegiances', 'books', 'culture', 'house', 'houseRegion', 'locations', 'titles'];

  // read data and determine ranges for all attributes
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterMLData('chars-to-train'),
    utils.loadFormatterMLData('chars-to-predict'),
  ]);

  // create final data and labels
  const johv = new utils.JoinedOneHotVector(charsTrain.concat(charsPredict), dataScalarAttrs, dataVectorAttrs);
  const dataTrain = johv.createMultiple(charsTrain);
  const dataPredict = johv.createMultiple(charsPredict);

  // output some final statistics
  console.log(`number of training datapoints      : ${dataTrain.length}`);
  console.log(`number of dimensions per datapoint : ${dataTrain[0].length}`);

  // write data and labels to output file
  await utils.writeOutputDataBinary('v2-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v2-data-predict', dataPredict, true);
})();
