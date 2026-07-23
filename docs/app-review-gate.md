# SudoMock Make app review gate

Do not click **Publish** or **Request review** until every required item below is checked.

Each product decision must agree with:

1. the current [Make Custom Apps documentation](https://developers.make.com/custom-apps-documentation/),
2. a comparable approved Make app where one exists, and
3. the live [SudoMock OpenAPI document](https://sudomock.com/openapi.json).

Re-check the sources on the day the review is requested.

## Code and security

- [ ] The app contains exactly one connection, one universal module, the reviewed public modules, and no test-only components.
- [ ] `X-API-KEY`, `Authorization`, and webhook signing secrets are sanitized from logs.
- [ ] Invalid credentials fail through `GET /api/v1/me` with a useful Make error.
- [ ] API errors and HTTP 429 responses become useful Make errors.
- [ ] The universal module accepts only a `/`-prefixed path on the fixed `api.sudomock.com` host.
- [ ] Every multi-record endpoint is a Search module with an optional Limit defaulting to 10 and supported pagination.
- [ ] Every RPC has a limit and bounded pagination.
- [ ] Every module exposes a complete, correctly typed output interface, including nested fields and parsed dates.
- [ ] Download a Render never forwards SudoMock credentials to the asset host.
- [ ] No incoming webhook trigger is exposed until exact raw-body signature verification is possible in Make.

Primary rules:

- [Review prerequisites](https://developers.make.com/custom-apps-documentation/app-review/prerequisites)
- [Base best practices](https://developers.make.com/custom-apps-documentation/best-practices/base)
- [Error handling](https://developers.make.com/custom-apps-documentation/best-practices/base/error-handling)
- [429 handling](https://developers.make.com/custom-apps-documentation/best-practices/base/429-error-handling)
- [Search modules](https://developers.make.com/custom-apps-documentation/best-practices/modules/search-modules)
- [Pagination](https://developers.make.com/custom-apps-documentation/app-blocks/api/pagination)
- [Output interfaces](https://developers.make.com/custom-apps-documentation/best-practices/output-parameters/interface)
- [RPC best practices](https://developers.make.com/custom-apps-documentation/best-practices/remote-procedure-calls)
- [REST universal module](https://developers.make.com/custom-apps-documentation/app-components/modules/universal-module/rest)
- [Buffer output](https://developers.make.com/custom-apps-documentation/app-blocks/api/buffer)

## Product and presentation

- [ ] App name is `SudoMock`; the theme is `#0f172a`; the icon is the approved SudoMock mark.
- [ ] English labels use sentence case, start with a verb, and descriptions state the result in third person.
- [ ] Public copy explains photo-to-mockup first, then covers the 2D product name, PSD templates, product videos, jobs, fonts, artwork, and webhook management.
- [ ] Public metadata contains only SudoMock identity, public URLs, and `hello@sudomock.com`.
- [ ] No personal name, local path, credential, private project detail, or test customer data appears in code, logs, scenarios, metadata, or review material.
- [ ] Public API and Make documentation matches the submitted module surface and contains no premature or outdated integration claims.
- [ ] Module grouping and outcome-led copy have been compared with the approved [Bannerbear integration](https://www.make.com/en/integrations/bannerbear).

Primary rules:

- [Module labels](https://developers.make.com/custom-apps-documentation/best-practices/naming-conventions/modules/module-labels)
- [Module descriptions](https://developers.make.com/custom-apps-documentation/best-practices/naming-conventions/modules/module-descriptions)
- [App logo](https://developers.make.com/custom-apps-documentation/create-your-first-app/app-logo)

## Private testing

- [ ] All reviewed modules are visible in the scenario builder while the app itself remains private.
- [ ] A private scenario uses every module at least once and finishes without errors.
- [ ] Search modules are last on separate routes and their logs demonstrate pagination.
- [ ] A separate scenario demonstrates a safe, expected API error.
- [ ] Test data and retained execution logs contain no personal or sensitive data.
- [ ] The scenarios are run again immediately before review.
- [ ] The API documentation URL and scenario URLs are ready for the review form.

Primary rule: [App review prerequisites](https://developers.make.com/custom-apps-documentation/app-review/prerequisites).

## Irreversible release gate

- [ ] The development deploy matches the reviewed Git revision and passes the local checks.
- [ ] SudoMock has approved the final module inventory, public copy, logo, theme, support identity, and test evidence.
- [ ] The app contains nothing that may need deletion later.
- [ ] Explicit approval to click **Publish** has been given.
- [ ] Explicit approval to submit **Request review** has been given.

Publishing cannot be undone and public components cannot be deleted. See [Request app review](https://developers.make.com/custom-apps-documentation/app-review/request-app-review).

After approval, changes are tested in the private development version and submitted to Make for approval before reaching the public version. See [Approved apps](https://developers.make.com/custom-apps-documentation/app-maintenance/updating-your-app/approved-apps).
