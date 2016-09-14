import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { ProxyBackends } from '/proxy_backends/collection';

import moment from 'moment';
import _ from 'lodash';

Template.dashboard.onCreated(function () {
  // Get reference to template instance
  const instance = this;

  // Keeps ES data for charts
  instance.chartData = new ReactiveVar();
  // Keeps chart data loading state
  instance.chartDataLoadingState = new ReactiveVar(false);

  // Keeps date format for moment.js
  instance.dateFormatMoment = 'DD MMM YYYY';

  // Init default time frame (from: 2weeks ago, to: now)
  instance.analyticsTimeframeStart = new ReactiveVar(moment().subtract(1, 'month'));
  instance.analyticsTimeframeEnd = new ReactiveVar(moment());

  const userId = Meteor.userId();

  instance.subscribe('proxyApis');

  if (Roles.userIsInRole(userId, ['admin'])) {
    // Subscribe to publication
    instance.subscribe('allApiBackends');
  } else {
    // Subscribe to publication
    instance.subscribe('myManagedApis');
  }

  instance.checkElasticsearch = function () {
    return new Promise((resolve, reject) => {
      Meteor.call('elasticsearchIsDefined', (err, res) => {
        if (err) reject(err);

        resolve(res);
      });
    });
  };

  instance.getChartData = function (params) {
    return new Promise((resolve, reject) => {
      Meteor.call('getElasticSearchData', params, (err, res) => {
        if (err) reject(err);
        resolve(res.hits.hits);
      });
    });
  };

  instance.autorun(() => {
    if (instance.subscriptionsReady()) {
      // Get APIs managed by user
      const proxyBackends = ProxyBackends.find().fetch();

      const apis = _.map(proxyBackends, proxyBackend => {
        const api = proxyBackend.apiUmbrella;
        api._id = proxyBackend.apiId;
        return api;
      });

      // Construct parameters for elasticsearch
      const params = {
        size: 50000,
        body: {
          query: {
            filtered: {
              filter: {
                range: {
                  request_at: { },
                },
              },
            },
          },
          sort: [
            { request_at: { order: 'desc' } },
          ],
          fields: [
            'request_at',
            'response_status',
            'response_time',
            'request_ip_country',
            'request_ip',
            'request_path',
            'user_id',
          ],
        },
      };

      if (apis.length > 0) {
        const q = _.map(apis, (api) => {
          return {
            wildcard: {
              request_path: {
                // Add '*' to partially match the url
                value: `${api.url_matches[0].frontend_prefix}*`,
              },
            },
          };
        });

        // Init varuable to keep elasticsearch sub-query
        params.body.query.filtered.query = {
          bool: {
            should: [q],
          },
        };
      }

      // ******* Filtering by date *******
      const analyticsTimeframeStart = instance.analyticsTimeframeStart.get();
      const analyticsTimeframeEnd = instance.analyticsTimeframeEnd.get();

      // Check if timeframe values are set
      if (analyticsTimeframeStart && analyticsTimeframeEnd) {
        // Update elasticsearch query with filter data (in Unix format)
        params.body.query.filtered.filter.range.request_at.gte = analyticsTimeframeStart.valueOf();
        params.body.query.filtered.filter.range.request_at.lte = analyticsTimeframeEnd.valueOf();
      }
      // ******* End filtering by date *******

      // Set loader
      instance.chartDataLoadingState.set(true);

      instance.checkElasticsearch()
        .then((elasticsearchIsDefined) => {
          if (elasticsearchIsDefined) {
            instance.getChartData(params)
              .then((chartData) => {
                // Update reactive variable
                instance.chartData.set(chartData);

                instance.chartDataLoadingState.set(false);
              })
              .catch(err => console.error(err));
          } else {
            console.error('Elasticsearch is not defined!');

            Router.go('/catalogue');
          }
        })
        .catch(err => console.error(err));
    }
  });
});

Template.dashboard.onRendered(function () {
  const instance = this;

  // Get timeframe values
  const analyticsTimeframeStart = instance.analyticsTimeframeStart.get();
  const analyticsTimeframeEnd = instance.analyticsTimeframeEnd.get();

  // Format timeframe values
  const analyticsTimeframeStartFormatted = analyticsTimeframeStart.format(instance.dateFormatMoment);
  const analyticsTimeframeEndFormatted = analyticsTimeframeEnd.format(instance.dateFormatMoment);

  // Update date range fields with default dates
  $('#analytics-timeframe-start').val(analyticsTimeframeStartFormatted);
  $('#analytics-timeframe-end').val(analyticsTimeframeEndFormatted);
});

Template.dashboard.events({
  'change #select-timeframe-form': function (event) {
    event.preventDefault();

    const instance = Template.instance();

    // Get timeframe dates from input fields
    const analyticsTimeframeStartElementValue = $('#analytics-timeframe-start').val();
    const analyticsTimeframeEndElementValue = $('#analytics-timeframe-end').val();

    // Check if timeframe values are set
    if (analyticsTimeframeStartElementValue !== '' && analyticsTimeframeEndElementValue !== '') {
      // Format datepicker dates (DD.MM.YYYY) to moment.js object
      const analyticsTimeframeStartMoment = moment(analyticsTimeframeStartElementValue, instance.dateFormatMoment);
      const analyticsTimeframeEndMoment = moment(analyticsTimeframeEndElementValue, instance.dateFormatMoment);

      /*
       *  To avoid resending request with the same time frame and
       *  allowing to select dates bigger than current date, check:
       *    - If the new selected start-date is the same as previously selected start-date
       *    - If the new selected end-date is the same as previously selected end-date
       */
      if ((analyticsTimeframeStartElementValue !== instance.analyticsTimeframeStart.get().format(instance.dateFormatMoment)) ||
      (analyticsTimeframeEndElementValue !== instance.analyticsTimeframeEnd.get().format(instance.dateFormatMoment))) {
        // Get reference to chart html elemets
        const chartElemets = $('#requestsOverTime-chart, #overviewChart-chart, #statusCodeCounts-chart, #responseTimeDistribution-chart');

        // Set loader
        chartElemets.addClass('loader');

        // If pass all checks, update reactive variables
        instance.analyticsTimeframeStart.set(analyticsTimeframeStartMoment);
        instance.analyticsTimeframeEnd.set(analyticsTimeframeEndMoment);
      }
    }
  },
});

Template.dashboard.helpers({
  chartData () {
    const instance = Template.instance();

    return instance.chartData.get();
  },
  loadingState () {
    const instance = Template.instance();

    return instance.chartDataLoadingState.get();
  },
});
