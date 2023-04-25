import http from'./http';

import {
  toTree,
  removePath,
  sleep,
  pathMatch,
  isStr,
  isObj,
} from './util';

import {
  DataObject,
  EventListener,
  StatusListener,
  Command,
  Status,
  Event,
  Config,
  XAPI,
} from './types';

const waitAfterError = 5000;

class XAPI_Impl implements XAPI {

  private accessToken: string;
  private appInfo: DataObject;
  private eventListeners: Array<{ path: string, callback: EventListener }>;
  private statusListeners: Array<{ path: string, callback: StatusListener }>;
  public command: Command;
  public status: Status;
  public event: Event;
  public config: Config;

  constructor(accessToken: string, appInfo: DataObject) {
    this.accessToken = accessToken;
    this.appInfo = appInfo;
    this.eventListeners = [];
    this.statusListeners = [];

    this.command = async (deviceId, path, params, multiline) => {
      if(!isStr(deviceId) || !isStr(path)) {
        throw new Error('xCommand: missing deviceId or path');
      }
      if (params && !isObj(params)) {
        throw new Error('xCommand: params must be object');
      }
      const token = this.getAccessToken();
      const cmd = path.replace(/ /g, '.');
      const res = await http.xCommand(token, deviceId, cmd, params, multiline);
      return res?.result;
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
      on: (path: string, callback: StatusListener) => {
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

      set: async (deviceId, path, value) => {
        if(!isStr(deviceId) || !path) {
          throw new Error('xCommand: missing deviceId or path');
        }
        const token = this.getAccessToken();
        const name = isStr(path) ? path.replace(/ /g, '.') : path;
        return await http.xConfigSet(token, deviceId, [ { path: name, value } ]);
      },

      setMany: async (deviceId, values: DataObject) => {
        const list = Object.entries(values).map(([p, value]) => ({ path: p, value }));
        const token = this.getAccessToken();
        return await http.xConfigSet(token, deviceId, list);
      }
    };
  }

  // for filtes, see https://developer.webex.com/docs/api/v1/devices/list-devices
  // use eg { type: 'roomdesk' } to only get main devices, not navigators etc
  getDevices(location: string, filters: DataObject) {
    const token = this.getAccessToken();
    return http.getDevices(token, location, filters);
  }

  getLocations() {
    return this.appInfo.publicLocationIds;
  }

  getAppInfo() {
    return this.appInfo;
  }

  deviceDetails(deviceId: string) {
    const token = this.getAccessToken();
    return http.deviceDetails(token, deviceId);
  }

  processIncomingData(data: DataObject) {
    const { deviceId, type } = data;
    const props = data?.changes?.updated;
    // console.log(data);
    if (type === 'status' && props) {
      for (const [key, value] of Object.entries(props)) {
        this.statusListeners.forEach((listener) => {
          if (pathMatch(key, listener.path)) {
            listener.callback(deviceId, key, value as DataObject, data);
          }
        });
        // console.log('status', `${shortName(deviceId)} => ${key}: ${value} (${timestamp})`);
      }
    }
    else if (type === 'events') {
      data.events.forEach((e: DataObject) => {
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

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  async pollData(pollUrl: string) {
    while(true) {
      try {
        const token = this.getAccessToken();
        const data = await http.pollDeviceData(pollUrl, token);
        // console.log('got device data');
        data.messages.forEach((msg: DataObject) => this.processIncomingData(msg));
      }
      catch(e) {
        console.log('Error polling', e);
        await sleep(waitAfterError);
      }
    }
  }
}

export default XAPI_Impl;
