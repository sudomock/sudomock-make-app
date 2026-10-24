# Changelog

All notable changes to the SudoMock app for Make are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Render a mockup** and **Render a photo mockup** take **Tile spacing**
  beside **Tile**: the gap between tiles, from 0 to 100 percent of the tile
  size, so that percent of the tile width lies between columns and of its
  height between rows. It is used only when **Tile** is on.
- **Render a video** takes **Size**, **Position**, **Tile** and **Tile
  spacing** on a Smart Object's asset, the same fields as **Render a mockup**.
  A field left empty is not sent, so a saved scenario sends the same request
  as before.
- **Set photo mockup print areas** takes a **Print area ID** on each area. An
  area that carries the id of one of the mockup's print areas keeps that id;
  an area without one gets a new id.

## [2026-10-24]

### Added
- **Watch events** starts a scenario when a SudoMock job finishes. Choose the
  **Event types** to receive, or leave the field empty to receive every
  event. Each delivery is checked against SudoMock's signature and rejected
  when it does not match or is older than 5 minutes; a rejected delivery
  starts no scenario. The trigger sits in the Webhooks group.

### Changed
- **Create a mockup from a photo** and **Remove an image background** show
  only the field for the chosen **Source type**: the URL field under URL, the
  Base64 field under Base64.
- **Render a video** shows the mockup, Smart Objects and export options under
  the Render input mode, and the image URL under the Image input mode.
- Module outputs put the result fields at the top level instead of under
  `data`, and no longer carry `success`. Map `uuid` where a scenario mapped
  `data.uuid`, for example. **Get mockup details**, **Update a mockup**,
  **Upload a PSD template** and **Render a mockup** keep `warnings` next to the
  result and no longer carry the empty `message`.
- **Create a mockup from a photo**, **Upload a PSD template**, **Render a
  mockup** and **Render a photo mockup** return the job, with `job_id`, `kind`,
  `status` and `status_url`, when the request is processed asynchronously.
- **Delete a custom font** and **Delete a photo mockup** return no output, like
  **Delete a mockup**.
- **Remove an image background** no longer asks for a content type.

### Removed
- The 11 webhook management modules: **Create a webhook endpoint**, **Get a
  webhook endpoint**, **List webhook endpoints**, **Update a webhook
  endpoint**, **Delete a webhook endpoint**, **Search all webhook
  deliveries**, **Search webhook deliveries**, **Replay a webhook delivery**,
  **Replay failed webhook deliveries**, **Rotate a webhook secret** and **Send
  a webhook test**. SudoMock still signs its webhook deliveries.

## [2026-10-23]

### Added
- **Render a mockup** takes **Tile** on a Smart Object's asset: the artwork
  repeats as a pattern across the whole Smart Object, with Size as one tile
  and Position setting where the grid starts. A tile needs a Size.
- **Render a photo mockup** takes **Tile** in its placement: the sizing you
  set is one tile.
- **Get photo mockup** and **Create photo mockup** list each surface's
  `label`, what was detected there, such as `wall` or `pillow`.

## [2026-10-06]

### Added
- **Get PSD mockup layers** retrieves every layer of a mockup template, nested
  the way Photoshop's Layers panel shows them and front-most first, each with
  `uuid`, `name`, `kind`, `visible` and `children`. A Smart Object whose
  contents hold layers you can fill lists those layers as its children. An
  artboard has kind `artboard`, and its own layers are listed right before it
  at the top level. The output is mappable four levels deep. The module sits in the PSD templates
  group after **Get mockup details**, and the private review scenario for PSD
  templates runs it.
- **Render a mockup** takes **Hidden layers**: up to 50 layer UUIDs to leave
  out of the render, as **Get PSD mockup layers** lists them, including the
  layers inside a Smart Object. Hiding a group hides every layer inside it, a
  layer hidden inside a Smart Object is hidden in every copy of it, and a
  render may carry hidden layers alone. The input is an addition: a scenario
  that does not map it sends the same request as before.
- **Render a mockup** takes **PSD's own size and resolution** in the export
  options. When it is on, the render has the template's own width, its height
  follows the template's proportions, and the file carries the resolution the
  PSD was saved with unless **DPI** is set. **Image size** is not used then.
  The option is off by default, so saved scenarios send the same request as
  before. A template uploaded before this option existed needs to be uploaded
  again to use it.

## [2026-10-05]

### Added
- **Upload a PSD template**, **Get mockup details**, **Search mockups**, and **Update a
  mockup** now expose the Smart Objects and text layers that sit inside a
  Smart Object. Each Smart Object entry can carry its own `smart_objects` and
  `text_layers` lists, mappable two levels deep, with the same fields as the
  top level. Their positions are measured in the enclosing Smart Object's own
  canvas. Fill them in **Render a mockup** by UUID, exactly like a top level
  Smart Object or text layer. The lists are an addition to the module
  interfaces. No existing field was removed, renamed, or retyped, so saved
  scenarios keep working unchanged.
- A render that sends artwork to a Smart Object and also fills a slot inside it
  is refused with `NESTED_SLOT_CONFLICT`. An upload whose Smart Object contents
  could not be read carries the warning `PSD_NESTED_CONTENTS_UNAVAILABLE`; that
  Smart Object stays one slot and still renders as designed.

## [2026-09-22]

### Added
- **Get account information** now exposes `organization` as a mappable output
  collection with the organization `id` and `name`. The field is an addition
  to the module interface. No existing field was removed, renamed, or retyped,
  so scenarios already mapping the account, subscription, usage, or API key
  fields keep working unchanged. The connection is still labelled with the
  account email.

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
