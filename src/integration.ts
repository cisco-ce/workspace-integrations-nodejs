import { AppConfig, Integration, ActionHandler, ErrorHandler, Devices, IntegrationConfig, DataObject, Workspaces, AppInfo } from './types';
import { sleep } from './util';
import Http from './http';
import DevicesImpl from './apis/devices';
import WorkspacesImpl from './apis/workspaces';
import XapiImpl from './apis/xapi';
import log from './logger';
import { decodeAndVerify } from './jwt';

function validateConfig(config: IntegrationConfig) {
  if (!config.clientId || !config.clientSecret || !config.activationCode) {
    throw new TypeError('Missing clientId, clientSecret or activationCode in config');
  }

  const jwt = config.activationCode;
  if (!jwt.oauthUrl || !jwt.webexapisBaseUrl) {
    throw new TypeError(
      'activationCode does not contain the expected data. Please decode it and provide the required attributes as a JSON object.'
    );
  }
  const known = ['clientId', 'clientSecret', 'activationCode', 'notifications', 'logLevel', 'webhook', 'actionsUrl'];
  Object.keys(config).forEach((key) => {
    if (!known.includes(key)) {
      log.error('Unknown config: ' + key);
    }
  });
}

class IntegrationImpl implements Integration {
  private http: Http;
  public devices: Devices;
  public workspaces: Workspaces;
  public xapi: XapiImpl;
  public tokenExpiryTime: string;

  private actionHandler: ActionHandler | null = null;
  private errorHandler: ErrorHandler | null = null;
  private appConfig: AppConfig;
  private appUrl: string;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    const { activationCode, accessToken, pollUrl } = appConfig;
    this.http = new Http(activationCode.webexapisBaseUrl, accessToken);
    this.devices = new DevicesImpl(this.http);
    this.workspaces = new WorkspacesImpl(this.http);
    this.xapi = new XapiImpl(this.http);
    this.appUrl = activationCode.appUrl;

    this.tokenExpiryTime = appConfig.tokenExpiryTime;
    const timeToExpiry = (new Date(this.tokenExpiryTime).getTime() - Date.now()) / 1000;
    const timeToRefresh = timeToExpiry - 60 * 15;
    log.verbose(`Fetching new token on ${new Date(Date.now() + timeToRefresh * 1000)}`);
    setTimeout(() => this.refreshToken(), timeToRefresh * 1000);

    if (pollUrl) {
      this.pollData(pollUrl);
    }
  }

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  onAction(handler: ActionHandler) {
    this.actionHandler = handler;
  }

  async getAppInfo() {
    return this.ping() as Promise<AppInfo>;
  }

  webexApi(partialUrl: string, method?: string, body?: any, contentType?: string): Promise<any> {
    return this.http.webexApi(partialUrl, method, body, contentType);
  }

  ping() {
    return this.http.ping(this.appUrl);
  }

  decodeJwt(jwt: string): DataObject {
    return decodeAndVerify(jwt);
  }

  serialize(): DataObject {
    return this.appConfig;
  }

  static deserialize(obj: AppConfig) {
    return new IntegrationImpl(obj);
  }

  async pollData(pollUrl: string) {
    if (!pollUrl) return;

    while (true) {
      let data;
      try {
        data = await this.http.pollDeviceData(pollUrl);
      } catch (e) {
        console.log('Error polling', e);
        const WaitAfterError = 5000;
        await sleep(WaitAfterError);
      }
      if (data) {
        this.processNotifications(data?.messages);
      }
    }
  }

  processNotifications(notifications: DataObject[]) {
    log.verbose(`Got ${notifications.length} notifications`);
    notifications.forEach((n) => {
      if (n.type === 'action') {
        this.decodeAndNotifyAction(n);
      }
      else {
        this.xapi.processNotification(n);
      }
    });
  }

  async decodeAndNotifyAction(action: DataObject) {
    if (!this.actionHandler) return;

    const { jwt } = action;
    const res = await decodeAndVerify(jwt) as DataObject;
    if (res) {
      this.actionHandler(res);
    }
    else {
      log.error('Not able to verify action message!');
    }
  }

  static async connect(options: IntegrationConfig) {
    validateConfig(options);
    const { clientId, clientSecret, notifications, webhook, actionsUrl, activationCode } = options;

    const { oauthUrl, refreshToken, appUrl } = activationCode;

    const tokenData = await Http.createAccessToken({ clientId, clientSecret, oauthUrl, refreshToken });
    log.info('Got initial access token');

    const appInfo = await Http.initIntegration({
      accessToken: tokenData.access_token,
      appUrl,
      notifications,
      webhook,
      actionsUrl,
    });
    log.info('Successfully initiated integration');

    const { access_token, expires_in } = tokenData;

    const tokenExpiryTime = new Date(Date.now() + (expires_in * 1000)).toISOString();
    const config = {
      appId: clientId,
      appSecret: clientSecret,
      accessToken: access_token,
      activationCode, tokenExpiryTime,
    } as AppConfig;

    if (notifications === 'longpolling') {
      config.pollUrl = appInfo.queue?.pollUrl;
    }

    const integration = new IntegrationImpl(config);

    return integration;
  }

  async refreshToken() {
    const { oauthUrl, refreshToken } = this.appConfig.activationCode;

    try {
      const { access_token, expires_in } = await Http.createAccessToken({
        clientId: this.appConfig.appId,
        clientSecret: this.appConfig.appSecret,
        oauthUrl,
        refreshToken,
      });
      this.http.setAccessToken(access_token);
      const nextTime = expires_in - 60 * 15;
      this.tokenExpiryTime = new Date(Date.now() + (expires_in * 1000)).toISOString();
      log.info('Fetched new access token');
      log.verbose(`Fetching new token on ${new Date(Date.now() + nextTime * 1000)}`);

      setTimeout(() => this.refreshToken(), nextTime * 1000);
    } catch (e) {
      log.error('Unable to refresh token');
      if (this.errorHandler) {
        this.errorHandler('Not able to refresh token. ' + (e instanceof Error && e.message));
      }
    }
  }
}

export default IntegrationImpl;
