import { Meteor } from 'meteor/meteor';
import { ApiKeys } from '/api_keys/collection';
import { ProxyBackends } from '/proxy_backends/collection';
import { Proxies } from '/proxies/collection';

Meteor.methods({
  createApiKey (apiId) {
    // Get logged in user
    const currentUser = Meteor.user();
    // Check currentUser exists
    if (currentUser) {
      const proxyBackend = ProxyBackends.findOne({ apiId });

      // Check proxyBackend is defined, and it has proxyId
      if (proxyBackend && proxyBackend.proxyId) {
        // Get Proxy by proxyId of proxyBackend
        const proxyId = proxyBackend.proxyId;
        const proxy = Proxies.findOne({ proxyId });

        // Check type & call appropriate function
        if (proxy && proxy.type === 'apiUmbrella') {
          // Call Umbrella method to create user with API key
          Meteor.call('createApiUmbrellaUser', currentUser, (error, umbrellaUser) => {
            if (error) {
              console.log(error);
            } else {
              // Construct apiKey object
              const apiKey = {
                apiUmbrella: {
                  id: umbrellaUser.id,
                  apiKey: umbrellaUser.api_key,
                },
                userId: currentUser._id,
                proxyId: proxy._id,
              };

              // Insert apiKey
              ApiKeys.insert(apiKey);
            }
          });
        } else {
          console.log('no proxy, sorry');
        }
      } else {
        console.log('no proxybackend, sorry');
      }
    } else {
      // Meteor Error (User not logged in)
      throw new Meteor.Error(
        'apinf-usernotloggedin-error',
        TAPi18n.__('apinf_usernotloggedin_error')
      );
    }
  },
});
