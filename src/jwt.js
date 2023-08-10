const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// the 'region' field in the jwt matches the key here:
const keyUrls = {
  'us-west-2_r': 'https://xapi-r.wbx2.com/jwks',
  'us-east-2_a': 'https://xapi-a.wbx2.com/jwks',
  'eu-central-1_k': 'https://xapi-k.wbx2.com/jwks',
  'us-east-1_int13': 'https://xapi-intb.wbx2.com/jwks',
  'us-gov-west-1_a1': 'https://xapi.gov.ciscospark.com/jwks',
};

async function getKey(jwksUri, kid) {
  const client = jwksClient({
    jwksUri,
  });

  const key = await client.getSigningKey(kid);
  const signingKey = key.getPublicKey();
  return signingKey;
}

async function validate(jwtToken) {
  const decoded = jwt.decode(jwtToken, { complete: true });
  const { header, payload } = decoded;
  const { kid } = header;
  const { region } = payload
  const keyUrl = keyUrls[region];
  const key = await getKey(keyUrl, kid);
  return jwt.verify(jwtToken, key);
}

async function decodeAndVerify(jwtToken) {
  try {
    return await validate(jwtToken);
  }
  catch(e) {
    console.log(e.message);
    return false;
  }
}

module.exports = {
  decodeAndVerify,
}
