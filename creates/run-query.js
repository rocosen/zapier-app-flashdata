const { DATA_ORIGIN, apiRequest, requireObject, fail } = require('../lib/api');
const { choices, inputFields, buildQuery } = require('../lib/query');

module.exports = {
  key: 'run_query', noun: 'Query',
  display: {
    label: 'Run Query',
    description: 'Submits a paid asynchronous query for Google search or YouTube search, video metadata, or transcripts. Returns a job ID.',
  },
  operation: {
    inputFields: [{
      key: 'source', label: 'Data Source', type: 'string', required: true,
      choices, altersDynamicFields: true,
      helpText: 'Sources are provided by FlashData. Each execution submits one paid query. Use Get Job and Get Job Results with its ID; do not repeat submission to wait for results.',
    }, inputFields],
    perform: async (z, bundle) => {
      const body = buildQuery(z, bundle.inputData);
      const response = await apiRequest(z, bundle, `${DATA_ORIGIN}/v1/queries`, { method: 'POST', body });
      if (![200, 202].includes(response.status)) fail(z, 'Unexpected submission response. Check FlashData job history before retrying.', 'InvalidResponse', 502);
      const job = requireObject(z, response.data);
      if (typeof job.id !== 'string' || !/^job_[A-Za-z0-9_-]+$/.test(job.id)) fail(z, 'No valid job ID was returned. Check FlashData job history before retrying.', 'InvalidResponse', 502);
      return job;
    },
    sample: { id: 'job_sample', source: 'youtube_metadata', status: 'pending', usage: { credits: 0.01 }, created_at: '2026-10-10T08:00:00.000Z' },
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'source', label: 'Source', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'usage__credits', label: 'Charged Credits', type: 'number' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
    ],
  },
};
