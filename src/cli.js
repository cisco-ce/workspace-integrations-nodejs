#!/usr/bin/env node

/**
 * Script to decode and validate a Workspace Integration JWT from Control Hub
 */

const { decodeAndVerify } = require('./jwt');

const [,, jwt, format] = process.argv;

if (!jwt) {
  console.log('USAGE: cli.js <jwt>');
  console.log('or, for INI file format: cli.js <jwt> env')
  process.exit(1);
}

async function decode(jwt, format) {
  const res = await decodeAndVerify(jwt);

  if (!res) {
    console.log('\n🛑 Not able to verify activation code (JWT)! Are you sure you copied the whole string?');
    process.exit(1);
  }

  console.log('\n🎉 JWT Successfully verified. Copy and paste the data below for connecting your integration:');
  const { oauthUrl, appUrl, webexapisBaseUrl, refreshToken } = res;
  const config = format === 'env'
    ? 'OAUTH_URL=' + oauthUrl + '\nAPP_URL=' + appUrl + '\nWEBEXAPIS_BASE_URL=' + webexapisBaseUrl + '\nREFRESH_TOKEN=' + refreshToken
    : JSON.stringify({ oauthUrl, appUrl, webexapisBaseUrl, refreshToken }, null, 2);
  console.log('\n' + config + '\n');
}

decode(jwt, format);