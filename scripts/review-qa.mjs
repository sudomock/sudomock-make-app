import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = 'https://eu1.make.com/api/v2';
const teamId = Number(process.env.MAKE_QA_TEAM_ID || 0);
const connectionId = Number(process.env.MAKE_QA_CONNECTION_ID || 0);
const hookId = Number(process.env.MAKE_QA_HOOK_ID || 0);
const app = 'app#sudomock-rhef0p';
const fixtures = 'https://github.com/sudomock/sudomock-make-app/releases/download/qa-fixtures-v1';
const artworkUrl = `${fixtures}/artwork.jpg`;
const productUrl = `${fixtures}/product-photo.jpg`;
const psdUrl = `${fixtures}/sudomock-smart-object-template.psd`;
const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf';
const missingUuid = '00000000-0000-4000-8000-000000000000';
const watchEventsName = 'SudoMock App Review 09 - Watch events';
const testEventName = 'SudoMock App Review 09b - Send test event';

function step(name, mapper = {}, connected = true) {
  return {
    mapper,
    module: `${app}:${name}`,
    version: 1,
    metadata: { designer: {} },
    parameters: connected ? { __IMTCONN__: connectionId } : {},
  };
}

function reviewScenario(name, steps, expectedStatus = 'SUCCESS', expectedError, instant = false) {
  const flow = steps.map((item, index) => ({
    id: index + 1,
    ...item,
    metadata: { designer: { x: index * 300, y: 0 } },
  }));
  return {
    name,
    expectedStatus,
    expectedError,
    scheduling: { type: instant ? 'immediately' : 'on-demand' },
    blueprint: { flow, name, metadata: { instant, version: 1 } },
  };
}

// Sends a signed webhook.test event to the SudoMock endpoint attached to the
// Watch events hook. The endpoint ID is read from the hook when QA runs.
function testEventScenario(endpointId) {
  return reviewScenario(testEventName, [
    step('makeApiCall', {
      url: `/api/v1/webhook-endpoints/${endpointId}/test`,
      method: 'POST',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      qs: [],
    }),
  ]);
}

