import { Integration, ErrorHandler, Devices, Deployment, DataObject, Workspaces, AppInfo } from './types';
import { parseJwt, sleep } from './util';
import Http from './http';
import DevicesImpl from './apis/devices';
import WorkspacesImpl from './apis/workspaces';
import XapiImpl from './apis/xapi';
import { OAuthDetails } from './http';


class IntegrationImpl implements Integration {
  private http: Http;
  public devices: Devices;
  public workspaces: Workspaces;
  public xapi: XapiImpl;

  private errorHandler: ErrorHandler | null = null;
  private appInfo: AppInfo;
  private oauth: OAuthDetails;

  constructor(appInfo: AppInfo, accessToken: string, jwt: DataObject, oauth: OAuthDetails) {
    this.appInfo = appInfo;
    this.http = new Http(jwt.webexapisBaseUrl, accessToken);
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
    notifications.forEach((not) => this.xapi.processNotification(not));
  }

  static async connect(options: Deployment) {
    const { clientId, clientSecret, notifications } = options;

    const jwt = parseJwt(options.jwt);
    const { oauthUrl, refreshToken, appUrl } = jwt;

    const tokenData = await Http.getAccessToken({ clientId, clientSecret, oauthUrl, refreshToken });

    const appInfo = await Http.initIntegration({
      accessToken: tokenData.access_token,
      appUrl,
      notifications,
    });

    const { access_token, expires_in } = tokenData;
    const oauth = { clientId, clientSecret, oauthUrl, refreshToken };

    const integration = new IntegrationImpl(appInfo, access_token, jwt, oauth);

    // TODO move to constructor
    if (notifications === 'longpolling') {
      integration.pollData();
    }

    // TODO move to constructor
    const timeToRefresh = expires_in - 60 * 15;
    // console.log('token will be refreshed in ', (timeToRefresh / 60).toFixed(0), 'minutes');
    setTimeout(() => integration.refreshToken(), timeToRefresh * 1000);

    return integration;
  }

  async refreshToken() {
    const { clientId, clientSecret, oauthUrl, refreshToken } = this.oauth;

    try {
      const { access_token, expires_in } = await Http.getAccessToken({ clientId, clientSecret, oauthUrl, refreshToken });
      this.http.setAccessToken(access_token);
      const nextTime = expires_in - 60 * 15;
      // console.log('got new token', access_token, 'next in ', nextTime, 'sec');
      setTimeout(() => this.refreshToken(), nextTime * 1000);

    } catch (e) {
      if (this.errorHandler) {
        this.errorHandler('Not able to refresh token. ' + (e instanceof Error && e.message));
      }
    }
  }
}

export default IntegrationImpl;
