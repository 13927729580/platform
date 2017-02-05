import { Meteor } from 'meteor/meteor';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import $ from 'jquery';

import DocumentationFiles from '/documentation/collection';
import { Settings } from '/settings/collection';

Template.apiDocumentation.onCreated(function () {
  const instance = this;

  // Run subscription in autorun
  instance.autorun(() => {
    // Get current documentation file Id
    const documentationFileId = Template.currentData().api.documentationFileId;

    if (documentationFileId) {
      // Subscribe to documentation
      instance.subscribe('singleDocumentationFile', documentationFileId);
    }
  });

  // Subscribe to code generator settings
  instance.subscribe('singleSetting', 'sdkCodeGenerator');
});

Template.apiDocumentation.onRendered(() => {
  $('[data-toggle="popover"]').popover();
});

Template.apiDocumentation.helpers({
  uploadedDocumentationLink () {
    const documentationFileId = this.api.documentationFileId;

    // Convert to Mongo ObjectID
    const objectId = new Mongo.Collection.ObjectID(documentationFileId);

    // Get documentation file Object
    const documentationFile = DocumentationFiles.findOne(objectId);

    // Check if documentation file is available
    if (documentationFile) {
      // Get documentation file URL
      return `${Meteor.absoluteUrl().slice(0, -1) + DocumentationFiles.baseURL}/id/${documentationFileId}`;
    }
  },
  documentationLink () {
    // get documentation link
    const documentationLink = this.api.documentation_link;
    // check if exists
    if (documentationLink) {
      return documentationLink;
    }
  },
  documentationExists () {
    const api = this.api;
    if (api.documentationFileId) {
      return true;
    }
  },
  codegenServerExists () {
    // Get template instance
    const instance = Template.instance();

    // Get settings
    const settings = Settings.findOne();

    // Check documentation exists, generator is enabled and host setting exists
    if (
      settings &&
      settings.sdkCodeGenerator &&
      settings.sdkCodeGenerator.host &&
      settings.sdkCodeGenerator.enabled
    ) {
      // Get code generator host
      instance.codegenServer = settings.sdkCodeGenerator.host;

      // Generator is enabled and has host setting, return true
      return true;
    }
  },

});

Template.apiDocumentation.events({
  'click #manage-api-documentation': function (event, instance) {
    // Get reference to API backend
    const api = instance.data.api;
    // Show the manage API documentation form
    Modal.show('manageApiDocumentationModal', { api });
  },
  'click #sdk-code-generator': function (event, instance) {
    // Get reference to API backend
    const api = instance.data.api;
    // Get reference to Code Generator host
    const host = instance.codegenServer;
    // Show the SDK Code generator form
    Modal.show('sdkCodeGeneratorModal', { api, host });
  },
});
