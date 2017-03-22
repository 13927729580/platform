/* Copyright 2017 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

// Collection imports
import ApiBacklogItems from '/backlog/collection';
import ApiDocs from '/api_docs/collection';
import Feedback from '/feedback/collection';
import Organizations from '/organizations/collection';
import OrganizationApis from '/organization_apis/collection';
import ProxyBackends from '/proxy_backends/collection';
import Apis from '../';

// eslint-disable-next-line prefer-arrow-callback
Meteor.publish('userManagedApis', function () {
  // Get current user id
  const userId = this.userId;

  // Get API Backends that user manages
  return Apis.find({ managerIds: userId });
});

Meteor.publish('apiBackend', (apiBackendId) => {
  // Make sure apiBackendId is a String
  check(apiBackendId, String);

  return Apis.find({ _id: apiBackendId });
});

Meteor.publish('apisByIds', (apiIds) => {
  // Make sure apiIds is an Array
  check(apiIds, Array);

  // Find one or more APIs using an array of API IDs
  return Apis.find({ _id: { $in: apiIds } });
});

// eslint-disable-next-line prefer-arrow-callback
Meteor.publish('userVisibleApis', function (slug) {
  // Make sure organization slug is a String type
  check(slug, String);

  // Get related organization document
  const organization = Organizations.findOne({ slug });

  let apis = [];

  // If organization exists
  if (organization) {
    // Get cursor on APIs collection which are visible for current user in organization profile
    apis = organization.userVisibleApisCursor(this.userId);
  }
  // Return cursor or empty array to flag publication as ready
  return apis;
});

Meteor.publish('latestPublicApis', (limit) => {
  // Make sure limit is a Number
  check(limit, Number);

  // Return cursor to latest API Backends
  return Apis.find(
    { isPublic: true },
    { sort: { created_at: -1 }, limit }
  );
});

// Publish collection for pagination
// eslint-disable-next-line no-new
new Meteor.Pagination(Apis);

Meteor.publishComposite('apiComposite', (apiId) => {
  check(apiId, String);
  return {
    find () {
      return Apis.find({ _id: apiId });
    },
    children: [
      {
        find (api) {
          // Get related API feedback items
          return Feedback.find({ apiBackendId: api._id });
        },
      },
      {
        find (api) {
          // Get related API Backlog items
          return ApiBacklogItems.find({ apiBackendId: api._id });
        },
      },
      {
        find (api) {
          // Get related the public details of an authorized user
          return Meteor.users.find(
            { _id: { $in: api.authorizedUserIds } },
            { fields: { username: 1, emails: 1, _id: 1 } }
          );
        },
      },
      {
        find (api) {
          // Make sure a user can edit this API
          if (Meteor.userId()) {
            // Get related proxy backend configuration
            return ProxyBackends.find({ apiId: api._id });
          }
          // Return an empty cursor
          return [];
        },
      },
      {
        find (api) {
          // Get related documentation
          return ApiDocs.find({ apiId: api._id });
        },
      },
      {
        find (api) {
          // Get API organization
          const organization = api.organization();

          // Check if it has one
          if (organization) {
            // Get organization ID
            const organizationId = organization._id;

            // Return that organization
            return Organizations.find({ _id: organizationId });
          }

          return undefined;
        },
      },
      {
        find () {
          return OrganizationApis.find({ apiId });
        },
      },
    ],
  };
});
