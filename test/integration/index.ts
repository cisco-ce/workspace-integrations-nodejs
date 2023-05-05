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
import connect from '../../src';
import { Deployment, Integration } from '../../src/types';
import { sleep } from '../../src/util';
// @ts-ignore
import fetch from 'node-fetch';

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
  const list = await int.devices.getDevices({ tag: testTag });
  assert(list.length, 'Org has test device');
  return list[0];
}

async function canGetAppInfo(int: Integration) {
  const info = await int.getAppInfo();
  assert(info.id, 'App info has id');
  assert(info.manifestVersion > 0, 'App info has version');
}

async function deviceCanAdjustVolumeAndReadIt(int: Integration) {
  const device = await orgHasTestDevice(int);
  const original = (await int.xapi.status.get(device.id, 'Audio.Volume')) as number;
  await int.xapi.command(device.id, 'Audio.Volume.Set', { Level: 33 });
  const check = (await int.xapi.status.get(device.id, 'Audio.Volume')) as number;
  assert(check === 33, 'Volume was set');
  await int.xapi.command(device.id, 'Audio.Volume.Set', { Level: original });
}

async function deviceCanAdjustDefaultVolumeAndReadIt(int: Integration) {
  const device = await orgHasTestDevice(int);
  const original = (await int.xapi.config.get(device.id, 'Audio.DefaultVolume')) as number;
  await int.xapi.config.set(device.id, 'Audio.DefaultVolume', 33);
  const custom = (await int.xapi.config.get(device.id, 'Audio.DefaultVolume')) as number;
  assert(custom === 33);
  await int.xapi.config.set(device.id, 'Audio.DefaultVolume', original);
}

async function canReceiveEvents(int: Integration) {
  const device = await orgHasTestDevice(int);
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
  await sleep(1000);
  const response = { FeedbackId: choices.FeedbackId, OptionId: 1 };
  await int.xapi.command(device.id, 'UserInterface.Message.Prompt.Response', response);
  await sleep(1000);
  equal(event?.FeedbackId, choices.FeedbackId, 'Got correct prompt event');
}

async function getsStandbyNotifications(int: Integration) {
  const device = await orgHasTestDevice(int);
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
  const device = await orgHasTestDevice(int);
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
  const device = await orgHasTestDevice(int);
  await int.xapi.status.get(device.id, 'Audio.Volume');
  await int.refreshToken();
  await int.xapi.status.get(device.id, 'Audio.Volume');
}

async function canUseCustomApis(int: Integration) {
  const data = await int.webexApi('people/');
  assert(data?.items?.length > 5, 'Was able to do custom API call');
}

async function run() {
  // @ts-ignore
  const creds = await import('./creds.json');
  console.log('Connecting integration and starting tests...');
  const integration = await connect(creds as Deployment);
  await orgHasWorkspaces(integration);
  await orgHasDevices(integration);
  await orgHasTestDevice(integration);
  await canGetAppInfo(integration);
  await deviceCanAdjustVolumeAndReadIt(integration);
  await deviceCanAdjustDefaultVolumeAndReadIt(integration);
  await errorOnInvalidXapis(integration);
  await getsStandbyNotifications(integration);
  await canReceiveEvents(integration);
  await canRefreshToken(integration);
  await canUseCustomApis(integration);
  console.log('✅ All integration tests succeeded');
}

async function go() {
  try {
    await run();
  }
  catch(e) {
    console.log('Test failed: ', e);
    console.log('🚨 Integration test failed');
  }
  finally {
    process.exit();
  }
}

go();
