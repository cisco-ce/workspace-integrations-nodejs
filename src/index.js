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
    const now = new Date().toString().split('(').shift();
    // console.log(`\n${now} ACCESS TOKEN UPDATED / ${access_token}\n`);
    const nextTime = expires_in - (60 * 15);
    setTimeout(() => this.refreshToken(creds, xapi), nextTime * 1000);
  }

  async connect(options) {
    const { clientId, clientSecret, oauthUrl, refreshToken, appUrl, deployment } = options;

    const { access_token, expires_in } = await http.getAccessToken(
      clientId, clientSecret, oauthUrl, refreshToken);
    // console.log({ access_token, expires_in });

    const appInfo = await http.initIntegration(access_token, appUrl);

    const xapi = new XAPI(access_token, appInfo);

    if (deployment === 'longpolling') {
      const pollUrl = appInfo.queue?.pollUrl;
      xapi.pollData(pollUrl);
    }
    else {
      console.log('SDK currently only supports long polling');
      process.exit(1);
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
