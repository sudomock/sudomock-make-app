import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../src/sudomock');
const manifest = JSON.parse(readFileSync(resolve(project, 'makecomapp.json'), 'utf8'));
const cliArgs = process.argv.slice(2);
const args = new Set(cliArgs);
const dryRun = args.has('--dry-run');
const originIndex = cliArgs.indexOf('--origin');
const originLabel = originIndex === -1 ? 'Development' : cliArgs[originIndex + 1];
if (!originLabel) throw new Error('Missing value for --origin');
const origin = manifest.origins.find(({ label }) => label === originLabel);

if (!origin) throw new Error(`Unknown origin: ${originLabel}`);
const componentTypes = ['connection', 'module', 'function', 'rpc', 'webhook', 'endpoint'];

function mappingFor(type, local) {
  const mappings = origin.idMapping?.[type]?.filter((item) => item.local === local) ?? [];
  if (mappings.length !== 1) throw new Error(`${originLabel} idMapping.${type}: expected one mapping for "${local}", found ${mappings.length}`);
  return mappings[0];
}

function validateMappings() {
  for (const type of componentTypes) {
    const mappings = origin.idMapping?.[type];
    if (!Array.isArray(mappings)) throw new Error(`${originLabel} idMapping.${type}: missing array`);
    const locals = new Set();
    const remotes = new Set();

    for (const [index, mapping] of mappings.entries()) {
      if (!mapping || (mapping.local !== null && typeof mapping.local !== 'string') || (mapping.remote !== null && typeof mapping.remote !== 'string')) {
        throw new Error(`${originLabel} idMapping.${type}[${index}]: local and remote must be strings or null`);
      }
      if (mapping.localDeleted) throw new Error(`${originLabel} idMapping.${type}[${index}]: localDeleted is not deployable`);
      if (mapping.nonOwnedByApp !== undefined && typeof mapping.nonOwnedByApp !== 'boolean') {
        throw new Error(`${originLabel} idMapping.${type}[${index}]: nonOwnedByApp must be a boolean`);
      }
      if (mapping.local !== null) {
        if (!mapping.local || locals.has(mapping.local)) throw new Error(`${originLabel} idMapping.${type}: duplicate or empty local "${mapping.local}"`);
        locals.add(mapping.local);
        if (!Object.hasOwn(manifest.components[type], mapping.local)) {
          throw new Error(`${originLabel} idMapping.${type}: unknown local "${mapping.local}"`);
        }
      }
      if (mapping.remote !== null) {
        if (!mapping.remote || remotes.has(mapping.remote)) throw new Error(`${originLabel} idMapping.${type}: duplicate or empty remote "${mapping.remote}"`);
        remotes.add(mapping.remote);
      }
    }

    for (const local of Object.keys(manifest.components[type])) mappingFor(type, local);
  }

  for (const [type, components] of Object.entries(manifest.components)) {
    for (const [local, component] of Object.entries(components)) {
      if (!component) continue;
      for (const [property, referenceType] of [['connection', 'connection'], ['altConnection', 'connection'], ['webhook', 'webhook']]) {
        if (typeof component[property] === 'string') {
          if (!Object.hasOwn(manifest.components[referenceType], component[property])) {
            throw new Error(`${type} "${local}" references unknown ${property} "${component[property]}"`);
          }
          mappingFor(referenceType, component[property]);
        }
      }
    }
  }
}

validateMappings();

const apiKey = process.env.MAKE_API_KEY || (dryRun ? '' : readFileSync(resolve(project, origin.apikeyFile), 'utf8').trim());
if (!dryRun && !apiKey) throw new Error(`Missing Make API token for ${originLabel}`);
const env = { ...process.env, MAKE_API_KEY: apiKey, MAKE_ZONE: new URL(origin.baseUrl).host };

