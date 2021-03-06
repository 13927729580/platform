/* Copyright 2017 Apinf Oy
This file is covered by the EUPL license.
You may obtain a copy of the licence at
https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11 */

// Meteor packages imports
import { Meteor } from 'meteor/meteor';

// Meteor contributed packages imports
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { DocHead } from 'meteor/kadira:dochead';

FlowRouter.route('/apis/new', {
  name: 'addApi',
  action () {
    // Check if API exists
    Meteor.call('currentUserCanAddApi', (error, canAdd) => {
      if (canAdd) {
        BlazeLayout.render('masterLayout', { bar: 'navbar', main: 'addApi' });
      } else {
        FlowRouter.go('forbidden');
      }
    });
  },
});

FlowRouter.route('/apis/:slug/', {
  name: 'viewApi',
  action (params) {
    // Get current API Backend ID
    const slug = params.slug;

    // Check if API exists
    Meteor.call('getApiBySlug', slug, (error, api) => {
      // Check if API exists
      if (api) {
        // Add RSS Link (only for public apis)
        if (api.isPublic) {
          DocHead.addLink({
            rel: 'alternate',
            type: 'application/rss+xml',
            href: `/rss/apis/?slug=${slug}`,
            // XSS: in title, instead of name, let's use the slug
            title: `RSS Feed for ${slug}`,
          });
        }

        // Set Social Meta Tags
        // Facebook & LinkedIn
        DocHead.addMeta({ property: 'og:image', content: api.logoUrl });
        // XSS: in title, instead of name, let's use the slug
        DocHead.addMeta({ property: 'og:title', content: slug });
        // DocHead.addMeta({ property: 'og:description', content: api.description });
        DocHead.addMeta({ property: 'og:url', content: window.location.href });

        // Twitter
        DocHead.addMeta({ property: 'twitter:card', content: 'summary' });
        // XSS: in title, instead of name, let's use the slug
        DocHead.addMeta({ property: 'twitter:title', content: slug });
        // DocHead.addMeta({ property: 'twitter:description', content: api.description });
        DocHead.addMeta({ property: 'twitter:image', content: api.logoUrl });

        // Ensure current user has permissions to view backend
        Meteor.call('currentUserCanViewApi', slug, (canViewError, userCanViewApi) => {
          if (userCanViewApi) {
            BlazeLayout.render('masterLayout', { bar: 'navbar', main: 'viewApi' });
          } else {
            // User is not allowed to view API
            FlowRouter.go('forbidden');
          }
        });
      } else {
        // If API doesn't exist, show 'Not Found'
        FlowRouter.go('notFound');
      }
    });
  },
});
