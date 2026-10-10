const { version: platformVersion } = require('zapier-platform-core');
const { getAccess } = require('./lib/api');
const runQuery = require('./creates/run-query');
const getJob = require('./searches/get-job');
const getJobResults = require('./searches/get-job-results');

module.exports = {
  version: require('./package.json').version,
  platformVersion,
  flags: { cleanInputData: false },
  authentication: {
    type: 'custom',
    fields: [{
      key: 'api_key', label: 'API Key', type: 'password', required: true,
      helpText: 'Create an API key in your [FlashData dashboard](https://flashdata.dev/app/api-keys). The connection test is free.',
    }],
    test: getAccess,
  },
  creates: { [runQuery.key]: runQuery },
  searches: { [getJob.key]: getJob, [getJobResults.key]: getJobResults },
};
