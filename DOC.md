Workspaces integrations lets you easily create apps for Cisco collaboration devices in a secure and modern fashion.

For the source code of this SDK, see [Workspace Integrations SDK](https://github.com/cisco-ce/workspace-integrations/)
on GitHub.

# Getting started

To connect your workspace integration to Webex, you need to use the {@link connect} function, and provide it your integration {@link IntegrationConfig}. This will provide you an {@link Integration} object that you can use to access the devices and the Webex APIs.

```
const config = {
  clientId: "C12ba...",
  clientSecret: "fdbcd00...",
  jwt: "eyJraWQiOiJQSnM..."
  notifications: 'longpolling',
};

connect(config).then(async (integration) => {
  const workspaces = await integration.workspaces.getWorkspaces();
  // ...
})
```