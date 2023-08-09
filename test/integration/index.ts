/**
 * Integration test for library, used against actual org/integration deployement
 *
 * Does some hot testing one device too (but should go back to same state after)
 *
 * Assumptions:
 * - An integration (see manifest) deployed to a real org
 * - A device in that org with a tag matching a special test tag
 * - Some (benign) changes are made to the device, then immeidately reverted
 * - You need to provide the creds.json file in this folder
 *
 * To run (install ts-node globally):
 * `ts-node test/integration`
 */
import { connect } from '../../src';
import { IntegrationConfig, Integration, Device } from '../../src/types';
import { sleep } from '../../src/util';

require('dotenv').config({ path: __dirname + '/.env' });

// test will use this tag and use the first device with it for hot testing
const testTag = 'wi-demo';

function assert(check: any, message?: string) {
  if (!check) {
    throw new Error('🚨 Failed: ' + message);
  }
}

function equal(v1: any, v2: any, message?: string) {
  if (v1 !== v2) {
    throw new Error(`🚨 Failed: ${message}: \n${v1} !== ${v2}`);
  }
}

async function orgHasWorkspaces(int: Integration) {
  const list = await int.workspaces.getWorkspaces();
  assert(list.length > 5, 'Org has several workspaces');
}

async function orgHasDevices(int: Integration) {
  const list = await int.devices.getDevices();
  assert(list.length > 5, 'Org has several devices');
}

async function orgHasTestDevice(int: Integration) {
  const list = await int.devices.getDevices({ tag: testTag, connectionStatus: 'connected' });
  assert(list.length, 'Org has test device');
  return list[0];
}

async function canGetAppInfo(int: Integration) {
  const info = await int.getAppInfo();
  assert(info.id, 'App info has id');
  assert(info.manifestVersion > 0, 'App info has version');
}

async function deviceCanAdjustVolumeAndReadIt(int: Integration) {
  const device = await orgHasTestDevice(int) as Device;
  const original = (await int.xapi.status.get(device.id, 'Audio.Volume')) as number;
  await int.xapi.command(device.id, 'Audio.Volume.Set', { Level: 33 });
  const check = (await int.xapi.status.get(device.id, 'Audio.Volume')) as number;
  assert(check === 33, 'Volume was set');
  await int.xapi.command(device.id, 'Audio.Volume.Set', { Level: original });
}

async function deviceCanAdjustDefaultVolumeAndReadIt(int: Integration) {
  const device = await orgHasTestDevice(int) as Device;
  const original = (await int.xapi.config.get(device.id, 'Audio.DefaultVolume')) as number;
  await int.xapi.config.set(device.id, 'Audio.DefaultVolume', 33);
  const custom = (await int.xapi.config.get(device.id, 'Audio.DefaultVolume')) as number;
  assert(custom === 33);
  await int.xapi.config.set(device.id, 'Audio.DefaultVolume', original);
}

async function canReceiveEvents(int: Integration) {
  const device = await orgHasTestDevice(int) as Device;
  let event: any;
  int.xapi.event.on('UserInterface.Message.Prompt.Response', (_, __, _event) => {
    event = _event;
  });

  const choices = {
    FeedbackId: 'wi-test',
    'Option.1': 'test',
    Text: 'wi test - disregard',
    Duration: 10,
  };
  await int.xapi.command(device.id, 'UserInterface.Message.Prompt.Display', choices);
  await sleep(2000);
  const response = { FeedbackId: choices.FeedbackId, OptionId: 1 };
  await int.xapi.command(device.id, 'UserInterface.Message.Prompt.Response', response);
  await sleep(2000);
  equal(event?.FeedbackId, choices.FeedbackId, 'Got correct prompt event');
}

async function getsStandbyNotifications(int: Integration) {
  const device = await orgHasTestDevice(int) as Device;
  await int.xapi.command(device.id, 'Standby.Deactivate');
  await sleep(2000);
  let lastState;
  await int.xapi.status.on('Standby.State', (_, __, state) => {
    lastState = state;
  });
  const state = await int.xapi.status.get(device.id, 'Standby.State');
  equal(state, 'Off', 'Standby state off');
  await int.xapi.command(device.id, 'Standby.Activate');
  await sleep(2000);
  equal(lastState, 'Standby', 'Notified about standby change');
}

async function errorOnInvalidXapis(int: Integration) {
  const device = await orgHasTestDevice(int) as Device;
  let thrown = true;
  try {
    await int.xapi.command(device.id, 'Self.Destruct');
    thrown = false;
  }
  catch {}
  if (!thrown) {
    throw new Error('Error not thrown for invalid xCommand');
  }

  try {
    await int.xapi.status.get(device.id, 'Self.Destruct');
    thrown = false;
  }
  catch {}
  if (!thrown) {
    throw new Error('Error not thrown for invalid xCommand');
  }

  try {
    const v = await int.xapi.config.get(device.id, 'Self.Destruct');
    thrown = false;
  }
  catch {}
  if (!thrown) {
    throw new Error('Invalid xConfig didnt throw exception');
  }
}

async function canRefreshToken(int: Integration) {
  const device = await orgHasTestDevice(int) as Device;
  await int.xapi.status.get(device.id, 'Audio.Volume');
  await int.refreshToken();
  await int.xapi.status.get(device.id, 'Audio.Volume');
}

async function canUseCustomApis(int: Integration) {
  const data = await int.webexApi('people/');
  assert(data?.items?.length > 5, 'Was able to do custom API call');
}

async function run() {
  const {CLIENT_ID, CLIENT_SECRET, OAUTH_URL, REFRESH_TOKEN, WEBEXAPIS_BASE_URL, APP_URL } = process.env;
  const config = {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    activationCode: {
      oauthUrl: OAUTH_URL,
      refreshToken: REFRESH_TOKEN,
      webexapisBaseUrl: WEBEXAPIS_BASE_URL,
      appUrl: APP_URL,
    },
    notifications: 'longpolling',
  };

  console.log('Connecting integration and starting tests...');
  const integration = await connect(config as IntegrationConfig);
  const tests = [
    orgHasWorkspaces,
    orgHasDevices,
    orgHasTestDevice,
    canGetAppInfo,
    deviceCanAdjustVolumeAndReadIt,
    deviceCanAdjustDefaultVolumeAndReadIt,
    errorOnInvalidXapis,
    getsStandbyNotifications,
    canReceiveEvents,
    canRefreshToken,
    canUseCustomApis,
  ];

  let n = 0;
  for (const test of tests) {
    console.log(`Test ${++n}/${tests.length}: ${test.name}`);
    await test(integration);
  }
  console.log('✅ All integration tests succeeded');
}

async function go() {
  try {
    await run();
    // @ts-ignore
    process.exit(0);
  }
  catch(e) {
    console.log('Test failed: ', e);
    console.log('🚨 Integration test failed');
    // @ts-ignore
    process.exit(1);
  }
}

go();
