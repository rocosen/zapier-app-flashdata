// Explicitly opt into one paid submission; subsequent runs reuse the saved job.
const fs = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
const { createAppTester } = require('zapier-platform-core');
const App = require('../index');
const tester = createAppTester(App);

async function main() {
  const source = process.argv[2];
  const receiptPath = process.argv[3];
  if (!receiptPath || !process.env.FLASHDATA_API_KEY_FILE) throw new Error('Usage: FLASHDATA_API_KEY_FILE=/private/key.json node scripts/live-check.js SOURCE /private/receipt.json [--submit-paid]');
  const authData = { api_key: JSON.parse(fs.readFileSync(process.env.FLASHDATA_API_KEY_FILE, 'utf8')).flashdataApiKey };
  if (!authData.api_key) throw new Error('No FlashData API key in the supplied file.');
  const inputs = {
    google_search: { source, query: 'FlashData API', num: 3, page: 2, autocorrect: false },
    youtube_search: { source, query: 'workflow automation', max_results: 2 },
    youtube_metadata: { source, video_id: 'dQw4w9WgXcQ', include_formats: false, include_chapters: false },
    youtube_transcript: { source, video_id: 'dQw4w9WgXcQ', language: 'en', auto: false },
  };
  if (!inputs[source]) throw new Error('Unknown source.');
  const access = await tester(App.authentication.test, { authData });
  if (!access.sources.includes(source)) throw new Error('API key does not permit this source.');
  let receipt;
  if (fs.existsSync(receiptPath)) {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    if (receipt.source !== source) throw new Error('Receipt belongs to another source.');
    if (!receipt.id) throw new Error('Earlier submission was not confirmed. Inspect FlashData job history before creating another query.');
  } else {
    if (!process.argv.includes('--submit-paid')) throw new Error('Use --submit-paid to permit one paid query.');
    receipt = { source, input: inputs[source], started_at: new Date().toISOString(), submission: 'unconfirmed' };
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600, flag: 'wx' });
    const job = await tester(App.creates.run_query.operation.perform, { authData, inputData: inputs[source] });
    Object.assign(receipt, { id: job.id, submission: 'accepted', credits: job.usage?.credits });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  }
  const bundle = { authData, inputData: { job_id: receipt.id } };
  for (let attempt = 0; attempt < 12; attempt++) {
    const [job] = await tester(App.searches.get_job.operation.perform, bundle);
    receipt.status = job.status;
    if (job.status === 'completed') {
      const [result] = await tester(App.searches.get_job_results.operation.perform, bundle);
      const data = JSON.parse(result.result_json);
      Object.assign(receipt, {
        verified_at: new Date().toISOString(), result_source: data.source,
        result_status: data.status, result_bytes: Buffer.byteLength(result.result_json),
        result_keys: Object.keys(data), result_count: Array.isArray(data.results) ? data.results.length : null,
      });
      fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
      console.log(JSON.stringify(receipt));
      return;
    }
    if (job.status === 'failed') throw new Error(`Job ${receipt.id} failed. Do not automatically resubmit.`);
    await delay(5000);
  }
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  throw new Error(`Job ${receipt.id} is still ${receipt.status}. Rerun without --submit-paid to reuse it.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
