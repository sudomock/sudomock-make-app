import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = 'https://eu1.make.com/api/v2';
const teamId = Number(process.env.MAKE_QA_TEAM_ID || 0);
const connectionId = Number(process.env.MAKE_QA_CONNECTION_ID || 0);
const app = 'app#sudomock-rhef0p';
const scheduling = { type: 'on-demand' };
const fixtures = 'https://github.com/sudomock/sudomock-make-app/releases/download/qa-fixtures-v1';
const artworkUrl = `${fixtures}/artwork.jpg`;
const productUrl = `${fixtures}/product-photo.jpg`;
const psdUrl = `${fixtures}/sudomock-smart-object-template.psd`;
const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf';
const missingUuid = '00000000-0000-4000-8000-000000000000';
const reviewWebhookId = process.env.MAKE_QA_WEBHOOK_ID || missingUuid;
const reviewDeliveryId = process.env.MAKE_QA_DELIVERY_ID || missingUuid;
const reviewReceiver = 'https://edge.sudomock.com/make-review/ok';

function step(name, mapper = {}, connected = true) {
  return {
    mapper,
    module: `${app}:${name}`,
    version: 1,
    metadata: { designer: {} },
    parameters: connected ? { __IMTCONN__: connectionId } : {},
  };
}

function reviewScenario(name, steps, expectedStatus = 'SUCCESS', expectedError) {
  const flow = steps.map((item, index) => ({
    id: index + 1,
    ...item,
    metadata: { designer: { x: index * 300, y: 0 } },
  }));
  return {
    name,
    expectedStatus,
    expectedError,
    blueprint: { flow, name, metadata: { instant: false, version: 1 } },
  };
}

const scenarios = [
  reviewScenario('SudoMock App Review - Private QA', [
    step('getAccountInfo'),
  ]),
  reviewScenario('SudoMock App Review 02 - PSD, still, artwork, cleanup', [
    step('uploadPsd', { psd_file_url: psdUrl, psd_name: 'Synthetic review QA', is_async: false }),
    step('getMockup', { mockup_uuid: '{{1.data.uuid}}' }),
    step('updateMockup', { mockup_uuid: '{{1.data.uuid}}', name: 'Synthetic review QA' }),
    step('render', {
      mockup_uuid: '{{1.data.uuid}}',
      smart_objects: [{
        uuid: '{{1.data.smart_objects[1].uuid}}',
        asset: { url: artworkUrl, fit: 'contain' },
      }],
      text_layers: [],
      export_options: { image_format: 'jpg', image_size: 1200, quality: 80, export_label: 'synthetic-review-qa' },
      is_async: false,
    }),
    step('downloadRender', { url: '{{4.renderedImageUrl}}' }, false),
    step('storeArtworks', { mockup_uuid: '{{1.data.uuid}}', items: [], preview_url: '{{4.renderedImageUrl}}' }),
    step('deleteArtworks', { delete_by: 'mockup', urls: [], mockup_uuid: '{{1.data.uuid}}' }),
    step('deleteMockup', { mockup_uuid: '{{1.data.uuid}}' }),
  ]),
  reviewScenario('SudoMock App Review 03 - Video', [
    step('renderVideo', {
      input_mode: 'image',
      image_url: productUrl,
      video: { duration_seconds: 5, audio: false, motion: 'ambient', advanced_model: 'kling-2.6-pro' },
      wait_for_completion: true,
      poll_timeout: 300,
      idempotency_key: 'make-review-video-v2',
    }),
    step('getJob', { job_id: '{{1.job_id}}', wait_for_completion: false }),
  ]),
  reviewScenario('SudoMock App Review 04 - Font lifecycle', [
    step('uploadFont', { url: fontUrl, license_confirmed: true }),
    step('getFont', { font_uuid: '{{1.uuid}}' }),
    step('deleteFont', { font_uuid: '{{1.uuid}}' }),
    step('listFonts', { limit: 101, filters: {} }),
  ]),
  reviewScenario('SudoMock App Review 05 - 2D lifecycle', [
    step('create2DMockup', {
      source_type: 'url',
      source_url: productUrl,
      name: 'Synthetic review QA',
      is_async: false,
      print_areas: [{ points: [[300, 300], [900, 300], [900, 900], [300, 900]] }],
    }),
    step('get2DMockup', { mockup_uuid: '{{1.data.mockup_id}}' }),
    step('set2DPrintAreas', {
      mockup_uuid: '{{1.data.mockup_id}}',
      print_areas: [{ points: [[300, 300], [900, 300], [900, 900], [300, 900]] }],
    }),
    step('render2DMockup', {
      mockup_uuid: '{{1.data.mockup_id}}',
      print_areas: [{
        uuid: '{{3.data.print_areas[1].print_area_id}}',
        artwork_url: artworkUrl,
        adjustments: { opacity: 100, blend_mode: 'multiply' },
        placement: { position: 'center', coverage: 70, fit: 'contain', scale: 1, rotation: 0, offset_x: 0, offset_y: 0 },
      }],
      export_options: { image_format: 'jpg', image_size: 1200, quality: 80 },
      is_async: false,
    }),
    step('delete2DMockup', { mockup_uuid: '{{1.data.mockup_id}}' }),
  ]),
  reviewScenario('SudoMock App Review 06a - Search mockups', [
    step('listMockups', { additional_options: { sort: 'created_at', order: 'desc' }, limit: 101 }),
  ]),
  reviewScenario('SudoMock App Review 06b - Search jobs', [
    step('listJobs', { filters: {}, limit: 51 }),
  ]),
  reviewScenario('SudoMock App Review 06c - Search 2D mockups', [
    step('list2DMockups', { limit: 101 }),
  ]),
  reviewScenario('SudoMock App Review 06d - Search webhook endpoints', [
    step('webhookList', { limit: 10 }),
  ]),
  reviewScenario('SudoMock App Review 06e - Search webhook deliveries', [
    step('webhookEventsFeed', { filters: {}, limit: 201 }),
  ]),
  reviewScenario('SudoMock App Review 07 - Webhook lifecycle', [
    step('webhookCreate', {
      url: reviewReceiver,
      description: 'Synthetic review QA',
      event_types: ['webhook.test'],
    }),
    step('webhookGet', { webhook_id: '{{1.id}}' }),
    step('webhookUpdate', {
      webhook_id: '{{1.id}}',
      update_event_types: true,
      event_types: ['webhook.test'],
      update_fields: { url: reviewReceiver, description: 'Synthetic review QA', enabled: true },
    }),
    step('webhookTest', { webhook_id: '{{1.id}}' }),
    step('webhookRotateSecret', { webhook_id: '{{1.id}}' }),
    step('webhookDelete', { webhook_id: '{{1.id}}' }),
  ]),
  reviewScenario('SudoMock App Review 07b - Webhook delivery lifecycle', [
    step('webhookReplayDelivery', { webhook_id: reviewWebhookId, delivery_id: reviewDeliveryId }),
    step('webhookReplayFailed', { webhook_id: reviewWebhookId }),
    step('webhookListDeliveries', { webhook_id: reviewWebhookId, filters: {}, limit: 201 }),
  ]),
  reviewScenario('SudoMock App Review 08 - Safe 404', [
    step('makeApiCall', {
      url: `/api/v1/mockups/${missingUuid}`,
      method: 'GET',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      qs: [],
    }),
  ], 'ERROR', '404'),
];

