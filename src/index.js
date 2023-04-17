const XAPI = require('./xapi');
const http = require('./http');

function atob(base64) {
  return Buffer.from(base64, 'base64').toString('ascii');
}

function parseJwt(jwt) {
  const payloadB64 = jwt.split('.')[1];
  return JSON.parse(atob(payloadB64));
}

class Connector {

  onError = null;
  onReady = null;

  // Periodically (typically every 24h) we need to refresh the token
  async refreshToken(creds, xapi) {
    const { clientId, clientSecret, oauthUrl, refreshToken } = creds;

    const { access_token, expires_in } = await http.getAccessToken(
      clientId, clientSecret, oauthUrl, refreshToken);
    xapi.setAccessToken(access_token);
    // console.log(`\n${now} ACCESS TOKEN UPDATED / ${access_token}\n`);
    const nextTime = expires_in - (60 * 15);
    setTimeout(() => this.refreshToken(creds, xapi), nextTime * 1000);
  }

  async connect(options) {
    const {
      clientId,
      clientSecret,
      oauthUrl,
      refreshToken,
      appUrl,
      deployment,
    } = options;

    let tokenData;
    let appInfo;

    try {
      tokenData = await http.getAccessToken(clientId, clientSecret, oauthUrl, refreshToken);
      appInfo = await http.initIntegration(tokenData.access_token, appUrl, deployment);
    }
    catch(e) {
      if (this.onError) {
        this.onError('Not able to initialise integration. Incorrect credentials?');
      }
      return;
    }

    const { access_token, expires_in } = tokenData;
    const xapi = new XAPI(access_token, appInfo);

    if (deployment === 'longpolling') {
      console.log('Integration is using long polling for events and status updates');
      const pollUrl = appInfo.queue?.pollUrl;
      xapi.pollData(pollUrl);
    }
    else {
      console.log('Integrations is using web hooks for events and status updates');
    }

    const timeToRefresh = expires_in - (60 * 15);
    setTimeout(() => this.refreshToken(options, xapi), timeToRefresh * 1000);

    if (this.onReady) {
      this.onReady(xapi);
    }
  }

  on(type, callback) {
    if (type === 'ready') {
      this.onReady = callback;
    }
    else if (type === 'error') {
      this.onError = callback;
    }
    return this;
  }
}

function connect(options) {
  const { clientId, clientSecret, jwt } = options;

  if (!clientId || !clientSecret || !jwt) {
    throw new Error('Missing clientId, clientSecret or jwt in options');
  }

  const creds = Object.assign(options, parseJwt(jwt));
  const connector = new Connector(creds);

  // call after client has set error handler etc
  setTimeout(() => connector.connect(options), 0);

  return connector;
}

module.exports = { connect };
