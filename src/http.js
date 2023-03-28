/**
 * All http calls for communicating with Webex (device) cloud
 */

// Needs to be on low version to support CommonJS / require
const nodefetch = require('node-fetch');

const commandUrl = 'https://webexapis.com/v1/xapi/command/';
const statusUrl = 'https://webexapis.com/v1/xapi/status/';
const configUrl = 'https://webexapis.com/v1/deviceConfigurations/';
const deviceUrl = 'https://webexapis.com/v1/devices/';

function header(accessToken) {
  return {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
  };
}

function toUrlParams(object) {
  if (!object) return '';
  const list = [];
  Object.keys(object).forEach((key) => {
    list.push(`${key}=${object[key]}`);
  });
  return list.join('&');
}

// Modify fetch to throw error if http result is not 2xx, and return json always
async function fetch(...args) {
  // console.log('fetch:', ...args);
  const res = await nodefetch(...args);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function get(accessToken, url) {
  const headers = header(accessToken);
  const options = {
    headers,
  };

  return fetch(url, options);
}

function getAccessToken(clientId, clientSecret, oauthUrl, refreshToken) {

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

function initIntegration(accessToken, appUrl) {

  const headers = header(accessToken);

  const body = {
    "provisioningState": "completed",
    "queue": {
      "state": "enabled"
    }
  };

  const options = {
    headers,
    method: 'PATCH',
    body: JSON.stringify(body),
  };

  return fetch(appUrl, options);
}

async function getLocations(accessToken, appUrl) {
  const res = await get(accessToken, appUrl);
  return res.publicLocationIds;
}

function pollDeviceData(url, accessToken) {
  const headers = header(accessToken);
  return fetch(url, { headers });
}

function xCommand(accessToken, deviceId, command, arguments, multiline) {
  const url = commandUrl + command;
  const body = {
    deviceId,
  };

  if (arguments) {
    body.arguments = arguments;
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

function xStatus(accessToken, deviceId, path) {
  const url = `${statusUrl}?deviceId=${deviceId}&name=${path}`;
  return get(accessToken, url);
}

function xConfig(accessToken, deviceId, path) {
  const url = `${configUrl}?deviceId=${deviceId}&key=${path}`;
  return get(accessToken, url);
}

function xConfigSet(accessToken, deviceId, path, value) {
  const url = `${configUrl}?deviceId=${deviceId}`;
  const headers = {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json-patch+json',
  };
  const body = [{
    op: 'replace',
    path: path + '/sources/configured/value',
    value,
  }];
  const options = {
    headers,
    body: JSON.stringify(body),
    method: 'PATCH',
  };

  return fetch(url, options);
}

async function getDevices(accessToken, locationId, filters) {
  let hasMore = false;
  let result = [];
  let start = 0;
  const max = 999;
  const params = toUrlParams(filters);

  do {
    const url = `${deviceUrl}?includeLocation=true&max=${max}&start=${start}&${params}` ;
    const res = await get(accessToken, url);

    let list = res.items;
    hasMore = list.length >= max;

    if (locationId) {
      list = list.filter(device => device.location && device.location.id === locationId);
    }

    result = result.concat(list);
    start += max;
  } while (hasMore);

  return result;
}

function deviceDetails(accessToken, deviceId) {
  const url = deviceUrl + deviceId;
  return get(accessToken, url);
}

module.exports = {
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
