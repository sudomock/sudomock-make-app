# Changelog

All notable changes to the SudoMock app for Make are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-09-19]

### Changed
- **Create a mockup from a photo**, **Get a photo mockup**, **List photo
  mockups**, **Set photo mockup print areas**, **Render a photo mockup**, and
  **Delete a photo mockup** now call `/api/v1/photo-mockups`. Module
  identifiers, inputs, and outputs are the same, so saved scenarios keep working
  unchanged.
- Asynchronous jobs started by **Create a mockup from a photo** and **Render a
  photo mockup** report `kind` as `photo_mockup_create` and
  `photo_mockup_render`. A scenario filter comparing `kind` against `2d_create`
  or `2d_render` should compare against the new values. **Search jobs** keeps
  both spellings selectable.
- **Get mockup details**, **Search mockups**, **Update a mockup**, **Delete a mockup**,
  and the mockup and Smart Object pickers now call `/api/v1/psd-mockups`.
  Module identifiers, inputs, and outputs are the same.
- Labels, descriptions, and help text say "photo mockup" where they said "2D
  mockup". The first module group is named **Photo Mockups**. Module
  identifiers are unchanged, so saved scenarios open exactly as before.

## [2026-09-18]

### Added
- **Photo mockup event names.** Every event picker (**Create a webhook
  endpoint**, **Update a webhook endpoint**, **Search webhook deliveries**,
  **Search all webhook deliveries**) now offers `photo_mockup.ready`,
  `photo_mockup.rejected`, `photo_mockup.failed`,
  `photo_mockup_render.succeeded`, and `photo_mockup_render.failed`. The
  `2d_mockup.*` and `2d_render.*` names stay in the list, marked legacy, for
  endpoints that still receive them.
- **Create a webhook endpoint** gains an **Event naming** input (`current` or
  `legacy`, default `current`). It decides which spelling of the photo mockup
  events, and of the payload `kind`, the new endpoint receives. Endpoints
  created before this release keep the legacy names, so a scenario filtering on
  `2d_render.succeeded` from an existing endpoint keeps working unchanged.
- **Update a webhook endpoint** gains the same **Event naming** input under
  **Fields to update**, with no default. Left empty, the endpoint keeps the
  naming it already has, so scenarios that update an existing endpoint do not
  change what it receives. Choosing a naming switches the endpoint to that
  spelling and stores its subscribed event types in it.
- Webhook endpoint outputs (**Create**, **Get**, **List**, **Update**,
  **Rotate a webhook secret**) expose the endpoint's `event_naming`.
- **Search jobs** accepts `photo_mockup_create` and `photo_mockup_render` as
  job kinds. A photo mockup kind matches the job under either spelling; the
  `2d_create` and `2d_render` values remain selectable as legacy names.
- **Get Account Info** now exposes `prepaid_balance` and
  `prepaid_balance_currency` as mappable output fields. An account is funded
  either by a subscription allowance or by a prepaid balance, and the module
  declared only the allowance, so a scenario built on it saw a funded account as
  `0 / 0 credits` with no way to map the money it actually held.

Both fields are additions to the module interface. No existing field was
removed, renamed, or retyped, so scenarios already mapping the credit fields
keep working unchanged.

### Changed
- **Render a 2D mockup** now keeps the two render-target kinds apart. A surface
  is one printable product in the photo and is sized with **Coverage**, from 10
  to 100 percent. A print area is a bounded zone drawn on a product and is sized
  with **Fit**, or with an explicit **Width** and **Height** pair. A product can
  offer both, and the two are addressed separately.
- **Coverage** and **Fit** no longer carry a built-in value. Only what a scenario
  actually maps is sent. Previously every render travelled with `coverage: 70`
  and `fit: "contain"` even when the scenario left both blank, which pushed a
  size nobody asked for and now reaches a target kind that rejects it.
- Labels and help text drop the phrase "full surface" and name the two kinds
  plainly, in the module form and in the app documentation.

### Removed
- The `coverage` output field on `data.surfaces` in **Create a mockup from a
  photo** and **Get a 2D mockup**. It always reported the same value and said
  nothing a scenario could act on. Appearing in `data.surfaces` is the whole
  statement. A scenario mapping this field must drop it.
