// const wi = require('workspace-integrations');
import { Deployment } from '../../src/types';
import Http from '../../src/http';

// @ts-ignore
import(process.env.CREDS)
  .then(c => start(c))
  .catch(() => console.log('You need to specify credentials file'));

async function start(creds: Deployment) {
  Http.setDryMode(true);
  const res = await Http.getAccessToken('acme', 'test', 'https://test', 'test');
  console.log(res);
}
