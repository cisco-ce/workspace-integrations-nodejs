# Contributors

This article is written for developers that want to contribute to the development of the SDK itself.

A few general notes to remember:

* Run `npm run build` after doing changes in `.ts` files for the changes to take effect, if you are running samples to test.
* Run `npm test` and `npm lint` before pushing changes.
* Do `npm run doc` to update auto-generated docs.
* Do `git push` as when publishing a new version to npm, so GitHub and npmjs.com are in sync.

## Testing your changes locally

To test your changes locally before publishing, it's recommended to:

* Create a local NPM dummy app that uses the SDK and specifically your changes
* In the SDK lib folder, type `npm link`
* In the dummy app folder, type `npm link workspace-integrations` to install your local version of the SDK

When you are done, you can type `npm unlink` to tidy up.

## Publishing your changes

Once you have finished your changes, tested it and also run the integration test, committed and pushed it, you can update NPM. As always, semantic versioning applies:

* **Patch** - Backward compatible bug fixes	-	Increment the third digit	1.0.1
* **Minor** - Compatible new features -	Increment the middle digit and reset last digit to zero	1.1.0
* **Major** - Changes that break backward compatibility	- Increment the first digit and reset middle and last digits to zero	2.0.0

From command line do either `npm version major`, `npm version minor` or `npm version patch`, depending on your changes. Then, to finally push the changes to npmjs.com, type `npm publish`. Follow the instructions to log in.

Your updates should now be available to external users. Head over to [npmjs.com](https://www.npmjs.com/package/workspace-integrations) and verify that it reflects the newer version.

## Integration test

The SDK includes an integration test that tests some very basic functionality. This requires an integration to be added to an org,
and at least one connected device in that org contains a `wi-demo` tag.

To run it, create an integration in an org with the manifest in the integration test folder, add the tag to a device and run
`npm run integration-test`.

## Running the samples

The samples in the `samples/`` folder are written in such a way that users can copy/paste them from external npm packages.
This means that the SDK there needs to be imported the normal way:

```
const integration = require('workspace-integrations);
```

But self-referencing like this is not supported by NPM, so there is a trick to do this. In the root folder, type:

```
npx self-install
```

This will create a reference in `node_modules`, making it possible to simply run the samples like this:

```
node samples/helloworld
```

You will need to do this again every time you've done stuff that updates `package.json`, such as `npm install -S xxx`.

Remember that you also need to provide the deployment config.

