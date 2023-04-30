import { Deployment, Integration, connect } from './types';
import IntegrationImpl from './integration';

const connect: connect = async (creds: Deployment): Promise<Integration> => {
  if (!creds) {
    throw new Error('Not able to connect. You must provide credentials.');
  }
  const integration = await IntegrationImpl.connect(creds);
  return integration;
};

export default connect;
