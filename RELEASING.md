# Release and review

The existing FlashData integration is **247540** on Zapier Platform **19.2.0**. CLI version **1.0.1 / Private** was deployed on 2026-10-10. The initial **1.0.0** was created in the UI; CLI push cannot overwrite that UI version and returned 403. Reuse the existing app and committed `.zapierapprc`; do not register another app.

1. Use Node 22 and run `npm ci`, `npm test`, and `npm run validate`.
2. Configure an authorized Zapier Deploy Key locally with `npx zapier-platform login --sso`. Keep the key outside Git and out of logs.
3. Run `npx zapier-platform link` and choose **FlashData (247540)**. Commit the generated `.zapierapprc` (app ID/key metadata, not the secret Deploy Key).
4. Run `npx zapier-platform validate` for the remote integration checks and address actionable results.
5. Use `npx zapier-platform push` to upload the version. If the UI-created version requires conversion or a new version, follow the official CLI/UI transition and preserve the existing app ID. Record the actual uploaded version.
6. Connect the development account and test all three operations in the Zap editor. Then publish/enable test Zaps and obtain at least one successful Zap history run for each operation. Record Zap IDs, run IDs, UTC times and API usage separately from local test results. Searches need a downstream action that consumes their output. Disable unnecessary schedules after validation; a disabled Zap is no longer live.
7. Prepare the public listing, company-domain integration administrator, public API documentation, non-expiring review account at `integration-testing@zapier.com`, and accurate disclosures. The API key used for development is not the reviewer account.
8. S001 additionally requires **at least three real users with live Zaps**. Live means switched on with a successful run in recent history. Each operation needs a live Zap (S002) and a successful task (T001). Editor tests and fabricated accounts do not satisfy real demand. Invite genuine pilot users, then rerun remote validation. See the [official integration checks](https://docs.zapier.com/integrations/publish/integration-checks-reference).
9. Use the integration's **Publishing** page and complete **Submit for Review**. Record the actual receipt/status. A private version or invite link is not a public directory listing.
10. After approval and directory publication, verify the public page and installation/use flow before reporting the channel live.

Remote validation must omit `--without-style`: `npx zapier-platform validate`. The package's `npm run validate` deliberately performs only local schema checks. The free authentication endpoint has no account identity to use for a connection label (D003), and API-key authentication cannot list jobs for a dynamic dropdown (D004). Do not invent identity values or add unsupported API calls to silence these general warnings.

The scope inquiry about third-party-source rules is already submitted and proceeds in parallel. Development is authorized to continue; no consultation reply or renamed action should be represented as publication approval. If review asks for changes, apply them to this app and repository.

Do not automatically replay a paid query after a timeout. Read existing jobs first. The production API has no documented idempotency key for this submission endpoint.
