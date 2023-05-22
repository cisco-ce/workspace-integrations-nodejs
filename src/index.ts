import { IntegrationConfig, Integration, connect } from './types';
import IntegrationImpl from './integration';
import log from './logger';

const connect: connect = async (creds: IntegrationConfig): Promise<Integration> => {
  if (!creds) {
    throw new Error('Not able to connect. You must provide credentials.');
  }

  log.setLogLevel(creds.logLevel || 'error');
  const integration = await IntegrationImpl.connect(creds);

  return integration;
};

export { connect };
