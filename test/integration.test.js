const { test, afterEach, before } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const nock = require('nock');
const { createAppTester } = require('zapier-platform-core');
const App = require('../index');
const { MAX_RESPONSE_BYTES } = require('../lib/api');
const { inputFields } = require('../lib/query');
const appTester = createAppTester(App);
const authData = { api_key: 'test-secret-not-a-real-key' };
const API = 'https://api.flashdata.dev';
const DATA = 'https://data.flashdata.dev';
const STORAGE = 'https://results.example.test';
const inputData = { job_id: 'job_fixture' };
const bundle = { authData, inputData };
const access = () => nock(API).get('/v2/api-access').matchHeader('X-API-Key', authData.api_key).reply(200, { sources: ['youtube_metadata'], result_origin: STORAGE });
const link = target => nock(API).get('/v2/jobs/job_fixture/results').reply(302, '', { Location: target });

before(() => nock.disableNetConnect());
afterEach(() => {
  const pending = nock.pendingMocks();
  nock.cleanAll();
  assert.deepEqual(pending, [], `Unconsumed requests: ${pending}`);
});

test('authentication uses only the free API-access endpoint', async () => {
  access();
  const result = await appTester(App.authentication.test, { authData });
  assert.deepEqual(result.sources, ['youtube_metadata']);
});

test('invalid authentication produces a reconnection message', async () => {
  nock(API).get('/v2/api-access').reply(401, { error: 'invalid' });
  await assert.rejects(appTester(App.authentication.test, { authData }), /Reconnect/);
});

test('changing source exposes only applicable inputs', () => {
  assert.deepEqual(inputFields(null, { inputData: { source: 'youtube_transcript' } }).map(f => f.key), ['video_id', 'language', 'auto']);
  assert.ok(inputFields(null, { inputData: { source: 'google_search' } }).some(f => f.key === 'page'));
});

