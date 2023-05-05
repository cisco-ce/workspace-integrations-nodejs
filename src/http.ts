/**
 * All http calls for communicating with Webex (device) cloud
 */

// node-fetch Needs to be on low version to support CommonJS / require
// @ts-ignore
import nodefetch from 'node-fetch';
import { urlJoin } from 'url-join-ts';

import { DataObject, Http } from './types';

let dryMode = false;
const httpLog: { url: string, options: DataObject }[] = [];

interface Config {
  path: string;
  value: string | number | boolean;
}

interface StringObject {
  [name: string]: string | number;
}

export interface OAuthDetails {
  clientId: string;
  clientSecret: string;
  oauthUrl: string;
  refreshToken: string;
}

function header(accessToken: string) {
  return {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
  };
}

// Modify fetch to throw error if http result is not 2xx, and return json always
async function fetch(url: string, options: DataObject) {
  if (dryMode) {
    httpLog.push({ url, options });
    return;
  }
  const res = await nodefetch(url, options);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function get(accessToken: string, url: string) {
  const headers = header(accessToken);
  const options = {
    headers,
  };

  return fetch(url, options);
}

class HttpImpl implements Http {
  private baseUrl: string = '';
  private accessToken: string = '';

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  static setDryMode(dry: boolean) {
    dryMode = dry;
  }

  static history() {
    return httpLog;
  }

  webexApi(partialUrl: string, method: string = 'GET', body: any = null, contentType: string = 'application/json'): Promise<any> {
    const headers = header(this.accessToken);
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const options: DataObject = {
      method,
      headers
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const url = urlJoin(this.baseUrl, partialUrl);

    return fetch(url, options);
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken(): string {
    return this.accessToken;
  }

  fullUrl(partialUrl: string) {
    return urlJoin(this.baseUrl, partialUrl);
  }

  static getAccessToken(oauth: OAuthDetails) {
    const { clientId, clientSecret, oauthUrl, refreshToken } = oauth;
    const headers = {
      'Content-Type': 'application/json',
    };

    const body = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    };

    const options = {
      headers,
      method: 'POST',
      body: JSON.stringify(body),
    };

    return fetch(oauthUrl, options);
  };

  static initIntegration = (data: DataObject) => {
    const { accessToken, appUrl, webhook, notifications, actionsUrl } = data;
    const headers = header(accessToken);
    const body: any = {
      provisioningState: 'completed',
    };

    if (notifications === 'webhook') {
      body.webhook = webhook;
      body.actionsUrl = actionsUrl;
    } else if (notifications === 'longpolling') {
      body.queue = {
        state: 'enabled',
      };
    }

    const options = {
      headers,
      method: 'PATCH',
      body: JSON.stringify(body),
    };

    return fetch(appUrl, options);
  };

  get(partialUrl: string) {
    const url = urlJoin(this.baseUrl + partialUrl);
    return get(this.accessToken, url);
  }

  getLocations = async (accessToken: string, appUrl: string) => {
    const res = await get(accessToken, appUrl);
    return res.publicLocationIds;
  };

  pollDeviceData = (url: string) => {
    const headers = header(this.accessToken);
    return fetch(url, { headers });
  };

  xCommand = (deviceId: string, command: string, args?: StringObject, multiline?: string) => {
    const url = urlJoin(this.baseUrl, 'xapi/command', command);
    const body: any = {
      deviceId,
    };

    if (args) {
      body.arguments = args;
    }

    if (multiline) {
      body.body = multiline;
    }

    const headers = header(this.accessToken);
    const options = {
      headers,
      method: 'POST',
      body: JSON.stringify(body),
    };

    return fetch(url, options);
  };

  xStatus = (deviceId: string, path: string) => {
    const url = urlJoin(this.baseUrl, '/xapi/status/', `?deviceId=${deviceId}&name=${path}`);
    return get(this.accessToken, url);
  };

  xConfig = (deviceId: string, path: string) => {
    const url = urlJoin(this.baseUrl, '/deviceConfigurations/', `?deviceId=${deviceId}&key=${path}`);
    return get(this.accessToken, url);
  };

  xConfigSet = (deviceId: string, configs: Config[]) => {
    const url = urlJoin(this.baseUrl, '/deviceConfigurations/', `?deviceId=${deviceId}`);
    const headers = {
      Authorization: 'Bearer ' + this.accessToken,
      'Content-Type': 'application/json-patch+json',
    };
    const body = configs.map((config) => ({
      op: 'replace',
      path: config.path + '/sources/configured/value',
      value: config.value,
    }));

    const options = {
      headers,
      body: JSON.stringify(body),
      method: 'PATCH',
    };

    return fetch(url, options);
  };

  getWorkspace = (accessToken: string, workspaceId: string) => {
    const url = urlJoin(this.baseUrl, '/workspaces/', workspaceId);
    return get(accessToken, url);
  };

  deviceDetails = (accessToken: string, deviceId: string) => {
    const url = urlJoin(this.baseUrl, '/devices/', deviceId);
    return get(accessToken, url);
  };
}

export default HttpImpl;
