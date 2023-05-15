/**
 * Entry point for this library. Initalises your Workspace integration and returns an integration object (async),
 * which you can then use for Webex APIs, including invoke commands, read status values,
 * set configs, subscribe to notifications, etc.
 *
 * Throws an exception if unable to connect.
 */
export type connect = (options: IntegrationConfig) => Promise<Integration>;

/**
 * Defines a public web hook where Webex will send notifications to you for status changes and events on devices.
 */
export interface Webhook {
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
 * Your configs for initialising your Workspace Integration.
 * Must containt client id and secret, which you get when deploying the integration in Control Hub,
 * as well as the JSON Web Token (jwt) which you get when you activate it.
 */
export interface IntegrationConfig {
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

  /** Required if you set {@link notifications} to `webhook`. */
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

/**
 * A notification sent to your integration from Webex, either when an xStatus changes or when
 * an xEvent occurs. Remember that you will only receive notifications for APIs you have set
 * in your manifest.
 */
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
 * All xAPIs are defined by a path in a tree fashion, eg:
 *
 * - xCommand Call Disconnect
 * - xConfiguration Audio DefaultVolume
 * - xStatus Audio Volume
 * - xEvent UserInterface Extensions Widget Action
 *
 * In this SDK, the type (command, event etc) is not necessary because it's given by the context.
 * You can also use . or space as path separator (`Call.Disconnect` or `Call Disconnect`).
 */
export type XapiPath = string;

/**
 * The API of the Cisco collaboration devices (RoomOS).
 *
 * Read more on [roomos.cisco.com](https://roomos.cisco.com/doc/TechDocs/Introduction).
 *
 * All xAPIS are accessed with a path, for example `Call.Disconnect`, `Audio.Volume` etc. Find the
 * the xAPIs that you need in the [xAPI section](https://roomos.cisco.com/xapi) and copy the path
 * from the snippet section.
 *
 * Status, commands and events that you use needs to be specified in the manifest, but this does
 * not apply for configurations (for historical reasons).
 */
export interface XAPI {
  command: Command;
  status: Status;
  event: Event;
  config: Config;
}

/**
 * Invoke a command on a Cisco device. Commands are typically non-persistent actions that users do
 * from the user interface, such as starting a call, changing the volume etc. Also advanced
 * configurations such as saving macros and setting custom wallpaper can be commands.
 *
 * Some commands such as Phonebook search also returns results back to the user, this is provided
 * as a promise result.
 *
 * @param multiline For commands that accept large blobs of content, such as wallpaper image,
 * macro content, booking XML etc. *
 */
export type Command = (deviceId: string, path: XapiPath, params?: DataObject, multiline?: string) => Promise<DataObject>;

/**
 * A generic dictionary object (JSON-like)
 */
export type DataObject = Record<string, any>;

/**
 * Device statuses are typicially states, sensor data etc that can change at any time.
 * There are two ways to get status info:
 * 1. Query them (`get`)
 * 2. Subscribe to them (`on`). In this case you will be notified whenever a status changes.
 * Note: Only a few statuses actually support notifications.
 */
export interface Status {
  get: (deviceId: string, path: XapiPath) => Promise<DataObject | number | string>;
  on: (path: XapiPath, listener: StatusListener) => void;
}

/**
 * Device events are typicially events that occur at a singular point in time and don't last
 * long, such as incoming button press on a UI extension, incoming call, system boot etc.
 * Workspace integrations only support a subset of all events,
 * see Control Hub > Workspace integrations for an updated list.
 */
export interface Event {
  on: (path: XapiPath, listener: EventListener) => void;
}

/**
 * Device configurations (xConfigs) are typically permanent settings that are set by admins,
 * such as default volume, wallpapers, digital signage, network settings, security policies etc.
 *
 * Find and read more about them on
 * [roomos.cisco.com](https://roomos.cisco.com/xapi/?search=***&Type=Configuration).
 *
 * Scopes required: `spark-admin:devices_read` and `spark-admin:devices_write`
 *
 * The module is a wrapper fot for the
 * [Device Configurations API](https://developer.webex.com/docs/api/v1/device-configurations).
 *
 * It is not possible to subscribe to config notifications. Also, unlike device status and events,
 * you do not need to add the specific configs to the manifest.
 */
export interface Config {
  get: (deviceId: string, path: XapiPath) => Promise<DataObject | number | string>;

  /**
   * Requires the spark-admin:devices-write scope
   */
  set: (deviceId: string, path: XapiPath, value: string | number) => Promise<DataObject>;

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
  /**
   * Sets an error handler on the integration, so you are notified when something goes wrong.
   * This will typically be called if the SDK is not able to refresh the access token
   * eg due to network issues or if Webex is not available.
   */
  onError(handler: ErrorHandler): any;

  /**
   * Takes a list of events from Webex and checks if you have event listeners registered that
   * match the incoming notification, and if so deliver it.
   *
   * @param notifications The payload (list of messages) from an incoming Webex web hook
   */
  processNotifications(notifications: DataObject[]): any;
  refreshToken(): void;
  webexApi(partialUrl: string, method?: string, body?: any, contentType?: string): Promise<any>;

  devices: Devices;
  workspaces: Workspaces;
  xapi: XAPI;
}

export interface Http {
  /**
   *
   * @param partialUrl URL without the https://webexapis.com/v1/ part
   */
  get(partialUrl: string): Promise<any>;
}

/**
 * A workspace is a location that can contain zero, one or many devices,
 * typically a meeting room, huddle room, or reception.
 *
 * Module is a wrapper for the
 * [Webex Workspaces API](https://developer.webex.com/docs/api/v1/workspaces).
 */
export interface Workspaces {

  /**
   * Find workspaces in the org.
   *
   * @param filter See query parameters on [here](https://developer.webex.com/docs/api/v1/workspaces/list-workspaces)
   */
  getWorkspaces(filters?: DataObject): Promise<Workspace[]>;

  /**
   * Get workspace details.
   * Wrapper for https://developer.webex.com/docs/api/v1/workspaces/get-workspace-details for more
   */
  getWorkspace(workspaceId: string): Promise<Workspace>;
}

/**
 * A Workspace is typically a room. It can contain zero, one or several Cisco devices.
 */
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

/**
 * A Cisco collaboration device. Must belong to one and only one workspace.
 */
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

export type ErrorHandler = (error: string) => any;

/**
 * Info about your integration. Contains much of the information provided by the manifest.
 * In particular, use this to check which optional scopes and xAPI's the admin has acccepted.
 */
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