const queryCases = [
  { input: { source: 'google_search', query: '  Zapier automation  ', num: 5, page: 2, autocorrect: false }, body: { source: 'google_search', query: 'Zapier automation', params: { num: 5, page: 2, autocorrect: false } } },
  { input: { source: 'youtube_search', query: 'workflow automation', max_results: '2', page: 99 }, body: { source: 'youtube_search', query: 'workflow automation', params: { max_results: 2 } } },
  { input: { source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ', include_formats: false, include_chapters: 'false' }, body: { source: 'youtube_metadata', video_id: 'dQw4w9WgXcQ', params: { include_formats: false, include_chapters: false } } },
  { input: { source: 'youtube_transcript', video_id: 'dQw4w9WgXcQ', language: 'en', auto: false }, body: { source: 'youtube_transcript', video_id: 'dQw4w9WgXcQ', params: { language: 'en', auto: false } } },
];
for (const item of queryCases) {
  test(`one asynchronous submission with correct ${item.input.source} parameters`, async () => {
    nock(DATA).post('/v1/queries', item.body).matchHeader('X-API-Key', authData.api_key)
      .reply(200, { id: 'job_fixture', source: item.input.source, status: 'pending', usage: { credits: 0.01 } });
    const result = await appTester(App.creates.run_query.operation.perform, { authData, inputData: item.input });
    assert.equal(result.id, 'job_fixture');
    assert.equal(result.status, 'pending');
  });
}

test('invalid inputs fail before any paid API request', async () => {
  for (const input of [
    { source: 'unknown' }, { source: 'google_search', query: ' ' },
    { source: 'google_search', query: 'x', page: 0 },
    { source: 'youtube_search', query: 'x', max_results: 21 },
    { source: 'youtube_metadata', video_id: 'https://youtu.be/dQw4w9WgXcQ' },
    { source: 'youtube_transcript', video_id: 'dQw4w9WgXcQ', auto: 'maybe' },
  ]) await assert.rejects(appTester(App.creates.run_query.operation.perform, { authData, inputData: input }), /Invalid(Source|Input)/);
});

for (const status of [429, 503]) {
  test(`paid POST ${status} is not automatically retried or converted to ThrottledError`, async () => {
    let requests = 0;
    nock(DATA).post('/v1/queries').reply(() => { requests++; return [status, {}]; });
    await assert.rejects(appTester(App.creates.run_query.operation.perform, { authData, inputData: queryCases[2].input }), error => {
      assert.doesNotMatch(error.name, /Throttled/);
      assert.match(error.message, /retrying|existing jobs/);
      return true;
    });
    assert.equal(requests, 1);
  });
}

test('network failure on paid POST reports uncertain submission without retry', async () => {
  nock(DATA).post('/v1/queries').replyWithError('socket hang up');
  await assert.rejects(appTester(App.creates.run_query.operation.perform, { authData, inputData: queryCases[2].input }), /could not be confirmed/);
});

test('job status preserves a pending job and never resubmits it', async () => {
  nock(API).get('/v2/jobs/job_fixture').reply(200, { job: { id: 'job_fixture', status: 'pending' } });
  const result = await appTester(App.searches.get_job.operation.perform, bundle);
  assert.deepEqual(result, [{ id: 'job_fixture', status: 'pending' }]);
});

test('job IDs cannot inject a path or query string', async () => {
  await assert.rejects(appTester(App.searches.get_job.operation.perform, { authData, inputData: { job_id: 'job_x/../../api-access' } }), /InvalidJobId/);
});

test('gzip result is decoded and credentials are absent on storage request', async () => {
  access(); link(`${STORAGE}/result.json.gz?signature=fixture`);
  const result = { source: 'youtube_metadata', status: 'done', results: [{ video_id: 'dQw4w9WgXcQ' }], usage: { credits: 0.01 } };
  nock(STORAGE).get('/result.json.gz?signature=fixture').reply(function () {
    for (const key of ['x-api-key', 'authorization', 'cookie']) assert.equal(this.req.headers[key], undefined);
    return [200, gzipSync(JSON.stringify(result)), { 'Content-Encoding': 'gzip', 'Content-Type': 'application/json' }];
  });
  const output = await appTester(App.searches.get_job_results.operation.perform, bundle);
  assert.equal(output[0].id, 'job_fixture');
  assert.deepEqual(JSON.parse(output[0].result_json), result);
});

for (const [status, message] of [[404, /not found/], [409, /not finished/], [410, /expired/], [422, /job failed/]]) {
  test(`result ${status} gives actionable error without creating another query`, async () => {
    access();
    nock(API).get('/v2/jobs/job_fixture/results').reply(status, {});
    await assert.rejects(appTester(App.searches.get_job_results.operation.perform, bundle), message);
  });
}

for (const url of ['https://evil.example/result', `${STORAGE}/result#fragment`, 'https://user:password@results.example.test/result', 'http://results.example.test/result', 'file:///result']) {
  test(`untrusted result location is not requested: ${url}`, async () => {
    access(); link(url);
    await assert.rejects(appTester(App.searches.get_job_results.operation.perform, bundle), /InvalidResultOrigin/);
  });
}

test('a second storage redirect is never followed', async () => {
  access(); link(`${STORAGE}/result`);
  nock(STORAGE).get('/result').reply(302, '', { Location: 'https://evil.example/result' });
  await assert.rejects(appTester(App.searches.get_job_results.operation.perform, bundle), /ResultUnavailable/);
});

test('array result is rejected instead of being returned as a valid envelope', async () => {
  access(); link(`${STORAGE}/result`);
  nock(STORAGE).get('/result').reply(200, []);
  await assert.rejects(appTester(App.searches.get_job_results.operation.perform, bundle), /InvalidResponse/);
});

test('4 MiB limit applies after gzip decompression', async () => {
  access(); link(`${STORAGE}/result`);
  nock(STORAGE).get('/result').reply(200, gzipSync(JSON.stringify({ large: 'x'.repeat(MAX_RESPONSE_BYTES) })), { 'Content-Encoding': 'gzip', 'Content-Type': 'application/json' });
  await assert.rejects(appTester(App.searches.get_job_results.operation.perform, bundle), /4 MiB/);
});
