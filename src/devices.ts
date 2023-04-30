import { Devices, Http } from './types';
import { toUrlParams } from './util';

class DevicesImpl implements Devices {
  private http: Http;

  constructor(http: Http) {
    this.http = http;
  }

  async getDevices( filters?: any) {
    let hasMore = false;
    let result: any[] = [];
    let start = 0;
    const max = 999;
    const params = toUrlParams(filters);

    do {
      const url = `/devices?max=${max}&start=${start}&${params}`;
      const res = await this.http.get(url);

      let list: any[] = res.items;
      hasMore = list.length >= max;
      result = result.concat(list);
      start += max;
    } while (hasMore);

    return result;
  }
}

export default DevicesImpl;