async function check() {
  const manifest = JSON.parse(await readFile(resolve(root, 'src/sudomock/makecomapp.json'), 'utf8'));
  const expected = Object.keys(manifest.components.module).sort();
  const covered = scenarios.flatMap(({ blueprint }) => blueprint.flow.map(({ module }) => module.slice(app.length + 1))).sort();
  assert.deepEqual(covered, expected, 'review blueprints must cover every deployed module exactly once');
  assert.equal(new Set(scenarios.map(({ name }) => name)).size, scenarios.length, 'scenario names must be unique');
  for (const { blueprint } of scenarios) {
    assert.equal(blueprint.flow.length > 0, true);
    blueprint.flow.forEach((item, index) => {
      assert.equal(item.id, index + 1);
      assert.equal(item.version, 1);
      if (item.parameters.__IMTCONN__ !== undefined) assert.equal(item.parameters.__IMTCONN__, connectionId);
    });
  }
}

const rawArgs = process.argv.slice(2);
const apply = rawArgs.includes('--apply') || rawArgs.includes('--run');
const runScenarios = rawArgs.includes('--run');
const checkOnly = rawArgs.includes('--check');
const only = rawArgs.find((arg) => arg.startsWith('--only='))?.slice(7);
const unknown = rawArgs.filter((arg) => !['--apply', '--run', '--check', '--dry-run'].includes(arg) && !arg.startsWith('--only='));
if (unknown.length) throw new Error(`Unknown argument: ${unknown.join(', ')}`);
if (rawArgs.includes('--dry-run') && apply) throw new Error('--dry-run cannot be combined with --apply or --run.');

await check();
if (checkOnly) {
  console.log(`OK: ${scenarios.length} private scenarios cover 35 modules.`);
  process.exit(0);
}

