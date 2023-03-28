# Workspace Integrations

Node.js SDK for creating [Webex Workspace Integrations](https://developer.webex.com/docs/api/guides/workspace-integrations-guide).

The SDK is designed to be as similar to the [macros](https://roomos.cisco.com/doc/TechDocs/MacroTutorial) and [JSXAPI](https://github.com/cisco-ce/jsxapi) syntax as possible, so developers that are experienced with that can easily start using Workspace Integrations too, and possibly port macros etc.

What this SDK gives you:

* Quick and easy to set up, just plug in the integration credentials get from Control Hub
* Automatically handles access tokens for you
* Automatically refreshes the access token when necessary
* Object-oriented API, no need to deal with HTTP calls
* JSXAPI-like syntax for
  * querying devices for status and config values
  * invoking command on devices
  * subscribing to events and status changes on the devices
* A few samples to get you started

## Installation

Install as any npm package:

```
npm install --save workspace-integrations
```

## Getting started

Show a message on the device screen each time the people count changes:

```
const wi = require('workspace-integrations');

// You get this when you create the integration on ControlHub > Workspaces > Integrations
const creds = {
  clientId: 'xxx',
  clientSecret: 'yyy',
  jwt: 'zzz',
  deployment: 'longpolling',
};

wi
  .connect(creds)
  .on('ready', onConnect)
  .on('error', e => console.log('An error occured', e));

function onConnect(xapi) {
  xapi.event.on('RoomAnalytics PeopleCount Current', (deviceId, name, value) => {
    const args = {
      Text: `People in room: ${value}`,
      Duration: 5,
    };
    xapi.command(deviceId, 'UserInterface Message Alert Display', args);
  }
}
```

Notice that unlike macros and the JSXAPI, the workspace integration also needs to specify device id.

Be aware that any API used in a workspace integration also needs to be specified in the manifest. Specifiying it in code is not enough be itself, and the SDK will not throw any errors if you for example subscribe to a status change that is not listed in the manifest.

A couple of more syntax examples (the `xapi` and `deviceId` is found similar to the above example):

```
// Get current volume:
xapi.status.get(deviceId, 'Audio Volume')
  .then(volume => console.log('Volume:', volume));

// Save a macro (multi-line data):
const macroContent =  '// macro data here\n //Line 2';
try {
  xapi.command(deviceId, 'Macros Macro Save', { Name: 'mymacro' }, macroContent);
}
catch(e) {
  console.log('Not able to write macro', e);
}

// Subscribe to analytics data
// Note: Don't use star as wildcard, it supports partial match similar to JSXAPI
xapi.status.on('RoomAnalytics', (deviceId, name, value) => {
  console.log('Room Analytics updated', name, value);
});

// Read a config:
xapi.config.get(deviceId, 'RoomAnalytics.PeoplePresenceDetector')
  .then(mode => console.log('Detector:', mode));

// Set a config
// NOTE: Requires the spark-admin:devices_write scope to be set in the manifest
try {
  await xapi.config.set(deviceId, 'RoomAnalytics.PeoplePresenceDetector', 'On');
}
catch(e) {
  console.log('Not able to set config', e);
}
```

## Discovering devices

The SDK also allow you to find devices in your organisation.

```
// Show all devices in your org:
const devices = await xapi.getDevices();
const names = devices.map(d => `${d.displayName} (${d.product} ${d.type})`);
console.log(names);

// Get the devices in the location that your integration has been enabled for
xapi.getLocations().forEach(async (locationId) => {
  const devices = await xapi.getDevices(locationId, { type: 'roomdesk' });
  console.log(devices);
});

// the filterting options (like 'roomdesk') are the same as described on
// https://developer.webex.com/docs/api/v1/devices/list-devices
```

## Necessary API scopes

For the SDK to work, you typically need to add the following API scopes to your manifest:

* spark-admin:devices_read
* spark-admin:workspaces_read
* spark:xapi_statuses
* spark:xapi_commands

You can also update device configurations if you use **spark-admin:devices_write**, but this is not recommended for public/global integrations(admins will probably be hesitant to allow integrations that require this).

## Limitations

It's important to be aware of the following limitations:

* There's a limited set of statuses and events you can subscribe to, such as room analytics and user interface extensions actions (see Control Hub for the full list) - though you can still query all of them.

* On personal devices, you cannot use APIs that are listed as privacy impacting (see roomos.cisco.com/xapi to verify the APIs).

* If your integration has been allowed for only certain locations, you will still be able to list all the devices in the org, but only invoke commands and statuses for the device in the allowed locations. Other devices will return 403 Forbidden.

## Useful resources

* [Workspace Integrations Guide](https://developer.webex.com/docs/api/guides/workspace-integrations-guide)
* [Introduction to the xAPI](https://roomos.cisco.com/doc/TechDocs/xAPI)
* [RoomOS xAPI reference](https://roomos.cisco.com/xapi)

