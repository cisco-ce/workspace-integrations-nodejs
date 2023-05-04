import { Devices, Http, DataObject } from '../types';
import { toUrlParams } from '../util';
import Cache from '../cache';

class DevicesImpl implements Devices {
  private http: Http;
  private cache: Cache;

  constructor(http: Http) {
    this.http = http;
    this.cache = new Cache();
  }

  async getDevices(filters?: any) {
    let hasMore = false;
    let result: any[] = [];
    let start = 0;
    const max = 999;
    const params = toUrlParams(filters);

    do {
      const url = `/devices?max=${max}&start=${start}&${params}`;
      const res = await this.http.get(url);

      const list: any[] = res.items;
      hasMore = list.length >= max;
      result = result.concat(list);
      start += max;
    } while (hasMore);

    return result;
  }

  async getDevice(deviceId: string) {
    const url = '/devices/' + deviceId;
    return this.cache.fetch(this.http, url);
  }
}

export default DevicesImpl;
