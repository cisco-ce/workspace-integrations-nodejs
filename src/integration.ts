import { Integration, ErrorHandler, Devices, IntegrationConfig, DataObject, Workspaces, AppInfo } from './types';
import { parseJwt, sleep } from './util';
import Http from './http';
import DevicesImpl from './apis/devices';
import WorkspacesImpl from './apis/workspaces';
import XapiImpl from './apis/xapi';
import { OAuthDetails } from './http';
import log from './logger';

function validateConfig(config: IntegrationConfig) {
  if (!config.clientId || !config.clientSecret || !config.activationCode) {
    throw new TypeError('Missing clientId, clientSecret or activationCode in config');
  }

  const jwt = parseJwt(config.activationCode);
  if (!jwt.oauthUrl || !jwt.webexapisBaseUrl) {
    throw new TypeError(
      'activationCode does not containt the expected data. Please provide it exactly as you copy it when activating it on Control Hub.',
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

  private errorHandler: ErrorHandler | null = null;
  private appInfo: AppInfo;
  private oauth: OAuthDetails;

  constructor(appInfo: AppInfo, accessToken: string, activationCode: DataObject, oauth: OAuthDetails) {
    this.appInfo = appInfo;
    this.http = new Http(activationCode.webexapisBaseUrl, accessToken);
    this.devices = new DevicesImpl(this.http);
    this.workspaces = new WorkspacesImpl(this.http);
    this.xapi = new XapiImpl(this.http);
    this.oauth = oauth;
  }

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  getAppInfo() {
    return this.appInfo;
  }

  webexApi(partialUrl: string, method?: string, body?: any, contentType?: string): Promise<any> {
    return this.http.webexApi(partialUrl, method, body, contentType);
  }

  async pollData() {
    const pollUrl = this.appInfo.queue?.pollUrl;
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
    notifications.forEach((not) => this.xapi.processNotification(not));
  }

  static async connect(options: IntegrationConfig) {
    validateConfig(options);
    const { clientId, clientSecret, notifications } = options;

    const jwt = parseJwt(options.activationCode);
    const { oauthUrl, refreshToken, appUrl } = jwt;

    const tokenData = await Http.createAccessToken({ clientId, clientSecret, oauthUrl, refreshToken });
    log.info('Got initial access token');

    const appInfo = await Http.initIntegration({
      accessToken: tokenData.access_token,
      appUrl,
      notifications,
    });
    log.info('Successfully initated integration');

    const { access_token, expires_in } = tokenData;
    const oauth = { clientId, clientSecret, oauthUrl, refreshToken };

    const integration = new IntegrationImpl(appInfo, access_token, jwt, oauth);

    // TODO move to constructor
    if (notifications === 'longpolling') {
      integration.pollData();
    }

    // TODO move to constructor
    const timeToRefresh = expires_in - 60 * 15;
    log.verbose(`Fetching new token on ${new Date(Date.now() + timeToRefresh * 1000)}`);
    // console.log('token will be refreshed in ', (timeToRefresh / 60).toFixed(0), 'minutes');
    setTimeout(() => integration.refreshToken(), timeToRefresh * 1000);

    return integration;
  }

  async refreshToken() {
    const { clientId, clientSecret, oauthUrl, refreshToken } = this.oauth;

    try {
      const { access_token, expires_in } = await Http.createAccessToken({
        clientId,
        clientSecret,
        oauthUrl,
        refreshToken,
      });
      this.http.setAccessToken(access_token);
      const nextTime = expires_in - 60 * 15;
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
