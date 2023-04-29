import { Integration, ErrorHandler, Deployment, DataObject } from './types';
import { parseJwt } from './util';
import Http from './http';

class IntegrationImpl implements Integration {

  private errorHandler: ErrorHandler | null = null;
  private appInfo: DataObject = {};
  private http: Http | null = null;

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  getAppInfo() {
    return this.appInfo;
  }

  async connect(options: Deployment) {
    const {
      clientId,
      clientSecret,
      notifications,
    } = options;

    const { oauthUrl, refreshToken, appUrl, webexapisBaseUrl } = parseJwt(options.jwt);

    let tokenData;

    tokenData = await Http.getAccessToken(clientId, clientSecret, oauthUrl, refreshToken);
    console.log('got access token', tokenData);

    this.appInfo = await Http.initIntegration({
      accessToken: tokenData.access_token,
      appUrl,
      notifications,
    });

    const { access_token, expires_in } = tokenData;

    this.http = new Http(webexapisBaseUrl, access_token);

    if (notifications === 'longpolling') {
      console.log('Integration is using long polling for events and status updates');
      const pollUrl = this.appInfo.queue?.pollUrl;
      // xapi.pollData(pollUrl);
    }
    else if (notifications === 'webhook') {
      console.log('Integrations is using web hooks for events and status updates');
    }
    else {
      console.log('Integration is not subscribing to notifications');
    }

    const timeToRefresh = expires_in - (60 * 15);
    console.log('token will be refreshed in ', (timeToRefresh/60).toFixed(0), 'minutes');
    setTimeout(() => this.refreshToken(options), timeToRefresh * 1000);

    return true;
  }

  async refreshToken(creds: any) {
    const { clientId, clientSecret, oauthUrl, refreshToken } = creds;

    try {
      const { access_token, expires_in } = await Http.getAccessToken(
        clientId, clientSecret, oauthUrl, refreshToken);
      if (this.http) {
        this.http.setAccessToken(access_token);
      }
      const nextTime = expires_in - (60 * 15);
      setTimeout(() => this.refreshToken(creds), nextTime * 1000);
    }
    catch(e) {
      if (this.errorHandler) {
        this.errorHandler('Not able to refresh token. ' + (e instanceof Error && e.message));
      }
    }
  }
}

export default IntegrationImpl;
