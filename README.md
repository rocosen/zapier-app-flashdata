# FlashData for Zapier

FlashData's Zapier integration submits asynchronous data queries and retrieves existing job status and results. It uses each customer's FlashData API key against the production API.

**Status:** Version 1.0.1 is deployed to the private Zapier integration (app 247540). It has not been submitted for public directory review. Public source code does not mean App Directory approval.

## Operations

| Operation | Behavior |
| --- | --- |
| Run Query | Submits one paid asynchronous query and returns a job ID. Select Google Search, YouTube Search, YouTube Video Metadata, or YouTube Video Transcript. |
| Get Job | Finds an existing job by ID and returns its status without submitting another query. |
| Get Job Results | Finds a completed job's complete structured response as `Result JSON`, including source-specific results and usage. |

FlashData currently supports specific Google and YouTube data sources; this integration does not accept arbitrary website URLs. Source names are explicitly shown in the query selector. FlashData is not endorsed by those platforms. Eligibility for the public Zapier directory remains subject to review.

## Connect an account

Create an API key in the [FlashData dashboard](https://flashdata.dev/app/api-keys), with permission for the sources you intend to use. Enter it only in the Zapier connection dialog. The connection test calls the free `GET /v2/api-access` endpoint.

No key belongs in action fields, source files, examples, or issue reports. Authentication errors ask users to reconnect; insufficient credits and source restrictions are reported separately.

## Example workflow

1. Add a trigger of your choice.
2. Add **FlashData → Run Query**, select a source, and provide its required query or 11-character video ID.
3. Add a delay before reading the returned job ID. Use **Get Job** to check for `completed`; pending/processing means the same job needs more time.
4. Use **Get Job Results** with that ID. Map `Result JSON` into your downstream JSON processor, document, or research workflow.

A result-not-ready error is not permission to rerun the paid query. Retry only the read operation. Failed jobs and results that expired after the 24-hour window return distinct messages. No automatic language/caption fallback or pagination occurs. Google pages are individually charged. Explicit `false` settings are preserved.

Each Run Query execution can charge FlashData credits, including editor tests, manual replays, or Zapier Autoreplay. This integration performs one POST without SDK retry and does not request throttling replay. **The API does not provide an idempotency guarantee:** if a submission times out, inspect FlashData job history before replaying the action. Disable Autoreplay for the paid submission step where your Zapier plan permits it.

The result endpoint returns a short-lived storage redirect. The integration verifies its HTTPS origin against the authenticated API-access response, never forwards the API key to storage, does not follow further redirects, and limits decompressed JSON to 4 MiB. Retrieve larger results directly through FlashData.

## Development

Use Node.js 22, matching the [Zapier runtime](https://docs.zapier.com/integrations/build-cli/overview).

```sh
npm ci
npm test
npm run validate
```

`validate` performs the local schema check. Full remote checks require a Zapier deploy key. Unit tests use mocked HTTP through the actual Zapier core runtime, covering authentication, all four source contracts, paid-request retry boundaries, job errors, credential isolation, redirects, and gzip size limits.

The opt-in live check reads only `flashdataApiKey` from an external JSON credential file. It stores a receipt before submitting so uncertain or successful submissions are not silently repeated:

```sh
FLASHDATA_API_KEY_FILE='/private/credentials.json' node scripts/live-check.js youtube_metadata /private/metadata-receipt.json --submit-paid
# Recheck the same job, without another paid submission:
FLASHDATA_API_KEY_FILE='/private/credentials.json' node scripts/live-check.js youtube_metadata /private/metadata-receipt.json
```

Local/live API tests do not substitute for a published test Zap and successful Zap history. See [release steps](RELEASING.md).

## Links

- [FlashData](https://flashdata.dev)
- [API documentation](https://flashdata.dev/docs/api-reference)
- Support: support@flashdata.dev

MIT licensed. See [LICENSE](LICENSE).
