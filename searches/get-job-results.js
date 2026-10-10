const { getResults } = require('../lib/api');
module.exports = {
  key: 'get_job_results', noun: 'Job Result',
  display: { label: 'Get Job Results', description: 'Finds the JSON result of a completed FlashData job. Results are available for 24 hours after completion; reads do not submit a new query.' },
  operation: {
    inputFields: [{ key: 'job_id', label: 'Job ID', type: 'string', required: true, helpText: 'Use an existing completed job ID. Add a delay after Run Query and check Get Job status first.' }],
    perform: async (z, bundle) => [await getResults(z, bundle)],
    sample: { id: 'job_sample', source: 'youtube_metadata', status: 'completed', result_json: '{"source":"youtube_metadata","status":"completed","results":[{"video_id":"dQw4w9WgXcQ","title":"Example video"}],"usage":{"credits":0.01}}' },
    outputFields: [
      { key: 'id', label: 'Job ID', type: 'string' },
      { key: 'source', label: 'Source', type: 'string' },
      { key: 'status', label: 'Result Status', type: 'string' },
      { key: 'result_json', label: 'Result JSON', type: 'string' },
    ],
  },
};
