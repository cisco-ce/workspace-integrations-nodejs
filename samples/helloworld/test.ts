// const wi = require('workspace-integrations');
import { Deployment, AppInfo } from '../../src/types';
import Http from '../../src/http';
import IntegrationImpl from '../../src/integration';

// @ts-ignore
import(process.env.CREDS)
  .then(c => start(c))
  .catch(() => console.log('You need to specify credentials file'));

async function start(creds: Deployment) {
  Http.setDryMode(true);
  const fakeAppInfo = {} as AppInfo;
  const fakeJwt = { webexapisBaseUrl: 'https://webexapis.com/v1'};
  const integration = new IntegrationImpl(fakeAppInfo, 'token1234', fakeJwt);
  integration.xapi.command('myDeskPro', 'Dial', { Number: 'chuck@cisco.com'});
  console.log(Http.history());
}
