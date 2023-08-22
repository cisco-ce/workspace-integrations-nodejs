import Http from '../http';
import { toTree, removePath, pathMatch, isStr, isObj, emptyObj } from '../util';
import { DataObject, EventListener, StatusListener, Notification, XAPI } from '../types';
import logger from '../logger';

class XapiImpl implements XAPI {
  private eventListeners: Array<{ path: string; callback: EventListener }>;
  private statusListeners: Array<{ path: string; callback: StatusListener }>;
  private http: Http;

  constructor(http: Http) {
    this.http = http;
    this.eventListeners = [];
    this.statusListeners = [];
  }

  async command(deviceId: string, path: string, params?: DataObject, multiline?: string) {
    if (!isStr(deviceId) || !isStr(path)) {
      throw new Error('xCommand: missing deviceId or path');
    }
    if (params && !isObj(params)) {
      throw new Error('xCommand: params must be object');
    }
    const cmd = path.replace(/ /g, '.');
    const res = await this.http.xCommand(deviceId, cmd, params, multiline);
    return res?.result;
  }

  status = {
    get: async (deviceId: string, path: string, allowEmpty: boolean) => {
      if (!isStr(deviceId) || !isStr(path)) {
        throw new Error('xStatus: missing deviceId or path');
      }
      const name = path.replace(/ /g, '.');
      const res = await this.http.xStatus(deviceId, name);

      const answer = res?.result;
      if (emptyObj(answer) && !allowEmpty) {
        throw new Error('xStatus not found. Did you include the API in the manifest?');
      }
      if (emptyObj(answer) && allowEmpty) {
        return false;
      }

      if (answer) {
        return removePath(name, answer);
      }
    },
    on: (path: string, callback: StatusListener) => {
      logger.info('Subscribe to xStatus ' + path);
      this.statusListeners.push({ path, callback });
    },
  };

  config = {
    get: async (deviceId: string, path: string) => {
      if (!isStr(deviceId) || !isStr(path)) {
        throw new Error('xConfig: missing deviceId or path');
      }

      const name = path.replace(/ /g, '.');
      const items = (await this.http.xConfig(deviceId, name))?.items;
      // console.log('config items', items);

      if (!Object.keys(items).length) {
        throw new Error('xConfig not found on device. Did you include the API in the manifest?');
      }
      const tree = toTree(items);
      // console.log('tree:', JSON.stringify(tree, null, 2));
      return removePath(name, tree);
    },

    set: async (deviceId: string, path: string, value: string | number) => {
      if (!isStr(deviceId) || !path) {
        throw new Error('xConfig: missing deviceId or path');
      }
      const name = isStr(path) ? path.replace(/ /g, '.') : path;
      return await this.http.xConfigSet(deviceId, [{ path: name, value }]);
    },

    /**
     * Set multiple configs in one go. Provide each config as key/value pair. Eg:
     *
     * ```js
     * const configs = {
     *   'Audio.Ultrasound.MaxVolume': 0,
     *   'Audio.DefaultVolume': 33,
     *   'Audio.SoundsAndAlerts.RingVolume': 66,
     * };
     * await integration.xapi.config.setMany(device, configs);
     * ```
     */
    setMany: async (deviceId: string, values: DataObject) => {
      const list = Object.entries(values).map(([p, value]) => ({ path: p, value }));
      return await this.http.xConfigSet(deviceId, list);
    },
  };

  event = {
    on: (path: string, callback: EventListener) => {
      logger.info('Subscribing to xEvent ' + path);
      this.eventListeners.push({ path, callback });
    },
  };

  processNotification(data: DataObject) {
    const { deviceId, type } = data;
    const props = data?.changes?.updated;
    if (type === 'status' && props) {
      const notification = data as Notification;
      for (const [key, value] of Object.entries(props)) {
        this.statusListeners.forEach((listener) => {
          if (pathMatch(key, listener.path)) {
            listener.callback(deviceId, key, value as DataObject, notification);
          }
        });
        // console.log('status', `${shortName(deviceId)} => ${key}: ${value} (${timestamp})`);
      }
    } else if (type === 'events') {
      data.events.forEach((e: DataObject) => {
        const path = e.key;
        const event = e.value;
        this.eventListeners.forEach((listener) => {
          const notification = data as Notification;
          if (pathMatch(path, listener.path)) {
            listener.callback(deviceId, path, event, notification);
          }
        });
        // console.log('event', shortName(deviceId), path, JSON.toString(event), timestamp);
      });
    } else if (type === 'healthCheck') {
      console.log('xapi: got healt check message');
    } else {
      // console.log('Received unknown notifications', type, data);
      // handle: type: 'action', add listener for it
    }
  }
}

export default XapiImpl;
