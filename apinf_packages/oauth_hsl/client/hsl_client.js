/* Copyright 2018 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Npm packages imports
import _ from 'lodash';
import { Random } from 'meteor/random'

Hsl = {};

// Request OpenID Connect credentials for the user
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Hsl.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  let config = ServiceConfiguration.configurations.findOne({ service: 'hsl' });
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError('Service hsl not configured.'));
    return;
  }

  let credentialToken = Random.secret();
  let loginStyle = OAuth._loginStyle('hsl', config, options);
  let scope = config.requestPermissions || ['openid', 'profile', 'email'];

  // options
  options = options || {};
  options.client_id = config.clientId;
  options.response_type = options.response_type || 'code';
  options.redirect_uri = OAuth._redirectUri('hsl', config);
  options.state = OAuth._stateParam(loginStyle, credentialToken, options.redirectUrl);
  options.scope = scope.join(' ');

  if (config.loginStyle && config.loginStyle === 'popup') {
    options.display = 'popup';
  }

  let loginUrl = config.serverUrl + config.authorizationEndpoint;
  // check if the loginUrl already contains a "?"
  let first = loginUrl.indexOf('?') === -1;
  for (let k in options) {
    if (first) {
      loginUrl += '?';
      first = false;
    } else {
      loginUrl += '&';
    }
    loginUrl += encodeURIComponent(k) + '=' + encodeURIComponent(options[k]);
  }

  // pop-up window size
  options.popupOptions = options.popupOptions || {};
  const popupOptions = {
    width: options.popupOptions.width || 320,
    height: options.popupOptions.height || 450,
  };

  OAuth.launchLogin({
    loginService: 'hsl',
    loginStyle,
    loginUrl,
    credentialRequestCompleteCallback,
    credentialToken,
    popupOptions,
  });
};
