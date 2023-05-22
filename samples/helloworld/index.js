const fs = require('fs');
const path = require('path');
const connect = require('workspace-integrations').default;

let config;
try {
  const file = path.join(__dirname, './config.json');
  config = JSON.parse(fs.readFileSync(file));
}
catch(e) {
  console.log('You need to provide a config.json file in the sample folder with OAuth details.');
  process.exit(1);
}

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
    // console.log('connected!', await integration.getAppInfo());
  }
  catch(e) {
    console.log('Not able to connect', e);
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
