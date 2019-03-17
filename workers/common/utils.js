const path = require('path');
const fs = require('fs-extra');

const dirnameMain = path.dirname(require.main.filename);

function loadBookData(name) {
  return fs.readJSON(path.join(__dirname, `../../data/book/${name}.json`));
}

function loadFormatterMLData(name) {
  return fs.readJSON(path.join(__dirname, `../formatter/output/ml-data/${name}.json`));
}

async function writeOutputData(name, data) {
  await fs.writeJSON(path.join(dirnameMain, `output/${name}.json`), data);
  return data;
}

async function writeOutputDataBinary(name, data) {
  const headerBuf = Buffer.from(new Uint32Array([data.length, data[0].length]).buffer);
  const dataBuf = Buffer.concat(data.map(d => Buffer.from(new Float32Array(d).buffer)));

  let outStream = fs.createWriteStream(path.join(dirnameMain, `output/${name}.dat`));
  outStream.write(headerBuf);
  outStream.write(dataBuf);
  outStream.end();
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

function accumulateAttr(arr, attr, fn, alt) {
  return fn(
    arr.map(c => {
      if (c[attr] instanceof Array) return c[attr].length === 0 ? alt : fn(c[attr]);
      else return isNaN(c[attr]) ? alt : c[attr];
    }),
  );
}

function minAttr(arr, attr) {
  return accumulateAttr(arr, attr, a => Math.min(...a), Infinity);
}

function maxAttr(arr, attr) {
  return accumulateAttr(arr, attr, a => Math.max(...a), -Infinity);
}

function extremeAttr(arr, attr) {
  let ret = { min: minAttr(arr, attr), max: maxAttr(arr, attr) };
  ret.span = ret.max - ret.min + 1;
  return ret;
}

function getAttrRanges(arr, attrs) {
  return attrs.reduce((prev, curr) => ((prev[curr] = extremeAttr(arr, curr)), prev), {});
}

function createJoinedOneHotVector(arr, scalarAttrs, vectorAttrs, ranges) {
  const offsets = vectorAttrs
    .slice(0, -1)
    .reduce((prev, attr, idx) => ((prev[vectorAttrs[idx + 1]] = prev[attr] + ranges[attr].span), prev), {
      ...scalarAttrs.reduce((prev, curr, idx) => ((prev[curr] = idx), prev), {}),
      [vectorAttrs[0]]: scalarAttrs.length,
    });

  const len = offsets[vectorAttrs.slice(-1)[0]] + ranges[vectorAttrs.slice(-1)[0]].span;
  return arr.map(c => {
    let curr = new Array(len).fill(0);
    scalarAttrs.forEach(a => (curr[offsets[a]] = +c[a]));
    vectorAttrs.forEach(d => (c[d] instanceof Array ? c[d] : [c[d]]).forEach(x => (curr[offsets[d] + (x - ranges[d].min)] = 1)));
    return curr;
  });
}

async function writeJSONSetFromAttr(arr, attr) {
  const ret = createSetFromAttr(arr, attr);
  await writeOutputData(attr, ret);
  return ret;
}

module.exports = {
  loadBookData,
  loadFormatterMLData,
  writeOutputData,
  writeOutputDataBinary,
  arrToIndices,
  minAttr,
  maxAttr,
  getAttrRanges,
  createJoinedOneHotVector,
  createSetFromAttrFunc,
  writeJSONSetFromAttr,
};
