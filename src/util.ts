function pathMatch(_actual: string, _pattern: string) {
  const actual = _actual.replace(/ /g, '.').toLowerCase();
  const pattern = _pattern.replace(/ /g, '.').toLowerCase();
  return actual.includes(pattern);
}

function isStr(a: any) {
  return typeof a === 'string';
}

function isFun(a: any) {
  return typeof a === 'function';
}

function isObj(a: any) {
  return typeof a === 'object';
}

function shortName(deviceId: string) {
  return deviceId.slice(0, 8) + '...' + deviceId.slice(-8);
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function removePath(path: string, object: any) {
  const paths = path.replace(/ /g, '.').split('.');
  let res = object;
  paths.forEach((key) => {
    if (key !== '*') {
      res = res[key];
    }
  });
  return res;
}

function makeBranch(tree: any, key: string, value: any) {
  const paths = key.split('.');
  let parent = tree;
  paths.forEach((path, i) => {
    const isLeaf = i === paths.length - 1;
    const isList = path.includes('[');
    if (isLeaf && !isList) {
      parent[path] = value;
    } else if (isList) {
      // @ts-ignore
      const [_full, name, index] = path.match(/(.*)\[(\d+)\]/);
      if (!parent[name]) {
        parent[name] = [];
      }
      const existingObj = parent[name].find((n: any) => n.id === index);
      if (!existingObj) {
        const obj = { id: index };
        parent[name].push(obj);
        parent = obj;
      }
      else {
        parent = existingObj;
      }
    }
    else if (!parent[path]) {
      parent[path] = {};
      parent = parent[path];
    }
    else {
      parent = parent[path];
    }
  });
}

function toTree(config: any) {
  const tree = {};
  const keys = Object.keys(config);
  keys.sort((k1, k2) => k1 < k2 ? -1 : 1);
  keys.forEach((key) => {
    makeBranch(tree, key, config[key].value);
  });
  return tree;
}

function emptyObj(obj: object) {
  return !Object.keys(obj).length;
}

interface StringObject {
  [name: string]: string | number;
}

function toUrlParams(object: StringObject) {
  if (!object) return '';
  const list: any = [];
  Object.keys(object).forEach((key) => {
    list.push(`${key}=${object[key]}`);
  });
  return list.join('&');
}

function atob(base64: string) {
  // @ts-ignore
  return Buffer.from(base64, 'base64').toString('ascii');
}

function parseJwt(jwt: string) {
  const payloadB64 = jwt.split('.')[1];
  return JSON.parse(atob(payloadB64));
}

export { toTree, removePath, sleep, shortName, pathMatch, isStr, isObj, isFun, parseJwt, toUrlParams, emptyObj };
