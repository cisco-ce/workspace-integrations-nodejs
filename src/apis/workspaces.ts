import { Workspaces, Workspace, Http } from '../types';
import { toUrlParams } from '../util';
import Cache from '../cache';

class WorkspacesImpl implements Workspaces {
  private http: Http;
  private cache: Cache;

  constructor(http: Http) {
    this.http = http;
    this.cache = new Cache();
  }

  async getWorkspaces(filters?: any) {
    let hasMore = false;
    let result: any[] = [];
    let start = 0;
    const max = 999;
    const params = toUrlParams(filters);

    do {
      const url = `/workspaces?max=${max}&start=${start}&${params}`;
      const res = await this.http.get(url);

      const list: any[] = res.items;
      hasMore = list.length >= max;
      result = result.concat(list);
      start += max;
    } while (hasMore);

    return result;
  }

  getWorkspace(workspaceId: string): Promise<Workspace> {
    const url = '/workspaces/' + workspaceId;
    return this.cache.fetch(this.http, url);
  }
}

export default WorkspacesImpl;
