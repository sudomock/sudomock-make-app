# SudoMock app for Make

Official source for the SudoMock integration on Make. Turn product photos into reusable mockups without a PSD, or automate layered PSD templates when precise Smart Object and text control is required. Create still product images and short videos, personalize artwork and text, track asynchronous jobs, and manage webhook deliveries for e-commerce and Print-on-Demand workflows.

[SudoMock](https://sudomock.com) · [Documentation](https://sudomock.com/docs) · [OpenAPI](https://sudomock.com/openapi.json)

## Capabilities

- Create and render reusable mockups from product photos.
- Upload and render PSD templates with Smart Objects and editable text.
- Generate short product videos.
- Manage mockups, artwork, custom fonts, jobs, and webhooks.
- Download finished renders as Make files.
- Access additional SudoMock endpoints with **Make an API Call**.

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
MAKE_QA_WEBHOOK_ID=... \
MAKE_QA_DELIVERY_ID=... \
node scripts/review-qa.mjs --run
```

## Support

Email [hello@sudomock.com](mailto:hello@sudomock.com).

## License

[MIT](LICENSE) © SudoMock
