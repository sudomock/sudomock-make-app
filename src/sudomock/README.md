# SudoMock

SudoMock turns product photos into reusable mockups without requiring a PSD. The product calls this photo-first workflow a 2D mockup. When exact layered control is needed, SudoMock also renders PSD templates with Smart Objects and editable text. The SudoMock app for Make automates still product images and short videos, personalized artwork and fonts, asynchronous jobs, and webhooks through the SudoMock API.

## Connect SudoMock to Make

1. Sign in to [SudoMock](https://sudomock.com).
2. Open **Dashboard → API Keys** and create an API key.
3. Add a SudoMock module to a Make scenario.
4. Create a **SudoMock API Key** connection and enter the key.

Make masks the API key and tests the connection against the authenticated SudoMock account endpoint.

## What you can automate

- Retrieve account, subscription, usage, and credit information.
- Create, prepare, configure, render, list, and delete reusable 2D mockups made from product photos.
- Upload, list, retrieve, rename, and delete reusable PSD mockup templates.
- Render product mockups with artwork, Smart Objects, editable text, fonts, and export settings.
- Create short product videos from a mockup or image.
- Manage custom fonts.
- Track asynchronous jobs and manage SudoMock webhook endpoints and deliveries.
- Call additional SudoMock API endpoints with **Make an API Call**.

## Product photo workflow

1. Add **Create a mockup from a photo** and provide a product-photo URL.
2. Optionally override the automatically detected print areas.
3. Map artwork and placement settings to each print area.
4. Render the still product image.
5. Download the image or continue the scenario with its result URL.

## PSD template workflow

1. Select or upload a reusable PSD template.
2. Map artwork to one or more Smart Objects.
3. Add personalized text or font settings when needed.
4. Start the render and receive the result immediately or as an asynchronous job.
5. Download the finished image or continue the scenario with its result URL.

This workflow supports print-on-demand operations, e-commerce product catalogs, marketplace listings, campaign variants, and personalized customer orders. SudoMock can be combined in Make scenarios with storefronts, marketplaces, cloud storage, spreadsheets, and order-management systems.

## Asynchronous jobs

Long-running PSD uploads, renders, videos, and 2D operations return a job ID. Use the job modules to check status. Webhook management modules can create endpoints, inspect deliveries, and replay failed deliveries.

Terminal job statuses are `succeeded`, `failed`, and `cancelled`. Work in progress reports `queued`, `dispatched`, or `running`. Webhook deliveries are signed by SudoMock.

## Files, retries, and credits

- Download modules return a Make file with a file name and binary data.
- Do not automatically retry credit-consuming render requests; check the returned job before starting another render.
- A `429` response is returned as a Make rate-limit error.
- Render and video operations can consume SudoMock credits. Review the module input before running a production scenario.

## Frequently asked questions

### What is SudoMock?

SudoMock is a mockup rendering API that turns reusable PSD templates and 2D product photos into production-ready product images and short product videos.

### Can SudoMock place multiple designs in one PSD?

Yes. A render can map artwork to multiple Smart Objects in the selected mockup.

### Can a Make scenario wait for a render?

Yes. Start an asynchronous render, then use the job modules to check its status and retrieve the result.

### Which image formats are supported?

Render exports support WebP, PNG, and JPEG. Available settings include image width, quality, DPI, and an export label.

### Where is the SudoMock API documentation?

See the [SudoMock documentation](https://sudomock.com/docs) and [OpenAPI reference](https://sudomock.com/openapi.json).

## Support

Email [hello@sudomock.com](mailto:hello@sudomock.com).
