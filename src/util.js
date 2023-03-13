function pathMatch(_actual, _pattern) {
  const actual = _actual.replace(/ /g, '.').toLowerCase();
  const pattern = _pattern.replace(/ /g, '.').toLowerCase();
  return actual.includes(pattern);
}

function isStr(a) {
  return typeof a === 'string';
}

function isFun(a) {
  return typeof a === 'function';
}

function isObj(a) {
  return typeof a === 'object';
}

function shortName(deviceId) {
  return deviceId.slice(0, 8) + '...' + deviceId.slice(-8);
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function removePath(path, object) {
  const paths = path.replace(/ /g, '.').split('.');
  let res = object;
  paths.forEach(key => {
    if (key !== '*') {
      res = res[key];
    }
  });
  return res;
}

function makeBranch(tree, key, value) {
  const paths = key.split('.');
  let parent = tree;
  paths.forEach((path, i) => {
    const isLeaf = i === paths.length - 1;
    const isList = path.includes('[');
    if (isLeaf && !isList) {
      parent[path] = value;
    }
    else if (isList) {
      const [_full, name, index] = path.match(/(.*)\[(\d+)\]/);
      if (!parent[name]) {
        parent[name] = [];
      }
      const obj = { id: index };
      parent[name].push(obj);
      parent = obj;
    }
    else if (!parent[path]) {
      parent[path] = {};
      parent = parent[path];
    }
  });
}

function toTree(config) {
  const tree = {};
  const keys = Object.keys(config);
  keys.forEach((key) => {
    makeBranch(tree, key, config[key].value);
  });
  return tree;
}

module.exports = {
  toTree,
  removePath,
  sleep,
  shortName,
  pathMatch,
  isStr,
  isObj,
  isFun,
};