function run(...command) {
  if (dryRun) {
    console.log(command.filter((argument) => !/^--(?:body|data-base64|docs)=/.test(argument)).join(' '));
    return '';
  }
  const result = spawnSync('npx', ['--yes', '@makehq/cli@1.4.0', '--output=json', ...command], {
    encoding: 'utf8',
    env,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

function body(path) {
  return readFileSync(resolve(project, path), 'utf8');
}

async function request(method, url, data) {
  if (dryRun) {
    console.log(`${method} ${url} ${JSON.stringify(data)}`);
    return;
  }
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Token ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`${method} ${url} failed (${response.status}): ${await response.text()}`);
}

const app = JSON.parse(body('general/app.json'));
run(
  'sdk-apps',
  'update',
  `--name=${origin.appId}`,
  `--version=${origin.appVersion}`,
  `--label=${app.label}`,
  `--description=${app.description}`,
  `--theme=${app.theme}`,
);
run(
  'sdk-apps',
  'set-icon',
  `--name=${origin.appId}`,
  `--version=${origin.appVersion}`,
  `--data-base64=${readFileSync(resolve(project, app.icon)).toString('base64')}`,
);

function remoteName(type, local) {
  const mapping = mappingFor(type, local);
  return mapping.remote === null || mapping.nonOwnedByApp ? null : mapping.remote;
}

function referenceName(type, local) {
  if (local === null || local === undefined) return null;
  return mappingFor(type, local).remote;
}

function list(type) {
  const command = {
    module: ['sdk-modules', 'list', `--app-name=${origin.appId}`, `--app-version=${origin.appVersion}`],
    rpc: ['sdk-rpcs', 'list', `--app-name=${origin.appId}`, `--app-version=${origin.appVersion}`],
    webhook: ['sdk-webhooks', 'list', `--app-name=${origin.appId}`],
  }[type];
  return dryRun ? [] : JSON.parse(run(...command));
}

const moduleTypes = { trigger: 1, action: 4, search: 9, instant_trigger: 10, responder: 11, universal: 12 };
const modulesUrl = `${origin.baseUrl.replace(/\/$/, '')}/v2/sdk/apps/${encodeURIComponent(origin.appId)}/${encodeURIComponent(origin.appVersion)}/modules`;
function moduleMetadata(component) {
  const typeId = moduleTypes[component.moduleType];
  if (!typeId) throw new Error(`Unknown module type: ${component.moduleType}`);
  if (component.moduleType === 'action' && !component.actionCrud) throw new Error(`Action module "${component.label}" is missing actionCrud`);
  return {
    label: component.label,
    description: component.description,
    typeId,
    crud: component.moduleType === 'action' ? component.actionCrud : null,
    connection: referenceName('connection', component.connection),
    altConnection: referenceName('connection', component.altConnection),
    webhook: referenceName('webhook', component.webhook),
  };
}
const sectionNames = {
  communication: 'api',
  staticParams: 'parameters',
  mappableParams: 'expect',
  interface: 'interface',
  samples: 'samples',
  epoch: 'epoch',
  scope: 'scope',
  params: 'parameters',
  attach: 'attach',
  detach: 'detach',
  update: 'update',
  requiredScope: 'scope',
};

run('sdk-apps', 'set-section', `--name=${origin.appId}`, `--version=${origin.appVersion}`, '--section=base', `--body=${body(manifest.generalCodeFiles.base)}`);
run('sdk-apps', 'set-docs', `--name=${origin.appId}`, `--version=${origin.appVersion}`, `--docs=${body(manifest.generalCodeFiles.readme)}`);

for (const [local, connection] of Object.entries(manifest.components.connection)) {
  const remote = remoteName('connection', local);
  if (!remote) continue;
  run('sdk-connections', 'update', `--connection-name=${remote}`, `--label=${connection.label}`);
  for (const [key, path] of Object.entries(connection.codeFiles)) {
    if (!path || !sectionNames[key]) continue;
    run('sdk-connections', 'set-section', `--connection-name=${remote}`, `--section=${sectionNames[key]}`, `--body=${body(path)}`);
  }
}

for (const type of ['rpc', 'module']) {
  const existing = new Set(list(type).map(({ name }) => name));
  for (const [local, component] of Object.entries(manifest.components[type])) {
    const remote = remoteName(type, local);
    if (!remote) continue;
    const connection = component.connection ? referenceName('connection', component.connection) : '';
    if (!existing.has(remote)) {
      if (type === 'rpc') {
        run('sdk-rpcs', 'create', `--app-name=${origin.appId}`, `--app-version=${origin.appVersion}`, `--name=${remote}`, `--label=${component.label}`);
      } else {
        const metadata = moduleMetadata(component);
        await request('POST', modulesUrl, {
          name: remote,
          ...metadata,
          ...(component.moduleType === 'universal' ? { subtype: 'Universal' } : {}),
          moduleInitMode: 'blank',
        });
      }
    }

    if (type === 'rpc') {
      run('sdk-rpcs', 'update', `--app-name=${origin.appId}`, `--app-version=${origin.appVersion}`, `--rpc-name=${remote}`, `--label=${component.label}`, ...(connection ? [`--connection=${connection}`] : []));
    } else {
      await request('PATCH', `${modulesUrl}/${encodeURIComponent(remote)}`, moduleMetadata(component));
    }

    for (const [key, path] of Object.entries(component.codeFiles)) {
      if (!path || !sectionNames[key]) continue;
      run(`sdk-${type}s`, 'set-section', `--app-name=${origin.appId}`, `--app-version=${origin.appVersion}`, `--${type}-name=${remote}`, `--section=${sectionNames[key]}`, `--body=${body(path)}`);
    }
  }
}

for (const local of Object.keys(manifest.components.module)) {
  const remote = remoteName('module', local);
  if (!remote) continue;
  run(
    'sdk-modules',
    'set-public',
    `--app-name=${origin.appId}`,
    `--app-version=${origin.appVersion}`,
    `--module-name=${remote}`,
  );
}

const webhooks = new Map(list('webhook').map((item) => [item.name, item]));
for (const [local, webhook] of Object.entries(manifest.components.webhook)) {
  const remote = remoteName('webhook', local);
  if (!remote) continue;
  if (!webhooks.has(remote)) {
    throw new Error(`Create webhook "${local}" once in Make, then add its remote name to ${originLabel} idMapping.`);
  }
  run('sdk-webhooks', 'update', `--webhook-name=${remote}`, `--label=${webhook.label}`);
  for (const [key, path] of Object.entries(webhook.codeFiles)) {
    if (!path || !sectionNames[key]) continue;
    run('sdk-webhooks', 'set-section', `--webhook-name=${remote}`, `--section=${sectionNames[key]}`, `--body=${body(path)}`);
  }
}

run('sdk-apps', 'set-section', `--name=${origin.appId}`, `--version=${origin.appVersion}`, '--section=groups', `--body=${body(manifest.generalCodeFiles.groups)}`);

console.log(`${originLabel} ${dryRun ? 'dry run' : 'deploy'} complete.`);
