# Multi-tenant

This example shows how to support multiple orgs / tenants with the same integration.

Basically all it does is connect to / create an instance of the integration for each org.

So it could even be different app ids in each org. For cases like this, it's important that the
integration checks the scopes and xapiAccess `integration.getAppInfo()` to verify what each org
has allowed the integration to do.

## Config

This example a config.json file that includes all the configs for each org in a list, like this:

```json
[
  {
    "name": "My org 1",
    "config": {
      "clientId": "C6....",
      "activationCode": {
        "oauthUrl": "https://webexapis.com/v1/access_token"
      }
      // the rest
    }
  },
  {
    "name": "My org 2",
    "config": {
      "clientId": "Cd36cced",
      "activationCode": {
        "oauthUrl": "https://webexapis.com/v1/access_token"
      }
      // the rest
    }
  }
]
```