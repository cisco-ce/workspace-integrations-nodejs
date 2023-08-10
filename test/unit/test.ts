/**
 * TODO Tests
 * - set multiple xconfig, verify http call
 */
import { connect } from '../../src/index';
import { readFileSync } from 'fs';
import { IntegrationConfig } from '../../src/types';
import HttpImpl from '../../src/http';
import DevicesImpl from '../../src/apis/devices';
import XapiImpl from '../../src/apis/xapi';

const testdata = JSON.parse(readFileSync(__dirname + '/testdata.json').toString());

let lastHttpCall = { url: '', options: {} };

// dummy base url, checks that the webex apis arent hard coded but read from jwt
const baseUrl = 'https://acme.com';

const http = new HttpImpl(baseUrl, 'XXX');
// mock implementation of cloud services
HttpImpl.setDryMode((url, options) => {
  lastHttpCall = { url, options };

  // console.log(url);
  if (url.startsWith(baseUrl + '/devices')) {
    return { items: [] };
  }
  else if (url.startsWith(baseUrl + '/xapi/status')) {
    return {
      result: { something: 'something' },
    };
  }
  else if (url.startsWith(baseUrl + '/deviceConfigurations')) {
    return {
      items:
      {
        'Audio.DefaultVolume': {
          value: 33,
        },
      },
    };
  }
});

// useful when adding tests, to copy correct http call to testdata.json
function printLastCall() {
  console.log(JSON.stringify(lastHttpCall, null, 2));
}

describe('Connecting integration', () => {
  it('creates access token with correct HTTP call', async () => {
    try {
      await connect(testdata.config);
    }
    // expected, since connect will fail when not getting an access key
    catch {}
    console.log('ACTUAL', lastHttpCall);
    console.log('EXPECTED', testdata.http.createAccessToken)
    expect(lastHttpCall).toEqual(testdata.http.createAccessToken);
  });

  it('inits integration with correct HTTP call', async () => {
    HttpImpl.initIntegration({
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
      activationCode: {
        oauthUrl: '',
        refreshToken: '',
        appUrl: '',
        webexapisBaseUrl: '',
      },
      notifications: 'none' as 'none',
    };
    const emptyConfig = {} as IntegrationConfig;
    await expect(connect(invalidConfig)).rejects.toThrow(TypeError);
    await expect(connect(emptyConfig)).rejects.toThrow(TypeError);
  });
});

describe('Device API', () => {
  const devices = new DevicesImpl(http);

  it('can fetch devices with correct api', async () => {
    await devices.getDevices();
    expect(lastHttpCall).toEqual(testdata.http.getDevices);
  });

  it('can fetch device details with correct api', async () => {
    await devices.getDevice('1234567');
    expect(lastHttpCall).toEqual(testdata.http.getDevice);
  });
});

describe('xAPI', () => {
  const xapi = new XapiImpl(http);
  const deviceId = '12345';

  it('can query status with correct api', async () => {
    await xapi.status.get(deviceId, 'RoomAnalytics.*');
    expect(lastHttpCall).toEqual(testdata.http.getXapiStatus);
  });

  it('can invoke a command', async () => {
    await xapi.command(deviceId, 'Dial', { Number: 'chuck@cisco.com' });
    expect(lastHttpCall).toEqual(testdata.http.invokeXapiCommand);
  });

  it('can invoke a command with multi-line', async () => {
    await xapi.command(deviceId, 'CustomStatus Set', { Email: 'santa@cisco.com' }, 'On vacation');
    expect(lastHttpCall).toEqual(testdata.http.invokeXapiCommandWithMultiline);
  });

  it('can route status notifications', (done) => {
    xapi.status.on('RoomAnalytics.PeopleCount.Current', (deviceId, path, value) => {
      // console.log('got', deviceId, path, value);
      expect(deviceId).toBe('1234');
      expect(path).toBe('RoomAnalytics.PeopleCount.Current');
      expect(value).toBe(2);
      done();
    });
    xapi.processNotification(testdata.notifications.status);
  });

  it('can route events', (done) => {
    xapi.event.on('UserInterface.Message.Prompt.Response', (deviceId, path) => {
      expect(deviceId).toBe('1234');
      expect(path).toBe('UserInterface.Message.Prompt.Response');
      done();
    });
    xapi.processNotification(testdata.notifications.event);
  });

  it('can set a config', async () => {
    await xapi.config.set(deviceId, 'Audio.DefaultVolume', 33);
    expect(lastHttpCall).toEqual(testdata.http.setXapiConfig);
  });

  it('can set multiple configs', async () => {
    const configs = {
      'Audio.Ultrasound.MaxVolume': 0,
      'Audio.DefaultVolume': 33,
      'Audio.SoundsAndAlerts.RingVolume': 66,
    };
    await xapi.config.setMany(deviceId, configs);
    expect(lastHttpCall).toEqual(testdata.http.setXapiConfigMultiple);
  });

  it('can get a config', async () => {
    await xapi.config.get(deviceId, 'Audio.DefaultVolume');
    expect(lastHttpCall).toEqual(testdata.http.getXapiConfig);
  });
});
