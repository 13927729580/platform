// Meteor imports
import { Template } from 'meteor/templating';

Template.viewApiStatus.onCreated(function () {
  // Create reference to instance
  const instance = this;

  // Get API Backend from instance data context
  const api = instance.data.api;

  // attaches function to template instance to be able to call it in outside
  instance.getApiStatus = (url) => {
    Meteor.call('getApiStatus', url, (err, status) => {
      // Status object contents:
      // status = {
      //   statusCode      : <integer>,
      //   responseContext : <object>,
      //   errorMessage    : <String>
      // };

      // Init indicator element
      const apiStatusIndicator = $('.api-status-indicator-' + api._id);

      // Init regEx for status codes
      const success = /^2[0-9][0-9]$/;
      const redirect = /^3[0-9][0-9]$/;
      const clientErr = /^4[0-9][0-9]$/;
      const serverErr = /^5[0-9][0-9]$/;

      let className = '';
      let statusText = '';

      // Check which status code is received
      // and display text depending on it
      if (success.test(status.code)) {
        className = 'status-success';
        statusText = `
          ${TAPi18n.__('viewApiStatus_statusMessage_Success')}
          `;
      } else if (redirect.test(status.code)) {
        className = 'status-success';
        statusText = `
          ${TAPi18n.__('viewApiStatus_statusMessage_ErrorCodeText')}
          ${status.code}.
          ${TAPi18n.__('viewApiStatus_statusMessage_RedirectError')}
        `;
      } else if (clientErr.test(status.code)) {
        className = 'status-warning';
        statusText = `
          ${TAPi18n.__('viewApiStatus_statusMessage_ErrorCodeText')}
          ${status.code}.
          ${TAPi18n.__('viewApiStatus_statusMessage_ClientError')}
        `;
      } else if (serverErr.test(status.code)) {
        className = 'alert-danger';
        statusText = `
          ${TAPi18n.__('viewApiStatus_statusMessage_ErrorCodeText')}
          ${status.code}.
          ${TAPi18n.__('viewApiStatus_statusMessage_ServerError')}
        `;
      }

      apiStatusIndicator
        .addClass(className)
        .attr('data-original-title', statusText);
    });
  };
});

Template.viewApiStatus.onRendered(function () {
  // Get reference to template instance
  const instance = this;

  // Get API Backend from instance data context
  const api = instance.data.api;

  // Make sure URL is available, to prevent console error
  if (api && api.url) {
    // create request url based on API URL
    const url = api.url;

    // call the function that updates status
    instance.getApiStatus(url);

    // Init tooltip
    $('[data-toggle="tooltip"]').tooltip();
  } else {
    // Hide the status indicator
    $('.api-status-indicator-' + api._id).hide();
  }
});
