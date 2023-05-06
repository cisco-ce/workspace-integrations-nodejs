/**
 * Entry point for this library. Initalises your Workspace integration and returns an integration object (async),
 * which you can then use for Webex APIs, including invoke commands, read status values,
 * set configs, subscribe to notifications, etc.
 *
 * Throws an exception if unable to connect.
 */
export type connect = (options: Deployment) => Promise<Integration>;

/**
 * Defines a public web hook where Webex will send notifications to you.
 */
interface Webhook {
  /** Must be https */
  targetUrl: string;

  /**
   * Passing 'none' will delete the web hook
   */
  type: 'hmac_signature' | 'basic_authentication' | 'none';

  /** This will be sent with every web hook. You can use it to verify that the web hook came from Webex. */
  secret: string;

  /** Username if using basic auth */
  username?: string;

  /** Password if using basic auth */
  password?: string;
}

/**
 * Error level works in an expanding way, eg 'error' will only show errors,
 * 'warn' will show warnings and errrors, etc.
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'verbose';

/**
 * Your configs for initialising your Workspace Integration. The clientId, clientSecret and jwt is
 * found when you deploy and active the integration in Control Hub.
 */
export interface Deployment {
  clientId: string;
  clientSecret: string;
  /** Base64 encoded, as copied from Control Hub when activated. */
  jwt: string;

  /**
   * How you want your integration to receive device notifications such as events
   * and status updates.
   *
   * - webhook: Webex posts the notification to a public web server that you control
   * - longpolling: Your integration using [long polling](https://javascript.info/long-polling)
   *   to get notifications.
   * - none: you won't receive any notifications
   */
  notifications: 'webhook' | 'longpolling' | 'none';
  webhook?: Webhook;

  /**
   * Public URL endpoint to send signed JWT actions, such as health check, app update, deactivation etc
   */
  actionsUrl?: string;

  /**
   * Which info to show from the SDK. Default is error only.
   */
  logLevel?: LogLevel;
}

export interface Notification {
  appId: string;
  deviceId: string;
  workspaceId: string;
  orgId: string;
  timestamp: string;
  type: 'status' | 'event' | 'healthCheck';
}

/**
 * Called when a device has an event that matches the path you are listening to.
 * Remember to add the path to the manifest xAPI event scope too.
 */
export type EventListener = (deviceId: string, path: string, event: DataObject, data: Notification) => void;

/**
 * Called when a device has a status update that matches the path you are listening to.
 * Remember to add the path to the manifest xAPI status scope too.
 */
export type StatusListener = (deviceId: string, path: string, value: DataObject, data: Notification) => void;

/**
 * Invoke a command on a Cisco device. Returns result as a promise.
 */
export type Command = (deviceId: string, path: string, params?: DataObject, multiline?: string) => Promise<DataObject>;

export type DataObject = Record<string, any>;

/**
 * Device statuses are typicially states, sensor data etc that can change at any time.
 */
export interface Status {
  get: (deviceId: string, path: string) => Promise<DataObject | number | string>;
  on: (path: string, listener: StatusListener) => void;
}

/**
 * Device events are typicially events that occur at a singular point in time and don't last
 * long, such as incoming button press on a UI extension, incoming call, system boot etc.
 * Workspace integrations only support a subset of all events,
 * see Control Hub > Workspace integrations for an updated list.
 */
export interface Event {
  on: (path: string, listener: EventListener) => void;
}

export interface Config {
  get: (deviceId: string, path: string) => Promise<DataObject | number | string>;

  /**
   * Requires the spark-admin:devices-write scope
   */
  set: (deviceId: string, path: string, value: string | number) => Promise<DataObject>;

  /**
   * Set multiple configs on a device with a single HTTP call. Requires the
   * spark-admin:devices-write scope.
   *
   * Configs are set as key/value pairs in an object. Remember to use apostrophes for
   * the keys too, since they usually contain dots.
   *
   * Eg:
   * ```
   * const configs = { 'Audio.DefaultVolume': 60, 'SystemUnit.TimeZone': 'Africa/Abidjan' };
   * await integration.xapi.config.setMany(deviceId, configs);
   * ```
   */
  setMany: (deviceId: string, values: DataObject) => Promise<DataObject>;
}

/**
 * Provides access to all the supported Webex APIs as child objects.
 * Automatically takes care of retrieving and refreshing access tokens,
 * as well as long polling for notifications, when that method is used.
 */
export interface Integration {
  getAppInfo(): AppInfo;
  onError(handler: ErrorHandler): any;
  processNotifications(notification: DataObject[]): void;
  refreshToken(): void;
  webexApi(partialUrl: string, method?: string, body?: any, contentType?: string): Promise<any>;

  devices: Devices;
  workspaces: Workspaces;
  xapi: XAPI;
}

/**
 * A workspace is a location that can contain zero, one or many devices,
 * typically a meeting room, huddle room, or reception.
 */
export interface Workspaces {
  getWorkspaces(filters?: DataObject): Promise<Workspace[]>;
  getWorkspace(workspaceId: string): Promise<Workspace>;
}

export interface Workspace {
  id: string;
  orgId: string;
  workspaceLocationId: string;
  displayName: string;
  sipAddress: string;
  capacity?: number;
  type: 'notSet' | 'focus' | 'huddle' | 'meetingRoom' | 'open' | 'desk' | 'other' | string;
  notes?: string;
  /** Whether the workspace supports hot desking or not */
  hotdeskingStatus: 'on' | 'off';
}

export interface Device {
  id: string;
  displayName: string;
  workspaceId: string;
  workspaceLocationId: string;
  orgId: string;
  product: string;
  /**
   * - roomdesk: Cisco collaboration device (Board, Room Kit, Desk etc)
   * - accessory: Cisco Navigator, etc
   * - webexgo: Webex Calling device
   */
  type: 'roomdesk' | 'accessory' | 'webexgo' | 'unknown';
  /** The person owning the device, if it's in personal mode. */
  personId?: string;
  tags: string[];
  ip: string;
  mac: string;
  /** Network connectivity type (LAN, wifi, ...) */
  activeInterface: string;
  primarySipUrl: string;
  errorCodes: string[];
  serial: string;
  software: string;
  upgradeChannel: string;
  connectionStatus: 'connected' | 'disconnected' | 'connected_with_issues' | string;
}

export interface Devices {
  getDevices(filters?: DataObject): Promise<Device[]>;
  getDevice(deviceId: string): Promise<Device>;
}

export interface Http {
  /**
   *
   * @param partialUrl URL without the https://webexapis.com/v1/ part
   */
  get(partialUrl: string): Promise<any>;
  fullUrl(partialUrl: string): string;
}

export interface XAPI {
  command: Command;
  status: Status;
  event: Event;
  config: Config;
}

export type ErrorHandler = (error: string) => any;
export type ReadyHandler = (xapi: XAPI) => any;

export interface AppInfo {
  id: string;
  manifestVersion: number;
  scopes: string[];
  roles: string[];
  xapiAccessKeys: {
    commands?: string[];
    statuses?: string[];
    events?: string[];
  };
  createdAt: string;
  updatedAt: string;
  provisioningState: string;
  publicLocationIds: string[];
  features?: Array<'digital_signage' | 'persistent_web_app'>;
  queue?: {
    pollUrl: string;
    state: string;
  };
  availability: string;
}
