# Workspace Integrations

Node.js SDK for creating [Webex Workspace Integrations](https://developer.webex.com/docs/workspace-integrations).

![Poster](./poster.png)

The workspace integrations is a cloud based framework that lets you connect to the Cisco devices, receive sensor data, invoke commands, read status values and update configs in a secure and controlled manner, without installing anything on the devices.

> **Warning**
> This SDK is in progress and not yet at version 1.0. Changes in the API must be expected.
> Also, there may be errors and typos in examples and documentation.
> Be sure to use the Github Issues to give feedback.


The SDK is designed to be similar to the [macros](https://roomos.cisco.com/doc/TechDocs/MacroTutorial) and [JSXAPI](https://github.com/cisco-ce/jsxapi) syntax, so developers that are experienced with that can easily start using Workspace Integrations too.

## Features

* Quick and easy to set up, just plug in the OAuth details you get from Control Hub
* Automatically handles access tokens for you, including refreshing it on time
* Object-oriented API, no need to deal with HTTP calls
* Access device data:
  * Querying for status
  * Getting and setting device configurations
  * Invoking commands
  * Subscribing to events and status changes
* Support for both long polling and web hook for events and status updates

[See full API reference here](https://cisco-ce.github.io/workspace-integrations-nodejs/).


## Installation

Install as any npm package:

```
npm install --save workspace-integrations
```

## Getting started

Show a message on the device screen each time the people count changes:

```js
const { connect } = require('workspace-integrations');

// You get this when you deploy and activate the integration on ControlHub > Workspaces > Integrations
const config = {
  clientId: "C12ba...",
  clientSecret: "fdbcd00...",
  jwt: "eyJraWQiOiJQSnM..."
  notifications: 'longpolling',
};

async function init() {
  try {
    const integration = await connect(config);
    integration.xapi.status.on('RoomAnalytics PeopleCount Current', (deviceId, path, value) => {
      const msg = `Number of people in the room: ${value}`;
      showMessageOnScreen(integration.xapi, deviceId, msg);
    });
  }
  catch(e) {
    console.log('Something went wrong', e);
  }
}

function showMessageOnScreen(xapi, deviceId, text) {
   const args = {
     Text: text,
     Duration: 5,
   };
   xapi.command(deviceId, 'UserInterface Message Alert Display', args);
}

init();
```

Be aware that any status, event or command used in a workspace integration also needs to be specified in the manifest. Specifying it in code is not enough be itself, and the SDK will not throw any errors if you for example subscribe to a status change that is not listed in the manifest.

You can find a graphical editor for the manifest that makes this easier on [https://cisco-ce.github.io/workspace-integrations-editor/](https://cisco-ce.github.io/workspace-integrations-editor/).

A couple of more syntax examples (the `xapi` and `deviceId` is found similar to the above example):

```js
// Get current volume:
const value = await integration.xapi.status.get(deviceId, 'Audio Volume');
console.log('Volume:', volume);


// Subscribe to analytics data
// Note: Don't use star as wildcard, it supports partial match similar to JSXAPI
integration.xapi.status.on('RoomAnalytics', (deviceId, name, value) => {
  console.log('Room Analytics updated', name, value);
});
```



## Command details

Sometimes you may need the result of commands. This is returned as a normal async answer.

```js
// Search the phone book:
const res = await integration.xapi.command(device, 'Phonebook Search', { PhonebookType: 'Local', Limit: 10 });
console.log('phonebook', res.Contact);
```

Commands with multi-line content (such as images, xml or other data blobs) can be set using the fourth parameter:

```js
const data = 'const data = 1; \n const moreData = 2;';
try {
  await integration.xapi.command(deviceId, 'Macros Macro Save', { Name: 'mymacro' }, data);
}
catch(e) {
  console.log('Not able to write macro', e);
}
```

## Configurations

Note: setting a configuration requires the **spark-admin:devices_write** scope to be set in the manifest.

```js
// Read a config:
const mode = await integration.xapi.config.get(deviceId, 'RoomAnalytics.PeoplePresenceDetector')
console.log('Detector:', mode);

// Set a config
// NOTE:
try {
  await integration.xapi.config.set(deviceId, 'RoomAnalytics.PeoplePresenceDetector', 'On');
}
catch(e) {
  console.log('Not able to set config', e);
}
```

You can also set multiple configs in one go with the `setMany` function:

```js
const configs = {
  'Audio.Ultrasound.MaxVolume': 0,
  'Audio.DefaultVolume': 33,
  'Audio.SoundsAndAlerts.RingVolume': 66,
};
await integration.xapi.config.setMany(device, configs);
```

Note that the configuration apis do not actually need to be specified in the manifest. Unlike status, commands and statuses there is no granular control.

## Discovering devices

The SDK also allow you to find devices in your organization.

```js
// Show all devices in your org:
const devices = await integration.devices.getDevices();
const names = devices.map(d => `${d.displayName} (${d.product} ${d.type})`);
console.log(names);

// TODO
// Get the devices in the location that your integration has been enabled for
// xapi.getLocations().forEach(async (locationId) => {
//   const devices = await xapi.getDevices(locationId, { type: 'roomdesk' });
//   console.log(devices);
// });

// the filterting options (like 'roomdesk') are the same as described on
// https://developer.webex.com/docs/api/v1/devices/list-devices
```

## Necessary API scopes

For the SDK to work, you typically need to add the following API scopes to your manifest:

* `spark-admin:workspaces_read` - Get list of workspaces, and workspace details
* `spark-admin:devices_read` - Get list of devices, and device details
* `spark:xapi_statuses` - Query and subscribe to xAPI status
* `spark:xapi_commands` - Invoke xAPI commands

You can also read and change device configurations if you use `spark-admin:devices_read` and `spark-admin:devices_write`.

## Long polling and web hooks

Workspace integrations support two different method of receiving data from the devices / Webex:

1. Long polling

The integration is itself responsible for continuously asking Webex for updates. This integration does not require a public web server, and can therefore be run inside a protected intranet. It's a simple mechanism that is handled entirely by the SDK itself.

2. Web hooks

The integration is hosted on a public site (must be https), and receives the device data as web hooks from Webex. Typically needed if you want to provide a public integration that customers can pay for and use, without hosting anything themselves.

## Log level

You can choose which level the SDK reports logs at. The default level is `error`, so it's only errors that are shown in the console, but if you want to see more of what is happening, you can change it in your config:

```js
const config = {
  appId: '...',
  logLevel: 'info', //
}

connect(config);
```

## Web hooks

It is also possible to use the web hook deployment model with the SDK. In this case, you need to provide the web server yourself, then feed the incoming web hook data from Webex to the SDK using `integration.processNotifications()`. The SDK will then deliver the events and status update to your listeners, exactly in the same way as with long polling.

The following example shows how to do this with a simple Express web server, but you can of course use any web server you prefer.

```js
const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('workspace-integrations');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = 80;

// This is the public URL you manage.
const url = 'https://acme.com';

const config = {
  clientId: 'xxx',
  clientSecret: 'yyy',
  jwt: 'zzz',
  notifications: 'webhook',
  webhook: {
    targetUrl: url + "/api/webhooks", // you can choose the route yourself
    type: "hmac_signature",
    secret: "somethingmorethan20chars"
  },
  actionsUrl: url + "/api/webexnotify", // (optional) you can choose the route yourself
};

let integration;

// the route here must be the same as you specify in webhook above
app.all('/api/webhooks', (req, res) => {
  const { method, body, headers } = req;
  if (integration) {
    integration.processNotifications(body);
  }

  res.send('ok');
});

app.listen(port, () => console.log('http server on port', port));

function onConnect(_integration) {
  console.log('connected, xapi ready');
  integration = _integration;

  // this shows that subscriptions are working, just like for long polling:
  integration.xapi.event.on('', (device, path, data) => console.log('SDK event:', path, data, device));
  integration.xapi.status.on('', (device, path, data) => console.log('SDK status:', path, data, device));
}

connect(config)
  .then(onConnect)
  .catch(e => console.log('Error!', e))
```

**Tip**: For testing web hooks during development, you can use https://ngrok.com/.

## Type script support

The SDK has TypeScript definitions and should work out of the box. If you are using vanilla JS and not TypeScript, you should still be able to get auto completions in Visual Studio Code or any other editors that support the `.d.ts` type definitions.


## Custom Webex API calls

This SDK contains Webex API wrappers mostly for dealing with devices (xAPI). However, there are a ton of other Webex APIs you may wish to use in your application. For this you need the base URL and the token, and the SDK can help you with this. You need to remember to add the relevant scopes to your manifest too.

The SDK uses [node-fetch](https://www.npmjs.com/package/node-fetch) for the actual calls. In addition, it throws an error if the result of the HTTP query is not *ok* (HTTP 2xx status code).

Here's an example of how to use the People API to lookup people in your organisation. This also requires the `spark-admin:people_read` scope.

```js
async function findPerson(integration, name) {
  const url = 'people/?displayName=' + name;
  const data = await integration.webexApi(url);
  console.log('Found:', data.items);
}
```

Behind the scenes, the SDK automatically:

* Adds the Webex api base url (may change if the integration is FedRAMP)
* Adds the access token to the header, and sets content type to JSON
* Converts the result from JSON string to JavaScript object
* Throws an exception if the call is unsuccessful

## Limitations

Please be aware of the following limitations:

* There's a limited set of statuses and events you can subscribe to, such as room analytics and user interface extensions actions (see Control Hub for the full list) - though you can still query all of them.

* On personal devices, you cannot use APIs that are listed as privacy impacting (see roomos.cisco.com/xapi to verify the APIs).

* If your integration has been allowed for only certain locations, you will still be able to list all the devices in the org and manipulate configs, but only invoke commands and statuses for the device in the allowed locations. Other devices will return 403 Forbidden.

## Useful resources

* [Workspace Integrations Guide](https://developer.webex.com/docs/workspace-integrations)
* [Introduction to the xAPI](https://roomos.cisco.com/doc/TechDocs/xAPI)
* [RoomOS xAPI reference](https://roomos.cisco.com/xapi)
* [Manifest editor](https://cisco-ce.github.io/workspace-integrations-editor/)

