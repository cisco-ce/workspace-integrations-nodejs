// const wi = require('workspace-integrations');
import connect from '../../src/index';
import { IntegrationConfig, Integration } from '../../src/types';

// @ts-ignore
import(process.env.CREDS)
  .then(c => start(c))
  .catch(() => console.log('You need to specify credentials file'));

function showAlertOnDevice(integration: Integration, deviceId: string, text: string) {
  return integration.xapi.command(deviceId, 'UserInterface.Message.Alert.Display', {
    Text: text, Duration: 5 });
}

async function start(creds: IntegrationConfig) {
  let integration: Integration;
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
