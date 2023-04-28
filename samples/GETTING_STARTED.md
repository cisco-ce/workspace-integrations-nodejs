# Getting started

Requirements

* Node and npm installed
* Access to Control Hub

## Setting up and running a sample

Manifest editor

- Create manifest in manifest editor (or manually)

Control hub
- Log in to control hub
- Go to workspace integrations
- Add integration
- Upload manifest
- Download oauth creds
- Go to integration
- Activate
  - Note: choose location to limit it to the devices you want
- Save activation code (jwt)
- jwt.io is a good site to look at the jwt, if you are curious
- Note: code is valid only for 24h. you need to run integration before that

Code base
- copy paste app id, secret and jwt to creds.json



Tips:
- Warn about experimenting - might be many video devices
- Use location to limit the number of affected devices when doing demos
- Dont use wildcards in manifest unless you absolutely have to. the less apis you ask for the easier it is for admins to allow them. it can be good during testing - but even then, receiving data from many devices may create a lot of noise in your test app
- You get state updates every 60 minutes, even if status hasnt changed
- Always cache device and workspace lookups


FINDINGS

- you can send webex message with WI, but the integration cant have avatars
- auto complete for apis in workspace integrations editor
- would be nice to have download manifest


Examples

TODO

- add examples on non-required scopes and non-required apis


