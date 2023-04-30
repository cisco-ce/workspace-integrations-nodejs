interface Webhook {
  targetUrl: string;
  type: string;
  secret: string;
}

/**
 * Your configs for initialising your Workspace Integration. The clientId, clientSecret and jwt is
 * found when you deploy and active the integration in Control Hub.
 */
export interface Deployment {
  clientId: string;
  clientSecret: string;
  jwt: string;

  /**
   * How you want your integration to receive device notifications such as events and status updates.
   *
   * - webhook: Webex posts the notification to a public web server that you control
   * - longpolling: Your integration using [long polling](https://javascript.info/long-polling)
   *   to get notifications.
   * - none: you won't receive any notifications
   */
  notifications: 'webhook' | 'longpolling' | 'none';
  webhook?: Webhook;
  actionsUrl?: string;
}

export type EventListener = (deviceId: string, path: string, event: DataObject, data: DataObject) => void;

export type StatusListener = EventListener;

export type Command = (deviceId: string, path: string, params: DataObject, multiline: string) => Promise<DataObject>;

export type DataObject = Record<string, any>;

export interface Status {
  get: (deviceId: string, path: string) => Promise<DataObject>;
  on: (path: string, listener: StatusListener) => void;
}

export interface Event {
  on: (path: string, listener: EventListener) => void;
}

export interface Config {
  get: (deviceId: string, path: string) => Promise<DataObject>;
  set: (deviceId: string, path: string | DataObject, value: any) => Promise<DataObject>;
  setMany: (deviceId: string, values: DataObject) => Promise<DataObject>;
}

export interface Integration {
  getAppInfo(): DataObject;
  onError(handler: ErrorHandler): any;
  processNotifications(notification: DataObject[]): void;
  devices: Devices;
  workspaces: Workspaces;
}

export interface Workspaces {
  getWorkspaces(filters?: DataObject): Promise<any[]>;
}

export interface Devices {
  getDevices(filters?: DataObject): Promise<any[]>;
}

export interface Http {
  get(url: string): Promise<any>;
}

export interface XAPI {
  command: Command;
  status: Status;
  event: Event;
  config: Config;
  getDevices(location: string, filters: DataObject): Promise<Array<any>>;
  getLocations(): string[];
  getAppInfo(): DataObject;
  deviceDetails(deviceId: string): Promise<DataObject>;
  processIncomingData(data: DataObject): void;
  getAccessToken(): string;
  setAccessToken(token: string): void;
}

export type ErrorHandler = (error: string) => any;
export type ReadyHandler = (xapi: XAPI) => any;
