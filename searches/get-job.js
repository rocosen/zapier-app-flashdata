const { getJob } = require('../lib/api');
module.exports = {
  key: 'get_job', noun: 'Job',
  display: { label: 'Get Job', description: 'Finds an existing FlashData job by ID and returns its status. Does not submit or charge for a new query.' },
  operation: {
    inputFields: [{ key: 'job_id', label: 'Job ID', type: 'string', required: true, helpText: 'Use the ID from Run Query or your FlashData job history.' }],
    perform: async (z, bundle) => [await getJob(z, bundle)],
    sample: { id: 'job_sample', source: 'youtube_metadata', status: 'completed', credits: 0.01, createdAt: '2026-10-10T08:00:00.000Z', updatedAt: '2026-10-10T08:00:01.000Z' },
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'source', label: 'Source', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'credits', label: 'Credits', type: 'number' },
      { key: 'createdAt', label: 'Created At', type: 'datetime' },
      { key: 'updatedAt', label: 'Updated At', type: 'datetime' },
    ],
  },
};
