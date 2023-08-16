const { connect } = require('workspace-integrations');
const configs = require('./config.json');

configs.forEach(start);

async function start(org) {
  const { config } = org;
  console.log('connect to org:', org.name);

  let integration;
  try {
    integration = await connect(config);
    integration.onError(console.error);
    console.log('connected!');
  }
  catch(e) {
    console.log('Not able to connect', e.message);
    return;
  }


  const devices = await integration.devices.getDevices({ connectionStatus: 'connected' });
  const device = devices[0];

  try {
    const val = await integration.xapi.status.get(device.id, 'RoomAnalytics.PeopleCount.Current');
    console.log('People count', device.displayName, val);
  }
  catch(e) {
    console.log('Couldn\'t get count for ', device.displayName, org.name);
  }

  try {
    const val = await integration.xapi.config.get(device.id, 'Audio.DefaultVolume');
    console.log('Default volume', device.displayName, val);
  }
  catch(e) {
    console.log('Couldn\'t get config for ', device.displayName);
  }
}
