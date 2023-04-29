// const wi = require('workspace-integrations');
import { connect } from '../../src/index';
import { Deployment } from '../../src/types';

import(process.env.CREDS as string)
  .then(c => start(c))
  .catch(() => console.log('You need to specify credentials file'));

async function start(creds: Deployment) {
  try {
    const integration = await connect(creds);
    integration.onError(console.error);
    console.log('connected!', await integration.getAppInfo());

    // const devices = await integration.devices.get({ tag: 'wi-demo' });
    // integration.xapi.command(devices, 'UserInterface Message Alert Display', { Text: 'Hello World' });
  }
  catch(e) {
    console.log('Not able to connect');
  }
}
