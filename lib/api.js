const API_ORIGIN = 'https://api.flashdata.dev';
const DATA_ORIGIN = 'https://data.flashdata.dev';
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

const fail = (z, message, code, status = 400) => {
  throw new z.errors.Error(message, code, status);
};

async function apiRequest(z, bundle, url, { method = 'GET', body } = {}) {
  // Authentication is attached only here, never to signed object-storage requests.
  let response;
  try {
    response = await z.request({
      url, method, body,
      headers: { 'X-API-Key': bundle.authData.api_key, Accept: 'application/json' },
      redirect: 'manual', size: MAX_RESPONSE_BYTES, timeout: 20000,
      skipThrowForStatus: true, throwForThrottlingEarly: false,
    });
  } catch {
    fail(z, method === 'POST'
      ? 'The query submission could not be confirmed. Check FlashData job history before retrying: a new submission may charge credits again.'
      : 'FlashData could not be reached. Retry this read operation; do not submit a new paid query.',
    'FlashDataRequestFailed', 502);
  }
  const messages = {
    401: 'The API key is invalid or expired. Reconnect your FlashData account.',
    402: 'Your FlashData account has insufficient credits. Check your balance before submitting another query.',
    403: 'This API key does not permit the selected source or operation. Check its permissions in FlashData.',
    404: 'The job was not found or is not accessible to this API key.',
    409: 'The job is not finished. Add a delay, then retry reading the same job ID. Do not submit the query again.',
    410: 'The result has expired. Results are available for 24 hours after completion.',
    422: 'The job failed. Read its status for details before deciding whether to submit a new paid query.',
    429: 'FlashData rate or concurrency limit reached. Check existing jobs before retrying a paid query.',
  };
  if (response.status >= 400) {
    fail(z, messages[response.status] || (method === 'POST'
      ? 'FlashData could not confirm the query. Check job history before retrying; repeated submissions can charge credits again.'
      : 'FlashData could not return this resource. Retry reading the same job ID.'),
    `FlashData${response.status}`, response.status);
  }
  return response;
}

function requireObject(z, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(z, 'FlashData returned an unexpected response.', 'InvalidResponse', 502);
  }
  return value;
}

async function getAccess(z, bundle) {
  const response = await apiRequest(z, bundle, `${API_ORIGIN}/v2/api-access`);
  if (response.status !== 200) fail(z, 'Unexpected authentication response.', 'InvalidResponse', 502);
  const access = requireObject(z, response.data);
  if (!Array.isArray(access.sources)) fail(z, 'Unexpected authentication response.', 'InvalidResponse', 502);
  return access;
}

function jobId(z, input) {
  if (typeof input !== 'string' || !/^job_[A-Za-z0-9_-]+$/.test(input)) {
    fail(z, 'Enter the job ID returned by Run Query, starting with job_.', 'InvalidJobId');
  }
  return input;
}

async function getJob(z, bundle) {
  const id = jobId(z, bundle.inputData.job_id);
  const response = await apiRequest(z, bundle, `${API_ORIGIN}/v2/jobs/${encodeURIComponent(id)}`);
  if (response.status !== 200) fail(z, 'Unexpected job response.', 'InvalidResponse', 502);
  const job = requireObject(z, response.data?.job);
  if (job.id !== id) fail(z, 'Unexpected job ID in response.', 'InvalidResponse', 502);
  return job;
}

async function getResults(z, bundle) {
  const id = jobId(z, bundle.inputData.job_id);
  const access = await getAccess(z, bundle);
  const link = await apiRequest(z, bundle, `${API_ORIGIN}/v2/jobs/${encodeURIComponent(id)}/results`);
  let target;
  try {
    const origin = new URL(access.result_origin);
    target = new URL(link.headers.get('location'));
    if (link.status !== 302 || origin.protocol !== 'https:' || target.protocol !== 'https:'
      || target.origin !== origin.origin || target.username || target.password || target.hash) {
      throw new Error('Untrusted result URL');
    }
  } catch {
    fail(z, 'The result storage URL could not be verified. Contact FlashData support; do not repeat the paid query.', 'InvalidResultOrigin', 502);
  }
  let response;
  try {
    // node-fetch decompresses Content-Encoding before enforcing its size limit.
    // No API key, Authorization or Cookie header is sent to object storage.
    response = await z.request({
      url: target.href, method: 'GET', headers: { Accept: 'application/json' },
      redirect: 'manual', size: MAX_RESPONSE_BYTES, timeout: 20000,
      skipThrowForStatus: true, throwForThrottlingEarly: false,
    });
  } catch {
    fail(z, 'The result could not be read or exceeds the 4 MiB limit. Retry this read or retrieve the result through FlashData.', 'ResultUnavailable', 502);
  }
  if (response.status !== 200) {
    fail(z, 'The result file is unavailable. Retry this read to obtain a fresh signed URL.', 'ResultUnavailable', 502);
  }
  const result = requireObject(z, response.data);
  return { id, source: result.source, status: result.status, result_json: JSON.stringify(result) };
}

module.exports = { API_ORIGIN, DATA_ORIGIN, MAX_RESPONSE_BYTES, fail, apiRequest, requireObject, getAccess, jobId, getJob, getResults };
