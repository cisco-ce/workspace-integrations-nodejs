import { DataObject, Http } from './types';

const cacheSec = 60 * 60;
/**
 * Cache for remembering values that change relatively seldom,
 * such as device and workspace metadata.
 */
class Cache {
  private store: DataObject = {};

  async fetch(http: Http, url: string) {
    if (this.get(url)) {
      // console.log('got cached', url);
      return this.get(url);
    }
    const res = await http.get(url);
    // console.log('fetch', url);
    this.set(url, res);
    return res;
  }

  private get(resource: string): any {
    const record = this.store[resource];
    if (record) {
      const age = (Date.now() - record.created) / 1000;
      // console.log('age', age, 's vs', cacheSec, 's');
      if (age < cacheSec) {
        // console.log('got cached', resource);
        return record.value;
      }
    }
    return null;
  }

  private set(resource: string, value: any) {
    this.store[resource] = {
      created: Date.now(),
      value,
    };
  }
}

export default Cache;
