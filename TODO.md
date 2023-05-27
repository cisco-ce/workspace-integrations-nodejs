# TODO

## Before version 1.0

- Make typescript auto complete actually work
- Test added examples
- Test web hook example
- Add guide on how to get started with examples (including control hub part)
- Warn if user tries to subscribe to status/event notifications that WI doesn't support
- Add the same samples as the java sdk

## Later

- add support for ignoring sync updates in sdk
- helper function for common stuff such as
  - showing alert on screen
  - dialing
  - sending webex message
- Support user agent similar to toms sdk

* Optionally discard full sync messages
* Optionally discard status updates/events (>5 sec) messages?


## Samples to include

* Call satisfaction survey
* Detect heads in room, if above certain level show warning and send webex message
* Show sensor data for room (noise, air quality, …)

* UI extension panel to order coffee, snacks to room. Send webex or MS Teams message (including provisioning ui extension?)
* Quick dial
* Control a Philips hue light
* How is this room utilized (show head count plot for whole week)
* Something involving configs/ advanced bulk configurations
* Show map with meeting rooms, and whether there are people there or not, and whether booked or not
* Fire alarm: show web view with escape routes, allow admin to start/stop drill
* Something relevant for MTR