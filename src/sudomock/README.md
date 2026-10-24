# SudoMock

SudoMock turns product photos into reusable mockups without requiring a PSD. The product calls this photo-first workflow a photo mockup. SudoMock can also remove image backgrounds and render PSD templates with Smart Objects and editable text. The SudoMock app for Make automates still product images and short videos, personalized artwork and fonts, and asynchronous jobs through the SudoMock API.

## Connect SudoMock to Make

1. Sign in to [SudoMock](https://sudomock.com).
2. Open **Dashboard → API Keys** and create an API key.
3. Add a SudoMock module to a Make scenario.
4. Create a **SudoMock API Key** connection and enter the key.

Make masks the API key and tests the connection against the authenticated SudoMock account endpoint.

## What you can automate

- Retrieve account, subscription, usage, credit, and prepaid balance information.
- Remove an image background and receive a transparent PNG cutout URL.
- Create, prepare, configure, render, list, and delete reusable photo mockups made from product photos.
- Upload, list, retrieve, rename, and delete reusable PSD mockup templates, and list every layer of a template.
- Render product mockups with artwork, Smart Objects, editable text, fonts, and export settings.
- Create short product videos from a mockup or image.
- Manage custom fonts.
- Track asynchronous jobs.
- Start a scenario when a SudoMock job finishes with **Watch events**.
- Call additional SudoMock API endpoints with **Make an API call**.

## Product photo workflow

1. Add **Create a mockup from a photo**, choose URL or Base64 as the **Source type**, and provide the product photo.
2. Optionally override the automatically detected print areas.
3. Use **Get a photo mockup** to read print areas from `quads` and surfaces from `surfaces`. A surface is one printable product in the photo, and a print area is a bounded zone drawn on that product. A product can offer both, and they are separate render targets. Each surface carries a `label`, what was detected there, such as `pillow` or `wall`, so you can tell surfaces apart.
4. Map artwork and placement settings to each render target. Provide exactly one identifier per target: `uuid` for a print area or `surface_uuid` for a surface. Size a print area target with **Fit**, or with **Width** and **Height**. Size a surface target with **Coverage**.
5. Render the still product image.
6. Download the image or continue the scenario with its result URL.

**Set photo mockup print areas** can send an empty array to remove saved areas. SudoMock remains authoritative and accepts that only when the mockup can stay renderable without them. An area with a **Print area ID**, the id of one of the mockup's print areas, keeps that id; an area without one gets a new id.

## Background removal

Add **Remove an image background**, choose URL or Base64 as the **Source type**, and provide the image. The module returns a transparent PNG cutout URL with its width, height, and charged credits. Each image costs 25 credits, and failed requests are refunded automatically.

For inline cleanup during a render, enable **Remove background** on a PSD Smart Object asset or photo mockup print area. Inline cleanup adds 25 credits per unique artwork.

## PSD template workflow

1. Select or upload a reusable PSD template.
2. Map artwork to one or more Smart Objects.
3. Add personalized text or font settings when needed.
4. Optionally add layer UUIDs to **Hidden layers** to leave those layers out of this render. **Get PSD mockup layers** lists every layer of the template with its UUID, including the layers inside its Smart Objects, and hiding a group hides every layer inside it.
5. Start the render and receive the result immediately or as an asynchronous job.
6. Download the finished image or continue the scenario with its result URL.

**Render a video** turns a PSD template into a short product video. Its Smart Object assets take the same **Size**, **Position**, **Tile**, and **Tile spacing** settings as **Render a mockup**.

This workflow supports print-on-demand operations, e-commerce product catalogs, marketplace listings, campaign variants, and personalized customer orders. SudoMock can be combined in Make scenarios with storefronts, marketplaces, cloud storage, spreadsheets, and order-management systems.

## Repeat a design as a pattern

Set **Tile** to repeat the artwork as a pattern across the whole target, and **Tile spacing** to leave a gap between the tiles, from 0 to 100 percent of the tile: that percent of the tile width between columns, and of its height between rows.

- On **Render a mockup** and **Render a video**, **Tile** sits on a Smart Object's **Asset**. **Size** is one tile, **Fit** places the artwork inside each tile, and **Position** sets where the grid starts, so a tile needs a **Size**.
- On **Render a photo mockup**, **Tile** sits in a render target's **Placement**. The size you set is one tile: **Fit**, or **Width** and **Height**, on a print area, and **Coverage**, or **Width** and **Height**, on a surface. **Position** with **Horizontal offset** and **Vertical offset** sets where the grid starts.

## Asynchronous jobs

Long-running PSD uploads, renders, videos, and photo mockup operations return a job ID. When a module answers with a job, its output holds `job_id`, `kind`, `status`, and `status_url` in place of the result. Use the job modules to check status.

Terminal job statuses are `succeeded`, `failed`, and `cancelled`. Work in progress reports `queued`, `dispatched`, or `running`. Webhook deliveries are signed by SudoMock.

## Watch events

**Watch events** starts a scenario when a SudoMock job finishes, so the scenario can continue with the render, video, upload, or photo mockup result without checking the job.

1. Add **Watch events** as the first module of a scenario and create a webhook with your SudoMock connection.
2. Choose the **Event types** to receive, or leave the field empty to receive every event.
3. Turn the scenario on. Each event you receive starts it with the event name, the job ID and status, and the result URL or error.

Each delivery is checked against SudoMock's signature. A delivery whose signature does not match, or that is older than 5 minutes, is rejected and starts no scenario.

## Files, retries, and credits

- Download modules return a Make file with a file name and binary data.
- Do not automatically retry credit-consuming render requests; check the returned job before starting another render.
- A `429` response is returned as a Make rate-limit error.
- Render and video operations can consume SudoMock credits. Review the module input before running a production scenario.

## Frequently asked questions

### What is SudoMock?

SudoMock is a mockup rendering API that turns reusable PSD templates and product photos into production-ready product images and short product videos.

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
