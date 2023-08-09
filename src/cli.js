#!/usr/bin/env node

function atob(base64) {
  return Buffer.from(base64, 'base64').toString('ascii');
}

function parseJwt(jwt) {
  const [header, payload, signature] = jwt.split('.');
  if (!payload) {
    throw new Error('activationCode is not valid JWT');
  }
  return JSON.parse(atob(payload));
}

/**
 * Script to decode and validate a Workspace Integration JWT from Control Hub
 */

const [,, jwt, format] = process.argv;

if (!jwt) {
  console.log('USAGE: cli.js <jwt-from-control-hub>');
  process.exit(1);
}

function decode(jwt, format) {
  console.warn('\n⚠️ WARNING: Activation code (JWT) is currently only decoded, not validated');
  const { oauthUrl, appUrl, webexapisBaseUrl, refreshToken } = parseJwt(jwt);
  const config = format === 'env'
    ? 'OAUTH_URL=' + oauthUrl + '\nAPP_URL=' + appUrl + '\nWEBEXAPIS_BASE_URL=' + webexapisBaseUrl + '\nREFRESH_TOKEN=' + refreshToken
    : JSON.stringify({ oauthUrl, appUrl, webexapisBaseUrl, refreshToken }, null, 2);
  console.log('\n' + config);
}

decode(jwt, format);