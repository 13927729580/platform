/* Copyright 2018 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { OAuth } from 'meteor/oauth';
import { TAPi18n } from 'meteor/tap:i18n';

import { Base64 } from 'js-base64';

// Meteor contributed packages imports
import { ServiceConfiguration } from 'meteor/service-configuration';

// Npm packages imports
import _ from 'lodash';

/* global Hsl:true */
Hsl = {};

let userAgent = 'Meteor';
if (Meteor.release) {
  userAgent += `/${Meteor.release}`;
}

const getConfiguration = function () {
  const config = ServiceConfiguration.configurations.findOne({ service: 'hsl' });
  if (!config) {
    throw new ServiceConfiguration.ConfigError('Service hsl not configured.');
  }
  return config;
};

const getUserInfo = function (accessToken) {
  const debug = false;
  const config = getConfiguration();
  const serverUserinfoEndpoint = config.serverUrl + config.userinfoEndpoint;
  let response;
  try {
    response = HTTP.get(
      serverUserinfoEndpoint,
      {
        headers: {
          'User-Agent': userAgent,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (err) {
    const errText = `Failed to fetch userinfo from HSL ${serverUserinfoEndpoint}: ${err.message}`;
    throw _.extend(new Error(errText), { response: err.response });
  }
  if (debug) console.log('XXX: getUserInfo response: ', response.data);
  return response.data;
};

const getToken = function (query) {
  const debug = false;
  const config = getConfiguration();
  const serverTokenEndpoint = config.serverUrl + config.tokenEndpoint;
  let response;

  try {
    response = HTTP.post(
      serverTokenEndpoint,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent,
        },
        params: {
          code: query.code,
          client_id: config.clientId,
          client_secret: OAuth.openSecret(config.secret),
          /* eslint no-underscore-dangle: ["error", { "allow": ["_redirectUri"] }] */
          redirect_uri: OAuth._redirectUri('hsl', config),
          grant_type: 'authorization_code',
          state: query.state,
        },
      }
    );
  } catch (err) {
    const errMsg = `Failed to get token from HSL ${serverTokenEndpoint}: ${err.message}`;
    throw _.extend(new Error(errMsg),
      { response: err.response });
  }
  if (response.data.error) {
    // if the http response was a json object with an error attribute
    const errorMsg = `Failed to complete handshake with HSL
     ${serverTokenEndpoint}: ${response.data.error}`;
    throw new Error(errorMsg);
  } else {
    if (debug) console.log('XXX: getToken response: ', response.data);
    return response.data;
  }
};

OAuth.registerService('hsl', 2, null, (query) => {
  const debug = false;
  const token = getToken(query);
  if (debug) console.log('XXX: register token:', token);

  const accessToken = token.access_token || token.id_token;
  const expiresAt = new Date() + (1000 * parseInt(token.expires_in, 10));

  // id_token consists of three parts separated with a dot
  const idToken = token.id_token.split('.');
  // decode payload part
  const decodedIdTokenPayload = Base64.decode(idToken[1]);
  // JSONify payload in order to be able to refer to it
  const decodedIdTokenPayloadJSON = JSON.parse(decodedIdTokenPayload);
  if (debug) console.log('decoded_json', decodedIdTokenPayloadJSON);

  if (debug) console.log('amr=', decodedIdTokenPayloadJSON.amr);
  // Do not allow login without MFA
  if (!decodedIdTokenPayloadJSON.amr.includes('mfa')) {
    // eslint-disable-next-line
    const message = TAPi18n.__('oauthHslNoMfa');
    throw new Meteor.Error(403, message);
  }

  const userinfo = getUserInfo(accessToken);
  if (debug) console.log('XXX: userinfo:', userinfo);

  const serviceData = {};

  serviceData.id = userinfo.sub;
  serviceData.username = userinfo.preferred_username;
  serviceData.fullname = userinfo.name;
  serviceData.accessToken = userinfo.accessToken;
  serviceData.expiresAt = expiresAt;
  serviceData.email = userinfo.email;
  serviceData.amr = decodedIdTokenPayloadJSON.amr;

  if (token.refresh_token) {
    serviceData.refreshToken = token.refresh_token;
  }
  if (debug) console.log('XXX: serviceData:', serviceData);

  const profile = {};
  profile.name = userinfo.displayName;
  profile.email = userinfo.email;
  if (debug) console.log('XXX: profile:', profile);

  return {
    serviceData,
    options: { profile },
  };
});

/* global Hsl:true */
Hsl.retrieveCredential = function (credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};
