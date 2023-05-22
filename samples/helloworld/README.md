# Hello world example

Shows message on a device screen for a few seconds

Requires a device in your org that has the tag 'wi-demo'

To test this example, you first need to add it to Control Hub:

- Add an integration to your org with the manifest found here (copy the OAuth client credentials)
- Activate the integration and copy the activation code (JWT)
- Tag one device in your org with `wi-demo`

```
mkdir wi-helloworld
cd wi-helloworld
npm init -y
npm install --save workspace-integrations

CLIENT_ID=<..> CLIENT_SECRET=<..> JWT=<..> node ./index.js
# You can also put the env variables above in a .env file instead in the same directory
```

Your integration should now start up and show a 'Hello World' message on the screen of the device you tagged.