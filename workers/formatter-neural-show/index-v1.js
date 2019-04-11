const utils = require('../common/utils');

(async () => {
  // attributes for data
  const dataScalarAttrs = ['male', 'isBastard', 'pageRank', 'numRelatives', 'numCommandedBattles'];
  const dataVectorAttrs = ['age', 'allegiances', 'appearances', 'cultures', 'titles'];

  // read formatted data
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterShowMLData('chars-to-train'),
    utils.loadFormatterShowMLData('chars-to-predict'),
  ]);

  // create final data and labels, note that training data is shuffled to improve validation later
  const johv = new utils.JoinedOneHotVector(charsTrain.concat(charsPredict), dataScalarAttrs, dataVectorAttrs);
  const dataTrain = johv.createMultiple(charsTrain);
  const dataPredict = johv.createMultiple(charsPredict);

  // output some final statistics
  console.log(`number of training datapoints      : ${dataTrain.length}`);
  console.log(`number of dimensions per datapoint : ${dataTrain[0].length}`);

  // write data and labels to output file
  await utils.writeOutputDataBinary('v1-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v1-data-predict', dataPredict, true);
})();
