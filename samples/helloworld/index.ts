// const wi = require('workspace-integrations');
import { connect } from '../../src/index';
import { Deployment } from '../../src/types';

// @ts-ignore
import(process.env.CREDS)
  .then(c => start(c))
  .catch(() => console.log('You need to specify credentials file'));

async function start(creds: Deployment) {
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
    const devices = await integration.devices.getDevices(); //'', { tag: 'wi-demo' });
    console.log('Found', devices.length, 'devices');
    const workspaces = await integration.workspaces.getWorkspaces();
    console.log('Found', workspaces.length, 'workspaces');
    // integration.xapi.command(devices, 'UserInterface Message Alert Display', { Text: 'Hello World' });
  }
  catch(e) {
    console.log(e);
  }
}
