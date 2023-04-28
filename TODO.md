# TODO

TODO
- dont have apis in xapi that are webex (not xapi)
- add some sdk functions for fetching and caching workspace / devices
- when failing to connect, show actual response from api
- when asking for apis you dont have access to, fail better than today
- add support for ignoring sync updates in sdk
- add an easy way for consumer to use token etc and use webex apis not supported by - - add some helper function for common stuff such as
  - showing alert on screen
  - dialling
  - sending webex message
- Support user agent similar to toms sdk


* Optionally discard full sync messages
* Optionally discard status updates/events (>5 sec) messages?
* Extract return values better for subscriptions, similar to what jsxapi does
* Support for device update events (check by changing location)


## Samples to include

* Detect heads in room, if above certain level show warning and send webex message
* UI extension panel to order coffee, snacks to room. Send webex or MS Teams message (including provisioning ui extension?)
* Show sensor data for room (noise, air quality, …)
* Quick dial
* Control a Philips hue light
* How is this room utilised (show head count plot for whole week)
* Something involving configs/ advanced bulk configurations
* Show map with meeting rooms, and whether there are people there or not, and whether booked or not
* Something relevant for MTR