import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Feedback } from './';

Feedback.schema = new SimpleSchema({
  topic: {
    type: String,
    label: 'Topic',
    max: 50,
    optional: false,
    autoform: {
      placeholder: 'Feedback topic',
    },
  },
  message: {
    type: String,
    label: 'Your Message',
    max: 1000,
    optional: false,
    autoform: {
      rows: 5,
      placeholder: 'Your message',
    },
  },
  messageType: {
    type: String,
    label: 'Choose message type',
    allowedValues: ['Feedback', 'Error report', 'Feature request'],
    autoform: {
      options: [
        { label: 'Feedback', value: 'Feedback' },
        { label: 'Error report', value: 'Error report' },
        { label: 'Feature request', value: 'Feature request' },
      ],
    },
  },
  authorId: {
    type: String,
    autoValue () {
      if (this.isInsert) {
        return Meteor.userId();
      }

      this.unset();
    },
    denyUpdate: true,
  },
  apiBackendId: {
    type: String,
  },
  createdAt: {
    type: Date,
    autoValue () {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return { $setOnInsert: new Date() };
      }

      this.unset();
    },
  },
});

Feedback.attachSchema(Feedback.schema);
