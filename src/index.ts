import { IntegrationConfig, Integration, connect } from './types';
import IntegrationImpl from './integration';
import Http from './http';
import log from './logger';

const connect: connect = async (creds: IntegrationConfig): Promise<Integration> => {
  if (!creds) {
    throw new Error('Not able to connect. You must provide credentials.');
  }

  log.setLogLevel(creds.logLevel || 'error');
  const integration = await IntegrationImpl.connect(creds);

  return integration;
};

const deserialize = IntegrationImpl.deserialize;
const createAccessToken = Http.createAccessToken;

export { connect, deserialize, createAccessToken };
