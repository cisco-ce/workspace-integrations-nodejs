
# Hello world example

Shows message on a device screen for a few seconds

Requires a device in your org that has the tag 'wi-demo'

To run:
  - Add an integration to your org with the manifest found here
  - Tag one device in your org with `wi-demo`
  - Create a file with the credentials from Control Hub (see main readme for what needs to be there),
  and save it to `creds.json` in the `helloworld/` folder
  - Start the integration:
  `CREDS=./creds.json ts-node samples/helloworld`

You can install `ts-node` globally with `npm install -g ts-node` if you don't have it already.
