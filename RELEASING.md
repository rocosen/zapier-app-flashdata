# Release and review

The existing FlashData integration is **247540**, initially created as **1.0.0 / Private** on Zapier Platform **19.2.0**. Reuse it; do not register another app.

1. Use Node 22 and run `npm ci`, `npm test`, and `npm run validate`.
2. Configure an authorized Zapier Deploy Key locally with `npx zapier-platform login --sso`. Keep the key outside Git and out of logs.
3. Run `npx zapier-platform link` and choose **FlashData (247540)**. Commit the generated `.zapierapprc` (app ID/key metadata, not the secret Deploy Key).
4. Run `npx zapier-platform validate` for the remote integration checks and address actionable results.
5. Use `npx zapier-platform push` to upload the version. If the UI-created version requires conversion or a new version, follow the official CLI/UI transition and preserve the existing app ID. Record the actual uploaded version.
6. Connect the development account and test all three operations in the Zap editor. Then publish/enable test Zaps and obtain at least one successful Zap history run for each operation. Record Zap IDs, run IDs, UTC times and API usage separately from local test results. Disable unnecessary schedules after validation.
7. Prepare the public listing, company-domain integration administrator, public API documentation, non-expiring review account at `integration-testing@zapier.com`, and accurate disclosures. The API key used for development is not the reviewer account.
8. Use the integration's **Publishing** page and complete **Submit for Review**. Record the actual receipt/status. A private version or invite link is not a public directory listing.
9. After approval and directory publication, verify the public page and installation/use flow before reporting the channel live.

The scope inquiry about third-party-source rules is already submitted and proceeds in parallel. Development is authorized to continue; no consultation reply or renamed action should be represented as publication approval. If review asks for changes, apply them to this app and repository.

Do not automatically replay a paid query after a timeout. Read existing jobs first. The production API has no documented idempotency key for this submission endpoint.
