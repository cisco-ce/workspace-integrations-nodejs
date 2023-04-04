# Workspace Integrations

Node.js SDK for creating [Webex Workspace Integrations](https://developer.webex.com/docs/api/guides/workspace-integrations-guide).

The workspace integrations is a cloud based framework that lets you connect to the Cisco devices, receive sensor data, invoke commands, read status values and update configs in a secure and controlled manner, without installing anything on the devices.

The SDK is designed to be similar to the [macros](https://roomos.cisco.com/doc/TechDocs/MacroTutorial) and [JSXAPI](https://github.com/cisco-ce/jsxapi) syntax, so developers that are experienced with that can easily start using Workspace Integrations too.

What this SDK gives you:

* Quick and easy to set up, just plug in the integration credentials get from Control Hub
* Automatically handles access tokens for you
* Automatically refreshes the access token when necessary
* Object-oriented API, no need to deal with HTTP calls
* Access device data:
  * Querying for status
  * Getting and setting device configurations
  * Invoking commands
  * Subscribing to events and status changes

## Installation

Install as any npm package:

```
npm install --save workspace-integrations
```

## Getting started

Show a message on the device screen each time the people count changes:

```js
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

Be aware that any status, event or command used in a workspace integration also needs to be specified in the manifest. Specifiying it in code is not enough be itself, and the SDK will not throw any errors if you for example subscribe to a status change that is not listed in the manifest.

You can find a graphical editor for the manifest that makes this easier on [https://cisco-ce.github.io/workspace-integrations-editor/](https://cisco-ce.github.io/workspace-integrations-editor/).

A couple of more syntax examples (the `xapi` and `deviceId` is found similar to the above example):

```js
// Get current volume:
const value = await xapi.status.get(deviceId, 'Audio Volume');
console.log('Volume:', volume);


// Subscribe to analytics data
// Note: Don't use star as wildcard, it supports partial match similar to JSXAPI
xapi.status.on('RoomAnalytics', (deviceId, name, value) => {
  console.log('Room Analytics updated', name, value);
});
```



## Command details

Sometimes you may need the result of commands. This is returned as a normal async answer.

```js
// Search the phone book:
const res = await xapi.command(device, 'Phonebook Search', { PhonebookType: 'Local', Limit: 10 });
console.log('phonebook', res.Contact);
```

Commands with multi-line content (such as images, xml or other data blobs) can be set using the fourth parameter:

```js
const data = 'const data = 1; \n const moreData = 2;';
try {
  await xapi.command(deviceId, 'Macros Macro Save', { Name: 'mymacro' }, data);
}
catch(e) {
  console.log('Not able to write macro', e);
}
```

## Configurations

Note: setting a configuration requires the **spark-admin:devices_write** scope to be set in the manifest.

```js
// Read a config:
const mode = await xapi.config.get(deviceId, 'RoomAnalytics.PeoplePresenceDetector')
console.log('Detector:', mode);

// Set a config
// NOTE:
try {
  await xapi.config.set(deviceId, 'RoomAnalytics.PeoplePresenceDetector', 'On');
}
catch(e) {
  console.log('Not able to set config', e);
}
```

You can also set multiple configs in one go, by passing an object instead of a path:

```js
const configs = {
  'Audio.Ultrasound.MaxVolume': 0,
  'Audio.DefaultVolume': 33,
  'Audio.SoundsAndAlerts.RingVolume': 66,
};
await xapi.config.set(device, configs);
```

Note that the configuration apis do not actually need to be specified in the manifest. Unlike status, commands and statuses there is no granular control.

## Discovering devices

The SDK also allow you to find devices in your organisation.

```js
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

You can also update device configurations if you use **spark-admin:devices_write*.

## Limitations

Pleade be aware of the following limitations:

* There's a limited set of statuses and events you can subscribe to, such as room analytics and user interface extensions actions (see Control Hub for the full list) - though you can still query all of them.

* On personal devices, you cannot use APIs that are listed as privacy impacting (see roomos.cisco.com/xapi to verify the APIs).

* If your integration has been allowed for only certain locations, you will still be able to list all the devices in the org and manipulate configs, but only invoke commands and statuses for the device in the allowed locations. Other devices will return 403 Forbidden.

## Useful resources

* [Workspace Integrations Guide](https://developer.webex.com/docs/api/guides/workspace-integrations-guide)
* [Introduction to the xAPI](https://roomos.cisco.com/doc/TechDocs/xAPI)
* [RoomOS xAPI reference](https://roomos.cisco.com/xapi)
* [Manifest editor](https://cisco-ce.github.io/workspace-integrations-editor/)

