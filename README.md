# SudoMock app for Make

Official source for the SudoMock integration on Make. Turn product photos into reusable mockups without a PSD, or automate layered PSD templates when precise Smart Object and text control is required. Create still product images and short videos, personalize artwork and text, and track asynchronous jobs for e-commerce and Print-on-Demand workflows.

[SudoMock](https://sudomock.com) · [Documentation](https://sudomock.com/docs) · [OpenAPI](https://sudomock.com/openapi.json)

## Capabilities

- Create and render reusable mockups from product photos.
- Remove image backgrounds and receive transparent PNG cutouts.
- Upload and render PSD templates with Smart Objects and editable text.
- Repeat artwork as a pattern, with an adjustable gap between tiles.
- Generate short product videos.
- Manage mockups, custom fonts, and jobs.
- Start a scenario when a SudoMock job finishes with **Watch events**.
- Download finished renders as Make files.
- Access additional SudoMock endpoints with **Make an API call**.

The complete in-app guide is in [`src/sudomock/README.md`](src/sudomock/README.md).

## Development

Validate the complete app source:

```sh
node scripts/check.mjs
```

Preview a deployment without changing Make:

```sh
node scripts/deploy.mjs --origin Development --dry-run
```

Pushes to `main` validate and deploy the private Development origin through GitHub Actions. The workflow requires a repository secret named `MAKE_API_KEY`; it does not publish the app or request Make review.

Run the reproducible private review scenarios with environment-specific IDs kept outside the repository:

```sh
MAKE_QA_TEAM_ID=... \
MAKE_QA_CONNECTION_ID=... \
MAKE_QA_HOOK_ID=... \
node scripts/review-qa.mjs --run
```

`MAKE_QA_HOOK_ID` is the **Watch events** webhook of the trigger scenario and is needed only when those scenarios are selected. Their run sends a signed test event to that webhook and waits for the trigger scenario to finish successfully.

## Support

Email [hello@sudomock.com](mailto:hello@sudomock.com).

## License

[MIT](LICENSE) © SudoMock
