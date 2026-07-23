# SudoMock

SudoMock generates product mockups and videos for Print-on-Demand automation. Turn any product photo into a reusable 2D mockup, or use a PSD template for layered Smart Object rendering. The SudoMock app for Make lets teams personalize designs and text, manage artwork and fonts, run jobs asynchronously, and manage webhooks through the SudoMock API.

## Connect SudoMock to Make

1. Sign in to [SudoMock](https://sudomock.com).
2. Open **Dashboard → API Keys** and create an API key.
3. Add a SudoMock module to a Make scenario.
4. Create a **SudoMock API Key** connection and enter the key.

Make masks the API key and tests the connection against the authenticated SudoMock account endpoint.

## What you can automate

- Retrieve account, subscription, usage, and credit information.
- Upload, list, retrieve, rename, and delete reusable PSD mockup templates.
- Create, prepare, configure, render, list, and delete reusable 2D mockups made from product photos.
- Render product mockups with artwork, Smart Objects, editable text, fonts, and export settings.
- Create short product videos from a mockup or image.
- Manage custom fonts and order artwork.
- Track asynchronous jobs and manage SudoMock webhook endpoints and deliveries.
- Call additional SudoMock API endpoints with **Make an API Call**.

## Typical product mockup workflow

1. Select or upload a reusable PSD mockup.
2. Map artwork to one or more Smart Objects.
3. Add personalized text or font settings when needed.
4. Start the render and receive the result immediately or as an asynchronous job.
5. Download the finished image or continue the scenario with its result URL.

This workflow supports print-on-demand operations, e-commerce product catalogs, marketplace listings, campaign variants, and personalized customer orders. SudoMock can be combined in Make scenarios with services such as Shopify, WooCommerce, Etsy, cloud storage, spreadsheets, and order-management systems.

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
