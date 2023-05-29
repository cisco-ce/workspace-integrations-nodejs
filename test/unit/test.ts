/**
 * Tests
 * - fetch devices, verify http calls
 * - fetch device, verify http call
 * - get xstatus, verify http call
 * - set command, verify http call
 *  - multiline param
 * - get xconfig, verify http call
 * - set xconfig, verify http call
 * - set multiple xconfig, verify http call
 * - subscribe to event, inject message, verify callback
 * - subscribe to status, inject message, verify callback
 */
import http from '../../src/http';
import { connect } from '../../src/index';
import { readFileSync } from 'fs';
import { IntegrationConfig } from '../../src/types';

const testdata = JSON.parse(readFileSync(__dirname + '/testdata.json').toString());

let lastHttpCall = { url: '', options: {} };
http.setDryMode((url, options) => {
  lastHttpCall = { url, options };
})

describe('Connecting integration', () => {
  it('creates access token with correct HTTP call', async () => {
    try {
      await connect(testdata.config);
    }
    // expected, since connect will fail when not getting an access key
    catch {}
    expect(lastHttpCall).toEqual(testdata.http.createAccessToken);
  });

  it('inits integration with correct HTTP call', async() => {
    http.initIntegration({
      accessToken: 'xxx',
      appUrl: 'https://acme.com/',
      notifications: 'none',
    });
    expect(lastHttpCall).toEqual(testdata.http.initIntegration);
  });

  it('throws exception if config is missing data', async () => {
    const invalidConfig = {
      clientId: '',
      clientSecret: '',
      activationCode: '',
      notifications: 'none' as 'none',
    };
    const emptyConfig = {} as IntegrationConfig;
    await expect(connect(invalidConfig)).rejects.toThrow(TypeError);
    await expect(connect(emptyConfig)).rejects.toThrow(TypeError);
  });
});

