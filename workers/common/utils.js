const path = require('path');
const fs = require('fs-extra');
const zlib = require('zlib');

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

function zlibDeflate(buf) {
  return new Promise((resolve, reject) => {
    zlib.deflate(buf, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function writeOutputDataBinary(name, data, compress) {
  // create simple header with both dimensions (number of entries + dimensions per entry) and float32 data itself
  const headerBuf = Buffer.from(new Uint32Array([data.length, data[0].length]).buffer);
  const dataBuf = Buffer.concat(data.map(d => Buffer.from(new Float32Array(d).buffer)));

  // optionally compress output data
  let finalBuf = Buffer.concat([headerBuf, dataBuf]);
  if (compress) finalBuf = await zlibDeflate(finalBuf);

  // write output data to file
  let outStream = fs.createWriteStream(path.join(dirnameMain, `output/${name}.dat${compress ? '.gz' : ''}`));
  outStream.write(finalBuf);
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

function clamp(val, rng) {
  if (val < rng.min) return rng.min;
  if (val > rng.max) return rng.max;
  return val;
}

async function writeJSONSetFromAttr(arr, attr) {
  const ret = createSetFromAttr(arr, attr);
  await writeOutputData(attr, ret);
  return ret;
}

class JoinedOneHotVector {
  constructor(baseData, scalarAttrs, vectorAttrs) {
    this.scalarAttrs = scalarAttrs;
    this.vectorAttrs = vectorAttrs;
    this.ranges = this.calculateRanges(baseData, vectorAttrs);
    this.applyConfig(scalarAttrs, vectorAttrs);
  }

  applyConfig(localScalarAttrs, localVectorAttrs) {
    this.localScalarAttrs = localScalarAttrs;
    this.localVectorAttrs = localVectorAttrs;
    this.offsets = this.calculateOffsets(localScalarAttrs, localVectorAttrs);
    this.length = this.offsets[localVectorAttrs.slice(-1)[0]] + this.ranges[localVectorAttrs.slice(-1)[0]].span;
  }

  calculateRanges(baseData, vectorAttrs) {
    return vectorAttrs.reduce((prev, curr) => ((prev[curr] = extremeAttr(baseData, curr)), prev), {});
  }

  calculateOffsets(localScalarAttrs, localVectorAttrs) {
    return localVectorAttrs
      .slice(0, -1)
      .reduce((prev, attr, idx) => ((prev[localVectorAttrs[idx + 1]] = prev[attr] + this.ranges[attr].span), prev), {
        ...localScalarAttrs.reduce((prev, curr, idx) => ((prev[curr] = idx), prev), {}),
        [localVectorAttrs[0]]: localScalarAttrs.length,
      });
  }

  createSingle(entry) {
    let ret = new Array(this.length).fill(0);
    this.localScalarAttrs.forEach(a => (ret[this.offsets[a]] = +entry[a]));
    this.localVectorAttrs.forEach(d =>
      (entry[d] instanceof Array ? entry[d] : [entry[d]]).forEach(x => (ret[this.offsets[d] + (x - this.ranges[d].min)] = 1)),
    );
    return ret;
  }

  createMultiple(arr) {
    return arr.map(c => this.createSingle(c));
  }

  createSingleUnfolded(entry, attr, labelFn, usedRange, rangeValModifier) {
    let retMain = this.createSingle(entry);
    retMain[this.offsets[attr] + entry[attr]] = 0.0;
    if (usedRange === undefined) usedRange = this.ranges[attr];
    if (usedRange.span === undefined) usedRange.span = usedRange.max - usedRange.min + 1;
    if (rangeValModifier === undefined) rangeValModifier = (_, x) => x;
    return new Array(usedRange.span).fill(0).map((_, i) => {
      let currData = retMain.slice();
      const actualI = rangeValModifier(entry, usedRange.min + i, this.ranges[attr]);
      currData[this.offsets[attr] + actualI] = 1.0;
      return [currData, labelFn(entry, actualI, this.ranges[attr])];
    });
  }

  createMultipleUnfolded(arr, attr, labelFn, usedRange, rangeValModifier) {
    const res = [].concat(...arr.map(c => this.createSingleUnfolded(c, attr, labelFn, usedRange, rangeValModifier)));
    return [res.map(x => x[0]), res.map(x => x[1])];
  }

  createMultipleUnfoldedOnlyData(arr, attr, usedRange, rangeValModifier) {
    const res = [].concat(...arr.map(c => this.createSingleUnfolded(c, attr, () => undefined, usedRange, rangeValModifier)));
    return res.map(x => x[0]);
  }
}

module.exports = {
  loadBookData,
  loadFormatterMLData,
  writeOutputData,
  writeOutputDataBinary,
  arrToIndices,
  minAttr,
  maxAttr,
  clamp,
  createSetFromAttrFunc,
  writeJSONSetFromAttr,
  JoinedOneHotVector,
};