const selected = only
  ? scenarios.filter(({ name }) => name.toLowerCase().includes(only.toLowerCase()))
  : scenarios;
if (!selected.length) throw new Error(`No scenario matches --only=${only}`);
if (apply && (![teamId, connectionId].every((value) => Number.isSafeInteger(value) && value > 0))) {
  throw new Error('Set MAKE_QA_TEAM_ID and MAKE_QA_CONNECTION_ID for private Make QA.');
}
if (apply && selected.some(({ name }) => name.includes('07b'))
  && (reviewWebhookId === missingUuid || reviewDeliveryId === missingUuid)) {
  throw new Error('Set MAKE_QA_WEBHOOK_ID and MAKE_QA_DELIVERY_ID for the webhook delivery QA scenario.');
}

if (!apply) {
  console.log('DRY RUN: no Make API calls made.');
  for (const { name, blueprint, expectedStatus } of selected) {
    console.log(`${name}: upsert, stop${runScenarios ? ', run' : ''}; ${blueprint.flow.map(({ module }) => module.slice(app.length + 1)).join(' -> ')}; expect ${expectedStatus}`);
  }
  process.exit(0);
}

const token = (process.env.MAKE_API_KEY || await readFile(resolve(root, '.secrets/apikey'), 'utf8')).trim();
if (!token) throw new Error('Missing Make API token.');

async function request(method, path, body, acceptedStatuses = []) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Token ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    const detail = data.message || data.detail || data.code || 'Make API error';
    throw new Error(`${method} ${path.split('?')[0]} failed (${response.status}): ${detail}`);
  }
  return data;
}

const connection = await request('GET', `/connections/${connectionId}?cols[]=metadata`);
assert.equal(
  connection.connection?.metadata?.value,
  'hello@sudomock.com',
  'Review connection must use the SudoMock QA account.',
);

const listed = await request('GET', `/scenarios?teamId=${teamId}&pg[limit]=100`);
const byName = new Map();
for (const item of listed.scenarios || []) {
  if (!byName.has(item.name)) byName.set(item.name, []);
  byName.get(item.name).push(item);
}

const upserted = [];
for (const scenario of selected) {
  const matches = byName.get(scenario.name) || [];
  if (matches.length > 1) throw new Error(`Multiple scenarios named "${scenario.name}".`);
  const payload = {
    blueprint: JSON.stringify(scenario.blueprint),
    scheduling: JSON.stringify(scheduling),
  };
  let id;
  if (matches.length) {
    id = matches[0].id;
    await request('PATCH', `/scenarios/${id}?confirmed=true`, { ...payload, name: scenario.name });
    console.log(`Updated ${scenario.name} (${id}).`);
  } else {
    const created = await request('POST', '/scenarios?confirmed=true', { ...payload, teamId });
    id = created.scenario.id;
    console.log(`Created ${scenario.name} (${id}).`);
  }
  await request('POST', `/scenarios/${id}/stop`, undefined, [422]);
  upserted.push({ ...scenario, id });
}

if (!runScenarios) process.exit(0);

const pause = (milliseconds) => new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));
for (const scenario of upserted) {
  let executionId;
  try {
    await request('POST', `/scenarios/${scenario.id}/start`);
    const started = await request('POST', `/scenarios/${scenario.id}/run`, { responsive: false });
    executionId = started.executionId;
    if (!executionId) throw new Error(`Make did not return an execution ID for "${scenario.name}".`);

    let execution = { status: 'RUNNING' };
    for (let attempt = 0; attempt < 300 && execution.status === 'RUNNING'; attempt += 1) {
      if (attempt) await pause(2000);
      try {
        execution = await request('GET', `/scenarios/${scenario.id}/executions/${executionId}`);
      } catch (error) {
        if (String(error).includes('failed (404)') && attempt < 10) continue;
        throw error;
      }
    }
    const { status } = execution;
    if (status === 'RUNNING') {
      await request('POST', `/scenarios/${scenario.id}/executions/${executionId}/stop`, { force: true });
      throw new Error(`Timed out waiting for "${scenario.name}".`);
    }
    if (status !== scenario.expectedStatus) {
      throw new Error(`"${scenario.name}" finished ${status}; expected ${scenario.expectedStatus}.`);
    }
    if (scenario.expectedError && !JSON.stringify(execution.error || {}).includes(scenario.expectedError)) {
      throw new Error(`"${scenario.name}" did not produce the expected ${scenario.expectedError} error.`);
    }
    console.log(`Passed ${scenario.name} (${executionId}): ${status}.`);
  } finally {
    await request('POST', `/scenarios/${scenario.id}/stop`, undefined, [422]);
  }
}
