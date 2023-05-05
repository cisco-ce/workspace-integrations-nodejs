/**
 * How to run:
 *
 * - Add a new integration to Control Hub
 *   (If you already created the integration for one of the other demos,
 *   you can re-use this and just upgrade the manifest)
 * - Upload (or update) the manifest with the manifest file in this folder
 * - Copy the app id and app secret and add it to a file (creds.json) in this
 *   sample folder (don't worry, it's ignored by Git)
 * - Activate the integration and copy the JWT and add it to the same file.
 *   Be sure to limit the integration to a location with few devices, to avoid
 *   too much impact.
 * - Run the integration with the creds.json file as input:
 *     cd samples/room-capacity-monitor
 *     CREDS=./creds.json node index.js
 *
 * Voila: Your integration should now connect and start receiving device data.
 */


// const wi = require('workspace-integrations');
const wi = require('../../lib/index.js');

// TODO: We may want to set or at least check if xconfig peoplecount outofcall is on

let creds;
try {
  creds = require(process.env.CREDS);
}
catch(e) {
  console.log('You need to specify a valid creds file with CREDS=...', e);
  process.exit(1);
}

let xapi;
const workspaces = {};

function showAlert(xapi, deviceId, title, text) {
  xapi.command(deviceId, 'UserInterface Message Alert Display', {
    Title: title,
    Text: text,
    Duration: 5,
  });
}

async function onPeopleCountChanged(deviceId, path, count, data) {
  const { workspaceId } = data;

  if (!workspaces[workspaceId]) {
    try {
      const workspace = await xapi.getWorkspace(workspaceId);
      workspaces[workspaceId] = workspace;
    }
    catch(e) {
      console.log(e);
    }
  }

  const workspace = workspaces[workspaceId];
  if (!workspace) {
    console.warn('not able to find workspace', workspaceId);
    return;
  }

  const { displayName, capacity } = workspace;
  console.log('-----> People count changed', displayName, path, count);

  if (count > capacity) {
    const msg = `Counted ${count} persons, this room only supports ${capacity}`;
    showAlert(xapi, deviceId, 'Too many people in room', msg);
  }
}

async function onConnect(_xapi) {
  xapi = _xapi;
  console.log('xapi ready!');
  xapi.status.on('RoomAnalytics.PeopleCount.Current', onPeopleCountChanged);
}

async function init() {
  await wi.connect(creds)
    .on('ready', onConnect)
    .on('error', e => console.log('Error!', e));
}

init();
