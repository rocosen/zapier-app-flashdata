const { fail } = require('./api');
const choices = {
  google_search: 'Google Search',
  youtube_search: 'YouTube Search',
  youtube_metadata: 'YouTube Video Metadata',
  youtube_transcript: 'YouTube Video Transcript',
};
const fields = {
  query: { label: 'Search Query', type: 'string', required: true, helpText: 'Between 1 and 2,000 characters.' },
  video_id: { label: 'YouTube Video ID', type: 'string', required: true, helpText: 'The 11-character video ID, for example dQw4w9WgXcQ.' },
  num: { label: 'Requested Results', type: 'integer', helpText: '1–100. Actual count varies by query. Omit to use the provider default.' },
  page: { label: 'Page', type: 'integer', helpText: '1–100. Each page is a separate paid query. No automatic pagination.' },
  gl: { label: 'Country Code', type: 'string', helpText: 'Two-letter code, for example US.' },
  hl: { label: 'Interface Language', type: 'string', helpText: 'Language code, for example en.' },
  location: { label: 'Search Location', type: 'string' },
  tbs: { label: 'Search Filter (TBS)', type: 'string', helpText: 'Google search filter, for example qdr:w.' },
  autocorrect: { label: 'Autocorrect', type: 'boolean' },
  max_results: { label: 'Maximum Results', type: 'integer', default: '20', helpText: '1–20.' },
  include_formats: { label: 'Include Media Formats', type: 'boolean', default: 'true' },
  include_chapters: { label: 'Include Chapters', type: 'boolean', default: 'true' },
  language: { label: 'Transcript Language', type: 'string', default: 'en', helpText: 'Exact language code. No automatic language fallback.' },
  auto: { label: 'Automatically Generated Captions', type: 'boolean', default: 'true', helpText: 'Yes selects automatic captions; No selects manual captions. No fallback between the two.' },
};
const sourceFields = {
  google_search: ['query', 'num', 'page', 'gl', 'hl', 'location', 'tbs', 'autocorrect'],
  youtube_search: ['query', 'max_results'],
  youtube_metadata: ['video_id', 'include_formats', 'include_chapters'],
  youtube_transcript: ['video_id', 'language', 'auto'],
};

const inputFields = (z, bundle) => (sourceFields[bundle.inputData.source] || []).map(key => ({ key, ...fields[key] }));

function buildQuery(z, input) {
  const keys = sourceFields[input.source];
  if (!keys) fail(z, 'Select one of the supported data sources.', 'InvalidSource');
  const body = { source: input.source, params: {} };
  for (const key of keys) {
    const field = fields[key];
    let value = input[key];
    if (value === undefined || value === null || value === '') {
      if (field.required) fail(z, `${field.label} is required.`, 'InvalidInput');
      continue;
    }
    if (field.type === 'boolean') {
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      if (typeof value !== 'boolean') fail(z, `${field.label} must be Yes or No.`, 'InvalidInput');
    } else if (field.type === 'integer') {
      if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
      const maximum = key === 'max_results' ? 20 : 100;
      if (!Number.isInteger(value) || value < 1 || value > maximum) fail(z, `${field.label} must be an integer from 1 to ${maximum}.`, 'InvalidInput');
    } else {
      if (typeof value !== 'string') fail(z, `${field.label} must be text.`, 'InvalidInput');
      value = value.trim();
      const max = key === 'query' ? 2000 : ['location', 'tbs'].includes(key) ? 200 : 35;
      if (!value || value.length > max) fail(z, `${field.label} must contain 1–${max} characters.`, 'InvalidInput');
      if (key === 'video_id' && !/^[A-Za-z0-9_-]{11}$/.test(value)) fail(z, 'Enter an 11-character YouTube video ID.', 'InvalidInput');
      if (key === 'gl' && !/^[A-Za-z]{2}$/.test(value)) fail(z, 'Enter a two-letter country code.', 'InvalidInput');
      if (['hl', 'language'].includes(key) && !/^[A-Za-z0-9-]{1,35}$/.test(value)) fail(z, 'Enter a valid language code.', 'InvalidInput');
    }
    if (['query', 'video_id'].includes(key)) body[key] = value;
    else body.params[key] = value;
  }
  return body;
}
module.exports = { choices, inputFields, buildQuery };
