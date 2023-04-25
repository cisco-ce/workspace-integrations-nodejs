/**
 * All http calls for communicating with Webex (device) cloud
 */

// Needs to be on low version to support CommonJS / require
// @ts-ignore
import nodefetch from 'node-fetch';

const commandUrl = 'https://webexapis.com/v1/xapi/command/';
const statusUrl = 'https://webexapis.com/v1/xapi/status/';
const configUrl = 'https://webexapis.com/v1/deviceConfigurations/';
const deviceUrl = 'https://webexapis.com/v1/devices/';

function header(accessToken: string) {
  return {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
  };
}

interface StringObject {
  [name: string]: string | number;
}

function toUrlParams(object: StringObject) {
  if (!object) return '';
  const list:any = [];
  Object.keys(object).forEach((key) => {
    list.push(`${key}=${object[key]}`);
  });
  return list.join('&');
}

// Modify fetch to throw error if http result is not 2xx, and return json always
async function fetch(...args: any) {
  // console.log('fetch:', ...args);
  const res = await nodefetch(...args);
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

function getAccessToken(clientId: string, clientSecret: string, oauthUrl: string, refreshToken: string) {

  const headers = {
    'Content-Type': 'application/json',
  };

  const body = {
    "grant_type": "refresh_token",
    "client_id": clientId,
    "client_secret": clientSecret,
    "refresh_token": refreshToken,
  };

  const options = {
    headers,
    method: 'POST',
    body: JSON.stringify(body),
  };

  return fetch(oauthUrl, options);
}

interface Webhook {
  targetUrl: string;
  type: string;
  secret: string;
}

interface Deployment {
  webhook: Webhook,
  actionsUrl: string,
}

interface Config {
  path: string;
  value: string | number | boolean;
}

function initIntegration(accessToken: string, appUrl: string, deployment: Deployment) {

  const headers = header(accessToken);
  const body: any = {
    provisioningState: "completed",
  };

  if (deployment.webhook) {
    body.webhook = deployment.webhook;
    body.actionsUrl = deployment.actionsUrl;
  }
  else {
    body.queue = {
      "state": "enabled"
    };
  }

  const options = {
    headers,
    method: 'PATCH',
    body: JSON.stringify(body),
  };

  return fetch(appUrl, options);
}

async function getLocations(accessToken: string, appUrl: string) {
  const res = await get(accessToken, appUrl);
  return res.publicLocationIds;
}

function pollDeviceData(url: string, accessToken: string) {
  const headers = header(accessToken);
  return fetch(url, { headers });
}

function xCommand(
  accessToken: string,
  deviceId: string,
  command: string,
  args: StringObject,
  multiline: string
) {
  const url = commandUrl + command;
  const body: any = {
    deviceId,
  };

  if (args) {
    body.arguments = args;
  }

  if (multiline) {
    body.body = multiline;
  }

  const headers = header(accessToken);
  const options = {
    headers, method: 'POST', body: JSON.stringify(body),
  };

  return fetch(url, options);
}

function xStatus(accessToken: string, deviceId: string, path: string) {
  const url = `${statusUrl}?deviceId=${deviceId}&name=${path}`;
  return get(accessToken, url);
}

function xConfig(accessToken: string, deviceId: string, path: string) {
  const url = `${configUrl}?deviceId=${deviceId}&key=${path}`;
  return get(accessToken, url);
}

function xConfigSet(accessToken: string, deviceId: string, configs: Config[]) {
  const url = `${configUrl}?deviceId=${deviceId}`;
  const headers = {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json-patch+json',
  };
  const body = configs.map(config => ({
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
}

async function getDevices(accessToken: string, locationId: string, filters: any) {
  let hasMore = false;
  let result: any[] = [];
  let start = 0;
  const max = 999;
  const params = toUrlParams(filters);

  do {
    const url = `${deviceUrl}?includeLocation=true&max=${max}&start=${start}&${params}` ;
    const res = await get(accessToken, url);

    let list: any[] = res.items;
    hasMore = list.length >= max;

    if (locationId) {
      list = list.filter(device => device.location && device.location.id === locationId);
    }

    result = result.concat(list);
    start += max;
  } while (hasMore);

  return result;
}

function deviceDetails(accessToken: string, deviceId: string) {
  const url = deviceUrl + deviceId;
  return get(accessToken, url);
}

export default {
  getAccessToken,
  initIntegration,
  xCommand,
  xStatus,
  xConfig,
  xConfigSet,
  pollDeviceData,
  getDevices,
  getLocations,
  deviceDetails,
};
