// const jwt = require('jsonwebtoken');
// const jwksClient = require('jwks-rsa');
import { decode, verify, Jwt } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

// the 'region' field in the jwt matches the key here:
const keyUrls: {[index: string]: string}  = {
  'us-west-2_r': 'https://xapi-r.wbx2.com/jwks',
  'us-east-2_a': 'https://xapi-a.wbx2.com/jwks',
  'eu-central-1_k': 'https://xapi-k.wbx2.com/jwks',
  'us-east-1_int13': 'https://xapi-intb.wbx2.com/jwks',
  'us-gov-west-1_a1': 'https://xapi.gov.ciscospark.com/jwks',
};

const inMemoryJti = new Set();

const defaultRegion = 'us-east-2_a';

async function getKey(jwksUri: string, kid: string) {
  const client = new JwksClient({
    jwksUri,
  });

  const key = await client.getSigningKey(kid);
  const signingKey = key.getPublicKey();
  return signingKey;
}

async function validate(jwtToken: string) {
  const decoded = decode(jwtToken, { complete: true });
  if (!decoded) {
    throw new Error('Not able to decode JWT');
  }
  const { header, payload } = decoded;
  if (typeof payload !== 'object' || typeof header !== 'object') {
    throw new Error('Not able to decode JWT');
  }
  const { kid } = header;
  const { region, expiryTime, iat, jti } = payload;

  if (!jti || inMemoryJti.has(jti)) {
    throw new Error('JWT jti not valid');
  }
  else {
    inMemoryJti.add(jti);
  }

  if (expiryTime) {
    const expiry = new Date(expiryTime);
    const now = new Date();
    if (now.getTime() > expiry.getTime()) {
      throw new Error('JWT expired');
    }
  }
  else {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const expiry = iat ? iat * 1000 : 0;
    if (expiry < fiveMinutesAgo) {
      throw new Error('JWT iat too old');
    }
  }

  const keyUrl = keyUrls[region || defaultRegion];
  if (!kid) {
    throw new Error('Not able to find kid');
  }

  const key = await getKey(keyUrl, kid);

  return verify(jwtToken, key);
}

export async function decodeAndVerify(jwtToken: string) {
  try {
    return await validate(jwtToken);
  }
  catch(e) {
    // console.log(e);
    console.log(e instanceof Error ? e.message : e);
    return false;
  }
}