const scenarios = [
  reviewScenario('SudoMock App Review - Private QA', [
    step('getAccountInfo'),
  ]),
  reviewScenario('SudoMock App Review 01b - Background removal', [
    step('removeBackground', { source_type: 'url', url: artworkUrl }),
  ]),
  reviewScenario('SudoMock App Review 02 - PSD, still, cleanup', [
    step('uploadPsd', { psd_file_url: psdUrl, psd_name: 'Synthetic review QA', is_async: false }),
    step('getMockup', { mockup_uuid: '{{1.uuid}}' }),
    step('updateMockup', { mockup_uuid: '{{1.uuid}}', name: 'Synthetic review QA' }),
    step('render', {
      mockup_uuid: '{{1.uuid}}',
      smart_objects: [{
        uuid: '{{1.smart_objects[1].uuid}}',
        asset: { url: artworkUrl, fit: 'contain' },
        color: { hex: '#334155', blending_mode: 'soft_light' },
      }],
      text_layers: [],
      export_options: { image_format: 'jpg', image_size: 1200, quality: 80, export_label: 'synthetic-review-qa' },
      is_async: false,
    }),
    step('downloadRender', { url: '{{4.renderedImageUrl}}' }, false),
    step('getMockupLayers', { mockup_uuid: '{{1.uuid}}' }),
    step('deleteMockup', { mockup_uuid: '{{1.uuid}}' }),
  ]),
  reviewScenario('SudoMock App Review 02b - Async render and wait', [
    step('uploadPsd', { psd_file_url: psdUrl, psd_name: 'Synthetic async review QA', is_async: false }),
    step('render', {
      mockup_uuid: '{{1.uuid}}',
      smart_objects: [{
        uuid: '{{1.smart_objects[1].uuid}}',
        asset: { url: artworkUrl, fit: 'contain' },
      }],
      text_layers: [],
      export_options: { image_format: 'jpg', image_size: 1200, quality: 80, export_label: 'synthetic-async-review-qa' },
      is_async: true,
    }),
    step('getJob', { job_id: '{{2.job_id}}', wait_for_completion: true, poll_timeout: 300 }),
    step('deleteMockup', { mockup_uuid: '{{1.uuid}}' }),
  ]),
  reviewScenario('SudoMock App Review 03 - Video', [
    step('renderVideo', {
      input_mode: 'image',
      image_url: productUrl,
      video: { duration_seconds: 4, audio: false, motion: 'ambient' },
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
    step('get2DMockup', { mockup_uuid: '{{1.mockup_id}}' }),
    step('set2DPrintAreas', {
      mockup_uuid: '{{1.mockup_id}}',
      print_areas: [{ points: [[300, 300], [900, 300], [900, 900], [300, 900]] }],
    }),
    step('render2DMockup', {
      mockup_uuid: '{{1.mockup_id}}',
      print_areas: [{
        uuid: '{{3.print_areas[1].print_area_id}}',
        artwork_url: artworkUrl,
        adjustments: { opacity: 100, blend_mode: 'multiply' },
        // This target is a print area, so it is sized with fit. Coverage sizes a
        // surface target instead, and the API answers it here with 422, exactly as
        // it answers any placement key outside the contract such as `scale`.
        // Either would fail this scenario during Make's app review.
        placement: { position: 'top_left', fit: 'contain', rotation: 0, offset_x: 0, offset_y: 0 },
      }],
      export_options: { image_format: 'jpg', image_size: 1200, quality: 80 },
      is_async: false,
    }),
    step('delete2DMockup', { mockup_uuid: '{{1.mockup_id}}' }),
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
  reviewScenario('SudoMock App Review 08 - Safe 404', [
    step('makeApiCall', {
      url: `/api/v1/psd-mockups/${missingUuid}`,
      method: 'GET',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      qs: [],
    }),
  ], 'ERROR', '404'),
  reviewScenario(watchEventsName, [
    { ...step('watchEvents', {}, false), parameters: { __IMTHOOK__: hookId } },
  ], 'SUCCESS', undefined, true),
  testEventScenario('{endpoint_id}'),
];

async function check() {
  const manifest = JSON.parse(await readFile(resolve(root, 'src/sudomock/makecomapp.json'), 'utf8'));
  const expected = Object.keys(manifest.components.module).sort();
  const covered = [...new Set(scenarios.flatMap(({ blueprint }) =>
    blueprint.flow.map(({ module }) => module.slice(app.length + 1))))].sort();
  assert.deepEqual(covered, expected, 'review blueprints must cover every deployed module');
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
  console.log(`OK: ${scenarios.length} private scenarios cover all deployed modules.`);
  process.exit(0);
}

let selected = only
  ? scenarios.filter(({ name }) => name.toLowerCase().includes(only.toLowerCase()))
  : scenarios;
if (!selected.length) throw new Error(`No scenario matches --only=${only}`);
// Watch events is proven by the event its sender scenario causes, so the two go together.
const watchPair = [watchEventsName, testEventName];
if (selected.some(({ name }) => watchPair.includes(name))) {
  selected = [...selected, ...scenarios.filter(({ name }) => watchPair.includes(name) && !selected.some((item) => item.name === name))];
}
const validId = (value) => Number.isSafeInteger(value) && value > 0;
if (apply && !(validId(teamId) && validId(connectionId))) {
  throw new Error('Set MAKE_QA_TEAM_ID and MAKE_QA_CONNECTION_ID for private Make QA.');
}
if (apply && selected.some(({ name }) => watchPair.includes(name)) && !validId(hookId)) {
  throw new Error('Set MAKE_QA_HOOK_ID to run the Watch events scenarios.');
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

// Every call is aborted after timeoutMs, so a stalled response cannot hold a run open.
async function request(method, path, body, acceptedStatuses = [], timeoutMs = 30_000) {
  let response;
  let text;
  // Make rate-limits the API; a 429 waits for Retry-After (or a growing pause) and tries again.
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Token ${token}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      text = await response.text();
    } catch (error) {
      if (error?.name !== 'TimeoutError') throw error;
      throw new Error(`${method} ${path.split('?')[0]} timed out after ${timeoutMs / 1000} s`);
    }
    if (response.status !== 429 || attempt === 5) break;
    const wait = Number(response.headers.get('retry-after')) || 2 ** attempt * 5;
    await new Promise((resolveWait) => setTimeout(resolveWait, wait * 1000));
  }
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

// Stopping is cleanup, so it gets its own short bound and runs even after a stalled call.
const stopScenario = (id) => request('POST', `/scenarios/${id}/stop`, undefined, [422], 15_000);

const connection = await request('GET', `/connections/${connectionId}?cols[]=metadata`);
assert.equal(
  connection.connection?.metadata?.value,
  'hello@sudomock.com',
  'Review connection must use the SudoMock QA account.',
);

if (selected.some(({ name }) => name === testEventName)) {
  // The hook holds the attached endpoint's ID and signing secret; only the ID is read.
  const hook = await request('GET', `/hooks/${hookId}`);
  const endpointId = hook.hook?.data?.id;
  if (typeof endpointId !== 'string' || !endpointId) throw new Error(`Hook ${hookId} has no attached SudoMock endpoint.`);
  selected = selected.map((scenario) => (scenario.name === testEventName ? testEventScenario(endpointId) : scenario));
}

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
    scheduling: JSON.stringify(scenario.scheduling),
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
  await stopScenario(id);
  upserted.push({ ...scenario, id });
}

if (!runScenarios) process.exit(0);

const pause = (milliseconds) => new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));

async function runOnDemand(scenario) {
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
    await stopScenario(scenario.id);
  }
}

// Starts the trigger, causes a real signed delivery through the sender scenario,
// and waits for the trigger to finish an execution that started after it went live.
async function runWatchEvents(trigger, sender) {
  const since = Date.now();
  try {
    await request('POST', `/scenarios/${trigger.id}/start`);
    await runOnDemand(sender);
    const deadline = Date.now() + 120_000;
    for (let attempt = 0; Date.now() < deadline; attempt += 1) {
      if (attempt) await pause(2000);
      const remaining = Math.max(1000, Math.min(30_000, deadline - Date.now()));
      const { scenarioLogs = [] } = await request('GET', `/scenarios/${trigger.id}/logs?from=${since}&pg[sortDir]=desc&pg[limit]=50`, undefined, [], remaining);
      const execution = scenarioLogs.find((log) => log.status === 1 || log.displayStatus === 'SUCCESS');
      if (execution) {
        console.log(`Passed ${trigger.name} (${execution.id}): SUCCESS.`);
        return;
      }
    }
    throw new Error(`Timed out waiting for "${trigger.name}" to receive the test event.`);
  } finally {
    await stopScenario(trigger.id);
  }
}

for (const scenario of upserted) {
  if (scenario.name === testEventName) continue;
  if (scenario.name === watchEventsName) {
    await runWatchEvents(scenario, upserted.find(({ name }) => name === testEventName));
  } else {
    await runOnDemand(scenario);
  }
}
