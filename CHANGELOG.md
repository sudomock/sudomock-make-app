# Changelog

All notable changes to the SudoMock app for Make are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
