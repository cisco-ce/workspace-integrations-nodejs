const http = require('./http');

const {
  toTree,
  removePath,
  sleep,
  pathMatch,
  isStr,
  isObj,
} = require('./util');

const waitAfterError = 5000;


// TODO: verify all input parameter types better
class XAPI {

  constructor(accessToken, appInfo) {
    this.accessToken = accessToken;
    this.appInfo = appInfo;
    this.eventListeners = [];
    this.statusListeners = [];

    this.command = (deviceId, path, params, multiline) => {
      if(!isStr(deviceId) || !isStr(path)) {
        throw new Error('xCommand: missing deviceId or path');
      }
      if (params && !isObj(params)) {
        throw new Error('xCommand: params must be object');
      }
      const token = this.getAccessToken();
      const cmd = path.replace(/ /g, '.');
      return http.xCommand(token, deviceId, cmd, params, multiline);
    };

    this.status = {
      get: async (deviceId, path) => {
        if(!isStr(deviceId) || !isStr(path)) {
          throw new Error('xCommand: missing deviceId or path');
        }
        const token = this.getAccessToken();
        const name = path.replace(/ /g, '.');
        const res = await http.xStatus(token, deviceId, name);

        const answer = res?.result;
        // console.log('full status answer', path, answer);

        if (answer) {
          return removePath(path, answer);
        }
      },
      on: (path, callback) => {
        this.statusListeners.push({ path, callback });
      },
    };

    this.event = {
      on: (path, callback) => {
        this.eventListeners.push({ path, callback });
      },
    };

    this.config = {
      get: async (deviceId, path) => {
        if(!isStr(deviceId) || !isStr(path)) {
          throw new Error('xCommand: missing deviceId or path');
        }

        const token = this.getAccessToken();
        const name = path.replace(/ /g, '.');
        const res = await http.xConfig(token, deviceId, name);
        const tree = toTree(res.items);
        // console.log('tree:', JSON.stringify(tree, null, 2));
        return tree;
      },
    };
  }

  // for filtes, see https://developer.webex.com/docs/api/v1/devices/list-devices
  // use eg { type: 'roomdesk' } to only get main devices, not navigators etc
  getDevices(location, filters) {
    const token = this.getAccessToken();
    return http.getDevices(token, location, filters);
  }

  getLocations() {
    return this.appInfo.publicLocationIds;
  }

  getAppInfo() {
    return this.appInfo;
  }

  deviceDetails(deviceId) {
    const token = this.getAccessToken();
    return http.deviceDetails(token, deviceId);
  }

  processIncomingData(data) {
    const { deviceId, type, timestamp } = data;
    const props = data?.changes?.updated;
    // console.log(data);
    if (type === 'status' && props) {
      for (const [key, value] of Object.entries(props)) {
        this.statusListeners.forEach((listener) => {
          if (pathMatch(key, listener.path)) {
            listener.callback(deviceId, key, value, data);
          }
        });
        // console.log('status', `${shortName(deviceId)} => ${key}: ${value} (${timestamp})`);
      }
    }
    else if (type === 'events') {
      data.events.forEach((e) => {
        const path = e.key;
        const event = e.value;
        this.eventListeners.forEach((listener) => {
          if (pathMatch(path, listener.path)) {
            listener.callback(deviceId, path, event, data);
          }
        });
        // console.log('event', shortName(deviceId), path, JSON.toString(event), timestamp);
      })
    }
    else if (type === 'healthCheck') {
      console.log('xapi: got healt check message');
    }
    else {
      console.log('unknown data', data);
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  async pollData(pollUrl) {
    while(true) {
      try {
        const token = this.getAccessToken();
        const data = await http.pollDeviceData(pollUrl, token);
        // console.log('got device data');
        data.messages.forEach(msg => this.processIncomingData(msg));
      }
      catch(e) {
        console.log('Error polling', e);
        await sleep(waitAfterError);
      }
    }
  }
}

module.exports = XAPI;
