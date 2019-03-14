const path = require('path');
const fs = require('fs-extra');

function loadBookData(name) {
  return fs.readJSON(path.join(path.dirname(require.main.filename), `../../data/book/${name}.json`));
}

async function writeOutputData(name, data) {
  await fs.writeJSON(path.join(path.dirname(require.main.filename), `output/${name}.json`), data);
  return data;
}

function createSetFromAttrFunc(arr, fn) {
  return [...new Set([].concat(...arr.map(c => fn(c).map(x => (x || '').toLowerCase()))))]
    .filter(c => c.length > 0)
    .map(c => c.replace(/&apos;/g, "'"))
    .sort();
}

// extract all unique values from an array of objects which contain an array of strings at a given attribute, e.g.
// createSetFromAttr([{a:["x","y"]}, {a:["z","x"]}, {a:["x","w"]}], "a")  ==  ["w", "x", "y", "z"]
function createSetFromAttr(arr, attr) {
  return createSetFromAttrFunc(arr, n => n[attr]);
}

// convert an array of actual values to indices in a base array, while eliminating invalid ones, e.g.
// arrToIndices(["a","b","a","c","c","d"], ["a","b","c"])  ==  [1,2,1,3,3]
function arrToIndices(arr, base) {
  return (arr || []).map(x => base.indexOf(x.toLowerCase())).filter(x => x !== -1);
}

function minAttr(arr, attr) {
  return Math.min(...arr.map(x => x[attr] || Infinity));
}

function maxAttr(arr, attr) {
  return Math.max(...arr.map(x => x[attr] || -Infinity));
}

async function writeJSONSetFromAttr(arr, attr) {
  const ret = createSetFromAttr(arr, attr);
  await writeOutputData(attr, ret);
  return ret;
}

module.exports = {
  loadBookData,
  arrToIndices,
  minAttr,
  maxAttr,
  writeOutputData,
  createSetFromAttrFunc,
  writeJSONSetFromAttr,
};
