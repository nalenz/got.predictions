const utils = require('../common/utils');

(async () => {
  // attributes for data and labels
  const dataScalarAttrs = ['male', 'pageRank'];
  const dataVectorAttrs = ['books', 'house', 'locations', 'titles'];
  const labelAttrs = ['age'];

  // read data
  const [charsTrain, charsPredict] = await Promise.all([
    utils.loadFormatterMLData('chars-to-train'),
    utils.loadFormatterMLData('chars-to-predict'),
  ]);

  // determine ranges for all attributes, then create final data and labels
  //const attrRanges = utils.getAttrRanges(charsTrain.concat(charsPredict), dataAttrs.concat(labelAttrs));
  const johv = new utils.JoinedOneHotVector(charsTrain.concat(charsPredict), dataScalarAttrs, dataVectorAttrs.concat(labelAttrs));
  johv.applyConfig(dataScalarAttrs, dataVectorAttrs);
  const dataTrain = johv.createMultiple(charsTrain);
  const dataPredict = johv.createMultiple(charsPredict);
  johv.applyConfig([], labelAttrs);
  const labelsTrain = johv.createMultiple(charsTrain);

  // write data and labels to output file
  await utils.writeOutputDataBinary('v1-data-train', dataTrain, true);
  await utils.writeOutputDataBinary('v1-data-predict', dataPredict, true);
  await utils.writeOutputDataBinary('v1-labels-train', labelsTrain, true);
})();
