Workspaces integrations lets you easily create apps for Cisco collaboration devices in a secure and modern fashion.

This is the generated API reference document for the Node.js SDK. For an introduction to the SDK, see the
[project's GitHub page](https://github.com/cisco-ce/workspace-integrations-nodejs/).

For a general introduction to Workspace Integrations, see [the overview guide](https://developer.webex.com/docs/workspace-integrations) on developer.webex.com.


# Getting started

To connect your workspace integration to Webex, you need to use the {@link connect} function, and provide it your {@link IntegrationConfig}. This will give you an {@link Integration} object that you can use to access the devices and the Webex APIs.

```js
const { connect } = require('workspace-integrations');

const config = {
  clientId: "C12ba...",
  clientSecret: "fdbcd00...",
  activationCode: "eyJraWQiOiJQSnM..."
  notifications: 'longpolling',
};

connect(config).then(async (integration) => {
  const devices = await integration.devices.getDevices({ tag: 'wi-demo' });
  const device = devices[0];
  const msg = {
    Text: 'Hello World',
    Duration: 3,
  };
  integration.xapi.command(device.deviceId, 'UserInterface Message Alert Display', msg);
});
```
