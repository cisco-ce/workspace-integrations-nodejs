require('dotenv').config({ path: __dirname + '/.env' });
const { connect } = require('workspace-integrations');

const { env } = process;
const config = {
  clientId: env.CLIENT_ID,
  clientSecret: env.CLIENT_SECRET,
  activationCode: {
    oauthUrl: env.OAUTH_URL,
    refreshToken: env.REFRESH_TOKEN,
    webexapisBaseUrl: env.WEBEXAPIS_BASE_URL,
    appUrl: env.APP_URL,
  },
  notifications: 'longpolling',
  logLevel: 'info',
};

start(config);

function showAlertOnDevice(integration, deviceId, text) {
  return integration.xapi.command(deviceId, 'UserInterface.Message.Alert.Display', {
    Text: text, Duration: 5 });
}

async function start(creds) {
  let integration;
  try {
    integration = await connect(creds);
    integration.onError(console.error);
    console.log('connected!');
    integration.onAction(action => console.log('🔥 App update:', action));
    // console.log('connected!', await integration.getAppInfo());
  }
  catch(e) {
    console.log('Not able to connect', e.message);
    return;
  }

  try {
    const devices = await integration.devices.getDevices({ tag: 'wi-demo' });
    if (!devices.length) {
      console.error('No test device found');
      return;
    }

    const device = devices[0];

    await showAlertOnDevice(integration, device.id, `Hey, I'm ${device.displayName}`);
    console.log('Message shown on screen');
  }
  catch(e) {
    console.log(e);
  }
}
