import moment from 'moment';

Template.backlogItem.helpers({
  relativeTimeStamp: function (givenTimeStamp) {

    return moment(givenTimeStamp).fromNow();

  },
  itemPriorityClass: function (priority) {

    var priorityClass = "";

    // Check priority value & return specific CSS class for label to display
    switch (priority) {
      case 2:

        priorityClass = 'priority priority-high';

        break;
      case 1:

        priorityClass = 'priority priority-middle';

        break;
      case 0:

        priorityClass = 'priority priority-low';

        break;
    }

    return priorityClass;

  },
  currentUserCanEditBacklog: function() {
    /*
     API Backlog shares permissions with the API Backend
     Make sure user can edit API Backend before allowing Metadata permissions
    */

    // Check if current user can edit API Backend
    return this.apiBackend.currentUserCanEdit();
  },
  currentUserIsOwner: function (backlogItem) {
    // Get current User ID
    const currentUser = Meteor.userId();

    // Check if current User ID matches backlog User ID
    return currentUser === backlogItem.userId;
  }
});
