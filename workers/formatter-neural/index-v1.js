const utils = require('../common/utils');

(async () => {
  // attributes for data and labels
  const dataAttrs = ['books', 'house', 'locations', 'titles'];
  const labelAttrs = ['age'];

  // read data and determine ranges for all attributes
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterMLData('chars-to-train'),
    utils.loadFormatterMLData('chars-to-predict'),
  ]);

  // determine ranges for all attributes, then create final data and labels
  const attrRanges = utils.getAttrRanges(charsTrain.concat(charsPredict), dataAttrs.concat(labelAttrs));
  const dataTrain = utils.createJoinedOneHotVector(charsTrain, ['male', 'pageRank'], dataAttrs, attrRanges);
  const dataPredict = utils.createJoinedOneHotVector(charsPredict, ['male', 'pageRank'], dataAttrs, attrRanges);
  const labels = utils.createJoinedOneHotVector(charsTrain, [], labelAttrs, attrRanges);

  // write data and labels to output file
  await utils.writeOutputDataBinary('v1-data-train', dataTrain);
  await utils.writeOutputDataBinary('v1-data-predict', dataPredict);
  await utils.writeOutputDataBinary('v1-labels', labels);
})();
