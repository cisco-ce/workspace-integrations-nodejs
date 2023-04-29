import { Deployment, Integration } from './types';
import IntegrationImpl from './integration';

export async function connect(creds: Deployment): Promise<Integration> {
  if (!creds) {
    throw new Error('Not able to connect. You must provide credentials.');
  }
  const integration = new IntegrationImpl();
  await integration.connect(creds);
  return integration;
}
