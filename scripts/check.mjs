import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(root, 'src/sudomock');
const manifestPath = join(sourceRoot, 'makecomapp.json');
const files = [];
const ignoredDirectories = new Set(['.git', '.secrets', 'node_modules']);
const errors = [];

for (const walk = [root]; walk.length;) {
  const path = walk.pop();
  for (const name of readdirSync(path)) {
    const child = join(path, name);
    if (statSync(child).isDirectory()) {
      if (!ignoredDirectories.has(name)) walk.push(child);
    } else {
      files.push(child);
    }
  }
}

const secretPath = join(root, '.secrets/apikey');
const secret = process.env.MAKE_API_KEY || (existsSync(secretPath) ? readFileSync(secretPath, 'utf8').trim() : '');
const piiPath = join(root, '.secrets/pii-denylist');
const reservedCopyPattern = new RegExp(`\\b${String.fromCharCode(65, 73)}\\b`);
const obsoleteDocsPath = `/${['docs', 'api'].join('/')}`;
const credentialPattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:gh[pousr]|sk_(?:live|test))_[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~-]{20,}/;
const personalTerms = [
  process.env.USER,
  process.env.LOGNAME,
  process.env.PII_DENYLIST,
  existsSync(piiPath) ? readFileSync(piiPath, 'utf8') : '',
]
  .flatMap((value) => value?.split(/[\n,]/) || [])
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value.length >= 4);
const jsonFiles = new Map();

for (const file of files) {
  if (!/\.(?:json|mjs|md|ya?ml)$/.test(file) && !file.endsWith('.gitignore')) continue;
  const content = readFileSync(file, 'utf8');
  const name = relative(root, file);

  if (file.endsWith('.json')) {
    try {
      const parsed = JSON.parse(content);
      jsonFiles.set(file, parsed);
    } catch (error) {
      errors.push(`${name}: invalid JSON (${error.message})`);
    }
  }

  if (/\/Users\/|file:\/\//i.test(content)) errors.push(`${name}: contains a local path`);
  if (reservedCopyPattern.test(content)) errors.push(`${name}: contains a reserved public-copy term`);
  if (content.includes(obsoleteDocsPath)) errors.push(`${name}: contains the obsolete API docs path`);
  if (personalTerms.some((term) => content.toLowerCase().includes(term))) errors.push(`${name}: contains personal identity information`);
  if (secret && content.includes(secret)) errors.push(`${name}: contains the Make API token`);
  if (credentialPattern.test(content)) errors.push(`${name}: contains a credential-like value`);

  for (const [email] of content.matchAll(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi)) {
    if (email.toLowerCase() !== 'hello@sudomock.com') errors.push(`${name}: contains a non-public email address`);
  }
}

if (!existsSync(join(root, 'docs/app-review-gate.md'))) errors.push('docs/app-review-gate.md: required review gate is missing');

const workflowPath = join(root, '.github/workflows/deploy-development.yml');
if (!existsSync(workflowPath)) {
  errors.push('.github/workflows/deploy-development.yml: required Development workflow is missing');
} else {
  const workflow = readFileSync(workflowPath, 'utf8');
  const checkout = workflow.match(/\bactions\/checkout@v(\d+)\b/);
  const setupNode = workflow.match(/\bactions\/setup-node@v(\d+)\b/);
  const nodeVersion = workflow.match(/\bnode-version:\s*['"]?(\d+)\b/);
  const checkStep = workflow.indexOf('node scripts/check.mjs');
  const deployStep = workflow.indexOf('node scripts/deploy.mjs --origin Development');
  if (!checkout || Number(checkout[1]) < 6) errors.push('.github/workflows/deploy-development.yml: actions/checkout must be v6 or newer');
  if (!setupNode || Number(setupNode[1]) < 6) errors.push('.github/workflows/deploy-development.yml: actions/setup-node must be v6 or newer');
  if (!nodeVersion || Number(nodeVersion[1]) < 24) errors.push('.github/workflows/deploy-development.yml: Node.js must be version 24 or newer');
  if (!/\bpackage-manager-cache:\s*false\b/.test(workflow)) errors.push('.github/workflows/deploy-development.yml: setup-node package-manager-cache must be false');
  if (!/\bpermissions:\s*\n\s+contents:\s*read\b/.test(workflow)) errors.push('.github/workflows/deploy-development.yml: workflow permissions must be read-only');
  if (!/\bconcurrency:\s*\n\s+group:\s*\S+\s*\n\s+cancel-in-progress:\s*true\b/.test(workflow)) errors.push('.github/workflows/deploy-development.yml: deployment concurrency guard is missing');
  if (checkStep === -1 || deployStep === -1 || checkStep > deployStep) errors.push('.github/workflows/deploy-development.yml: check must run before the fixed Development deploy');
  if (!workflow.includes('MAKE_API_KEY: ${{ secrets.MAKE_API_KEY }}')) errors.push('.github/workflows/deploy-development.yml: Make token must come from the repository secret');
}

const deployPath = join(root, 'scripts/deploy.mjs');
if (!existsSync(deployPath)) {
  errors.push('scripts/deploy.mjs: required deployment script is missing');
} else {
  const deploy = readFileSync(deployPath, 'utf8');
  if (!deploy.includes("'sdk-modules',\n    'set-public'")) {
    errors.push('scripts/deploy.mjs: every reviewed module must be made visible for private scenario testing');
  }
  if (deploy.includes("'sdk-modules', 'set-private'")) {
    errors.push('scripts/deploy.mjs: reviewed modules must not be hidden');
  }
}

const dependabotPath = join(root, '.github/dependabot.yml');
if (!existsSync(dependabotPath)) {
  errors.push('.github/dependabot.yml: weekly GitHub Actions updates are missing');
} else {
  const dependabot = readFileSync(dependabotPath, 'utf8');
  if (!/\bpackage-ecosystem:\s*github-actions\b/.test(dependabot)
    || !/\binterval:\s*weekly\b/.test(dependabot)
    || !/\bdirectory:\s*\/\s*$/m.test(dependabot)) {
    errors.push('.github/dependabot.yml: expected weekly GitHub Actions updates from repository root');
  }
}

const manifest = jsonFiles.get(manifestPath);
const expectedInventory = {
  connection: ['sudomockApiKey'],
  module: `create2DMockup get2DMockup list2DMockups set2DPrintAreas render2DMockup delete2DMockup deleteArtworks storeArtworks deleteMockup deleteFont getFont listFonts uploadFont getAccountInfo getMockup listMockups getJob listJobs render renderVideo updateMockup uploadPsd webhookCreate webhookDelete webhookEventsFeed webhookGet webhookListDeliveries webhookList webhookReplayDelivery webhookReplayFailed webhookRotateSecret webhookTest webhookUpdate downloadRender makeApiCall`.split(' '),
  function: [],
  rpc: ['listMockups', 'listSmartObjects'],
  webhook: [],
  endpoint: [],
};
const schemaRefs = new Map();

function addFileRef(owner, path, schema) {
  if (path === null || path === undefined) return;
  if (typeof path !== 'string') {
    errors.push(`${owner}: file reference must be a string or null`);
    return;
  }
  const file = resolve(sourceRoot, path);
  const outward = relative(sourceRoot, file);
  if (outward === '..' || outward.startsWith(`..${sep}`) || isAbsolute(outward)) {
    errors.push(`${owner}: file reference escapes src/sudomock (${path})`);
  } else if (!existsSync(file) || !statSync(file).isFile()) {
    errors.push(`${owner}: missing file ${path}`);
  } else if (schema) {
    schemaRefs.set(file, schema);
  }
}

function containsKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, key)) return true;
  return Object.values(value).some((child) => containsKey(child, key));
}

function hasResponseDirective(value, directive) {
  if (!value || typeof value !== 'object') return false;
  if (value.response && typeof value.response === 'object' && Object.hasOwn(value.response, directive)) return true;
  return Object.values(value).some((child) => hasResponseDirective(child, directive));
}

function responseDirectives(value, directive, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (value.response && typeof value.response === 'object' && Object.hasOwn(value.response, directive)) found.push(value.response[directive]);
  for (const child of Object.values(value)) responseDirectives(child, directive, found);
  return found;
}

function parameterFields(schema, prefix = '') {
  if (!Array.isArray(schema)) return [];
  return schema.flatMap((field) => {
    if (!field?.name) return [];
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    return [{ ...field, path }, ...parameterFields(field.spec, path)];
  });
}

function fieldAt(schema, path) {
  return parameterFields(schema).find((field) => field.path === path);
}

function code(component, key) {
  const path = component.codeFiles?.[key];
  return typeof path === 'string' ? jsonFiles.get(resolve(sourceRoot, path)) : undefined;
}

const allowedCapitalization = new Set(['Base64', 'GraphQL', 'JavaScript', 'Make', 'OAuth', 'Print-on-Demand', 'SudoMock', 'URLs']);
function capitalizedMidSentence(text) {
  let sentenceStart = true;
  for (const match of text.matchAll(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*|[.:!?]/g)) {
    const token = match[0];
    if (/^[.:!?]$/.test(token)) {
      sentenceStart = true;
    } else if (sentenceStart) {
      sentenceStart = false;
    } else if (/^[A-Z][a-z]/.test(token) && !allowedCapitalization.has(token)) {
      return token;
    }
  }
}

function capabilityComesFirst(text) {
  const copy = text.toLowerCase();
  const capability = ['product photo', 'photo to mockup']
    .map((phrase) => copy.indexOf(phrase))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b)[0];
  const productName = copy.indexOf('2d mockup');
  return capability !== undefined && (productName === -1 || capability < productName);
}

if (manifest) {
  for (const [type, expected] of Object.entries(expectedInventory)) {
    const actual = Object.keys(manifest.components?.[type] ?? {});
    const missing = expected.filter((name) => !actual.includes(name));
    const extra = actual.filter((name) => !expected.includes(name));
    if (missing.length || extra.length) errors.push(`makecomapp.json: ${type} inventory mismatch (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'})`);
  }

  if (manifest.origins?.length !== 1 || manifest.origins[0]?.label !== 'Development') {
    errors.push('makecomapp.json: expected the sole Development origin');
  }

  for (const origin of manifest.origins ?? []) {
    for (const type of Object.keys(expectedInventory)) {
      const localComponents = manifest.components?.[type] ?? {};
      const mappings = origin.idMapping?.[type];
      if (!Array.isArray(mappings)) {
        errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type} is missing`);
        continue;
      }
      const locals = new Set();
      const remotes = new Set();
      for (const [index, mapping] of mappings.entries()) {
        if (!mapping || (mapping.local !== null && typeof mapping.local !== 'string') || (mapping.remote !== null && typeof mapping.remote !== 'string')) {
          errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type}[${index}] is invalid`);
          continue;
        }
        if (mapping.localDeleted) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type}[${index}] has localDeleted`);
        if (mapping.nonOwnedByApp !== undefined && typeof mapping.nonOwnedByApp !== 'boolean') {
          errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type}[${index}] has invalid nonOwnedByApp`);
        }
        if (mapping.local !== null) {
          if (!mapping.local) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type}[${index}] has an empty local`);
          if (locals.has(mapping.local)) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type} duplicates local ${mapping.local}`);
          locals.add(mapping.local);
          if (!Object.hasOwn(localComponents, mapping.local)) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type} maps unknown local ${mapping.local}`);
        }
        if (mapping.remote !== null) {
          if (!mapping.remote) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type}[${index}] has an empty remote`);
          if (remotes.has(mapping.remote)) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type} duplicates remote ${mapping.remote}`);
          remotes.add(mapping.remote);
        }
      }
      for (const local of Object.keys(localComponents)) {
        if (!locals.has(local)) errors.push(`makecomapp.json: ${origin.label ?? origin.appId} idMapping.${type} is missing ${local}`);
      }
    }
  }

  const generalSchemas = { base: 'base', common: 'common', groups: 'groups' };
  for (const [key, path] of Object.entries(manifest.generalCodeFiles ?? {})) addFileRef(`generalCodeFiles.${key}`, path, generalSchemas[key]);
  const base = jsonFiles.get(resolve(sourceRoot, manifest.generalCodeFiles?.base ?? ''));
  const common = jsonFiles.get(resolve(sourceRoot, manifest.generalCodeFiles?.common ?? ''));
  if (common?.timeout !== 300000 || base?.timeout !== 300000) {
    errors.push('general Base and common data must use the 300-second timeout for long-running media jobs');
  }
  const componentSchemas = {
    communication: 'api',
    staticParams: 'parameters',
    mappableParams: 'parameters',
    interface: 'parameters',
    samples: 'samples',
    epoch: 'epoch',
    scope: 'scope',
    params: 'parameters',
    attach: 'api',
    detach: 'api',
    update: 'api',
    requiredScope: 'scope',
  };
  for (const [type, components] of Object.entries(manifest.components ?? {})) {
    for (const [name, component] of Object.entries(components)) {
      if (!component) {
        errors.push(`makecomapp.json: ${type}.${name} has no metadata`);
        continue;
      }
      for (const [key, path] of Object.entries(component.codeFiles ?? {})) addFileRef(`${type}.${name}.codeFiles.${key}`, path, componentSchemas[key]);
      for (const [property, referenceType] of [['connection', 'connection'], ['altConnection', 'connection'], ['webhook', 'webhook']]) {
        const reference = component[property];
        if (reference !== null && reference !== undefined
          && (typeof reference !== 'string' || !Object.hasOwn(manifest.components?.[referenceType] ?? {}, reference))) {
          errors.push(`makecomapp.json: ${type}.${name} references unknown ${property} ${JSON.stringify(reference)}`);
        }
      }
      const communication = code(component, 'communication');
      for (const key of ['followRedirects', 'followAllRedirects']) {
        if (containsKey(communication, key)) errors.push(`${type}.${name}: invalid request key ${key}; use the official singular key`);
      }
      if (['connection', 'module', 'rpc', 'webhook'].includes(type) && !component.codeFiles?.communication) {
        errors.push(`makecomapp.json: ${type}.${name} is missing communication`);
      }
      if (type === 'module') {
        if (component.moduleType !== 'universal' && !component.codeFiles?.interface) errors.push(`makecomapp.json: module.${name} is missing its interface`);
        const badLabel = name === 'makeApiCall' && component.label === 'Make an API Call' ? undefined : capitalizedMidSentence(component.label ?? '');
        const badDescription = capitalizedMidSentence(component.description ?? '');
        if (badLabel) errors.push(`makecomapp.json: module.${name} label is not sentence case (${badLabel})`);
        if (badDescription) errors.push(`makecomapp.json: module.${name} description is not sentence case (${badDescription})`);
      }
    }
  }

  const connection = manifest.components?.connection?.sudomockApiKey;
  if (connection?.label !== 'SudoMock API key') errors.push('connection.sudomockApiKey: label must be "SudoMock API key"');
  const apiKey = fieldAt(code(connection ?? {}, 'params'), 'apiKey');
  if (!apiKey
    || apiKey.label !== 'API key'
    || apiKey.type !== 'password'
    || apiKey.required !== true
    || apiKey.editable !== true
    || typeof apiKey.help !== 'string'
    || !/https:\/\/sudomock\.com\/[^)\s]*api-keys/i.test(apiKey.help)) {
    errors.push('connection.sudomockApiKey: API key must be password, required, editable, and link to the SudoMock API-key page');
  }

  addFileRef('general/app.json', 'general/app.json');
  const app = jsonFiles.get(join(sourceRoot, 'general/app.json'));
  if (app) {
    addFileRef('general/app.json icon', app.icon);
    if (!capabilityComesFirst(app.description ?? '')) errors.push('general/app.json: description must introduce product-photo capability before the 2D product name');
  }
  const readmeRef = manifest.generalCodeFiles?.readme;
  if (typeof readmeRef !== 'string') {
    errors.push('makecomapp.json: generalCodeFiles.readme is required');
  } else {
    const readmePath = resolve(sourceRoot, readmeRef);
    if (existsSync(readmePath) && !capabilityComesFirst(readFileSync(readmePath, 'utf8'))) {
      errors.push('README.md: first product introduction must explain product-photo capability before the 2D product name');
    }
  }
  const groups = jsonFiles.get(resolve(sourceRoot, manifest.generalCodeFiles?.groups ?? ''));
  if (!Array.isArray(groups) || groups[0]?.label !== 'Product photos to mockups (2D)') {
    errors.push('modules/groups.json: first group must be "Product photos to mockups (2D)"');
  }
  const photoModule = manifest.components?.module?.create2DMockup;
  if (!/\bphoto\b/i.test(`${photoModule?.label ?? ''} ${photoModule?.description ?? ''}`)) {
    errors.push('makecomapp.json: create2DMockup copy must explain the photo capability');
  }

  const paginationRequired = new Set([
    'module:list2DMockups',
    'module:listFonts',
    'module:listJobs',
    'module:listMockups',
    'module:webhookEventsFeed',
    'module:webhookListDeliveries',
    'rpc:listMockups',
  ]);
  const searchPageSizes = {
    list2DMockups: ['limit', 100],
    listFonts: ['per_page', 100],
    listJobs: ['limit', 50],
    listMockups: ['limit', 100],
    webhookEventsFeed: ['limit', 200],
    webhookListDeliveries: ['limit', 200],
  };
  const expectedSearches = new Set([...Object.keys(searchPageSizes), 'webhookList']);
  const actualSearches = Object.entries(manifest.components?.module ?? {})
    .filter(([, module]) => module.moduleType === 'search')
    .map(([name]) => name);
  const missingSearches = [...expectedSearches].filter((name) => !actualSearches.includes(name));
  const extraSearches = actualSearches.filter((name) => !expectedSearches.has(name));
  if (missingSearches.length || extraSearches.length) {
    errors.push(`makecomapp.json: Search inventory mismatch (missing: ${missingSearches.join(', ') || 'none'}; extra: ${extraSearches.join(', ') || 'none'})`);
  }

  for (const [name, module] of Object.entries(manifest.components?.module ?? {})) {
    const communication = code(module, 'communication');
    if (!communication) continue;
    if (module.moduleType === 'action') {
      if (hasResponseDirective(communication, 'iterate')) errors.push(`module.${name}: action modules cannot use response.iterate`);
      if (containsKey(communication, 'pagination')) errors.push(`module.${name}: action modules cannot use pagination`);
    }
    if (module.moduleType === 'search') {
      const limitFields = [code(module, 'staticParams'), code(module, 'mappableParams')]
        .flatMap((schema) => parameterFields(schema))
        .filter((field) => field.path === 'limit');
      if (limitFields.length !== 1) {
        errors.push(`module.${name}: Search must have exactly one top-level limit input`);
      } else {
        if (limitFields[0].required === true) errors.push(`module.${name}: Search limit must be optional`);
        if (limitFields[0].default !== 10) errors.push(`module.${name}: Search limit default must be 10`);
      }
      const limits = responseDirectives(communication, 'limit');
      if (limits.length !== 1 || limits[0] !== '{{parameters.limit}}') errors.push(`module.${name}: response.limit must be exactly {{parameters.limit}}`);
      if (!hasResponseDirective(communication, 'iterate')) errors.push(`module.${name}: Search must use response.iterate`);
      const pageSize = searchPageSizes[name];
      if (pageSize && communication.qs?.[pageSize[0]] !== pageSize[1]) {
        errors.push(`module.${name}: request ${pageSize[0]} must use API maximum ${pageSize[1]}`);
      }
      if (name === 'webhookList' && containsKey(communication, 'pagination')) errors.push('module.webhookList: unpaginated API must not define pagination');
      if (name === 'listMockups') {
        const params = parameterFields(code(module, 'mappableParams'));
        if (params.some((field) => field.path === 'return_all') || JSON.stringify(communication).includes('return_all')) {
          errors.push('module.listMockups: legacy return_all is not allowed');
        }
      }
    }
    if (paginationRequired.has(`module:${name}`)) {
      if (!communication.pagination || typeof communication.pagination !== 'object') {
        errors.push(`module.${name}: supported pagination is missing`);
      } else if (!communication.pagination.condition || !communication.pagination.qs || !Object.keys(communication.pagination.qs).length) {
        errors.push(`module.${name}: pagination must define condition and page parameters`);
      }
    }

    for (const field of parameterFields(code(module, 'mappableParams')).filter((item) => item.type === 'date')) {
      if (!JSON.stringify(communication).includes(`parameters.${field.path}`)) {
        errors.push(`module.${name}: date input ${field.path} is not mapped to the request`);
      }
    }
    for (const field of [
      ...parameterFields(code(module, 'staticParams')),
      ...parameterFields(code(module, 'mappableParams')),
    ]) {
      if (field.name === 'color' && !['array', 'collection'].includes(field.type) && field.type !== 'color') {
        errors.push(`module.${name}: public color input ${field.path} must use type color`);
      }
    }
    for (const field of parameterFields(code(module, 'interface'))) {
      if (/(?:^date$|_at$|At$|_date$|Date$|timestamp$)/.test(field.name) && field.type !== 'date') {
        errors.push(`module.${name}: interface field ${field.path} must use type date`);
      }
    }

    if (fieldAt(code(module, 'mappableParams'), 'wait_for_completion')) {
      const pollTimeout = fieldAt(code(module, 'mappableParams'), 'poll_timeout');
      const requests = Array.isArray(communication) ? communication : [communication];
      const repeatConditions = requests
        .map((request) => request?.repeat?.condition)
        .filter((condition) => typeof condition === 'string');
      const hasBoundedNonterminalRepeat = repeatConditions.some((condition) =>
        condition.includes('wait_for_completion')
        && condition.includes('poll_timeout')
        && condition.includes('ifempty(parameters.poll_timeout')
        && condition.includes('now < addSeconds')
        && ['succeeded', 'failed', 'cancelled'].every((status) => condition.includes(status)));
      const hasTimeoutDataError = requests.some((request) => {
        const response = request?.response;
        const error = response?.valid?.type === 'DataError' ? response.valid : response?.error?.type === 'DataError' ? response.error : undefined;
        const guard = `${request?.condition ?? ''} ${error?.condition ?? ''}`;
        return error
          && guard.includes('wait_for_completion')
          && guard.includes('poll_timeout')
          && guard.includes('ifempty(parameters.poll_timeout')
          && ['succeeded', 'failed', 'cancelled'].every((status) => guard.includes(status));
      });
      if (!pollTimeout || pollTimeout.default !== 300 || pollTimeout.validate?.max !== 300) errors.push(`module.${name}: poll_timeout must match Make's 300-second extended timeout`);
      if (!hasBoundedNonterminalRepeat) errors.push(`module.${name}: wait polling must stop at poll_timeout for every nonterminal status`);
      if (!hasTimeoutDataError) errors.push(`module.${name}: a nonterminal poll timeout must raise DataError`);
    }
  }

  const render2DParams = code(manifest.components?.module?.render2DMockup ?? {}, 'mappableParams');
  const printAreas = fieldAt(render2DParams, 'print_areas');
  const imageFormat = fieldAt(render2DParams, 'export_options.image_format');
  const imageSize = fieldAt(render2DParams, 'export_options.image_size');
  const dpi = fieldAt(render2DParams, 'export_options.dpi');
  const imageFormats = imageFormat?.options?.map((option) => option.value);
  if (printAreas?.validate?.maxItems !== 8) errors.push('module.render2DMockup: print_areas must allow at most 8 items');
  if (imageFormat?.default !== 'webp' || !['png', 'jpg', 'webp'].every((format) => imageFormats?.includes(format))) {
    errors.push('module.render2DMockup: image_format must include png, jpg, and webp with webp as default');
  }
  if (imageSize?.validate?.min !== 100 || imageSize?.validate?.max !== 10000) {
    errors.push('module.render2DMockup: image_size range must be 100–10000');
  }
  if (!dpi || dpi.required === true || Object.hasOwn(dpi, 'default')) {
    errors.push('module.render2DMockup: dpi must be optional and have no implicit default');
  }

  const renderVideo = manifest.components?.module?.renderVideo;
  const renderVideoParams = code(renderVideo ?? {}, 'mappableParams');
  const videoSmartObjects = fieldAt(renderVideoParams, 'smart_objects');
  const videoDuration = fieldAt(renderVideoParams, 'video.duration_seconds');
  const videoExportOptions = fieldAt(renderVideoParams, 'export_options');
  const videoBody = code(renderVideo ?? {}, 'communication');
  const videoRequests = Array.isArray(videoBody) ? videoBody : [videoBody];
  const renderVideoRequestBody = videoRequests.find((request) => request?.url === '/renders/video')?.body;
  if (!videoExportOptions || renderVideoRequestBody?.export_options !== '{{parameters.export_options}}') {
    errors.push('module.renderVideo: export_options must be exposed and mapped to the request');
  }
  if (videoDuration?.default !== 5) errors.push('module.renderVideo: video.duration_seconds default must be 5');
  if (videoSmartObjects?.required !== true || videoSmartObjects?.validate?.minItems !== 1) {
    errors.push('module.renderVideo: render-mode smart_objects must require at least one item');
  }

  const renderParams = code(manifest.components?.module?.render ?? {}, 'mappableParams');
  const renderAsset = fieldAt(renderParams, 'smart_objects.asset');
  const renderAssetUrl = fieldAt(renderParams, 'smart_objects.asset.url');
  if (renderAsset?.required === true || renderAssetUrl?.required === true) {
    errors.push('module.render: asset and asset.url cannot be required because Base64 and color-only inputs are supported');
  }
  for (const path of ['smart_objects.asset.flip_horizontal', 'smart_objects.asset.flip_vertical']) {
    if (fieldAt(renderParams, path)?.type !== 'boolean') errors.push(`module.render: missing PSD asset input ${path}`);
  }
  const textLayers = fieldAt(renderParams, 'text_layers');
  const textLayerFields = new Set(parameterFields(textLayers?.spec).map((field) => field.path));
  const expectedTextLayerFields = ['uuid', 'text', 'segments', 'segments.index', 'segments.text', 'font', 'font_size', 'color', 'stroke_color', 'fit'];
  if (textLayers?.type !== 'array' || expectedTextLayerFields.some((path) => !textLayerFields.has(path))) {
    errors.push('module.render: text_layers must expose the TextLayerInput structure instead of type any');
  }

  for (const name of ['webhookEventsFeed', 'webhookListDeliveries']) {
    const params = code(manifest.components?.module?.[name] ?? {}, 'mappableParams');
    for (const path of ['filters.status', 'filters.event_type']) {
      const field = fieldAt(params, path);
      if (!field || Object.hasOwn(field, 'default')) errors.push(`module.${name}: ${path} must default to all values by remaining unset`);
    }
  }
  const webhookUpdate = manifest.components?.module?.webhookUpdate;
  const webhookUpdateParams = code(webhookUpdate ?? {}, 'mappableParams');
  const enabled = fieldAt(webhookUpdateParams, 'update_fields.enabled');
  const enabledValues = enabled?.options?.map((option) => option.value);
  if (!enabled
    || enabled.type !== 'select'
    || enabled.required === true
    || Object.hasOwn(enabled, 'default')
    || !enabledValues?.includes(true)
    || !enabledValues?.includes(false)) {
    errors.push('module.webhookUpdate: enabled must be an unset/true/false three-state input with no default');
  }
  const eventTypesMapping = code(webhookUpdate ?? {}, 'communication')?.body?.event_types;
  const directNestedEventTypes = eventTypesMapping === '{{parameters.update_fields.event_types}}';
  const explicitlyGatedEventTypes = typeof eventTypesMapping === 'string'
    && eventTypesMapping.includes('parameters.event_types')
    && eventTypesMapping.includes('undefined')
    && /parameters\.(?!event_types\b)[A-Za-z0-9_.]+/.test(eventTypesMapping);
  if (typeof eventTypesMapping !== 'string'
    || eventTypesMapping.includes('length(parameters.event_types)')
    || (!directNestedEventTypes && !explicitlyGatedEventTypes)) {
    errors.push('module.webhookUpdate: event_types must preserve unset while sending an intentional empty list');
  }

  for (const [name, rpc] of Object.entries(manifest.components?.rpc ?? {})) {
    const communication = code(rpc, 'communication');
    if (!communication) continue;
    if (!hasResponseDirective(communication, 'limit')) errors.push(`rpc.${name}: RPC is missing response.limit`);
    if (paginationRequired.has(`rpc:${name}`) && !containsKey(communication, 'pagination')) errors.push(`rpc.${name}: supported pagination is missing`);
  }
}

const base = jsonFiles.get(join(sourceRoot, 'general/base.iml.json'));
if (base?.headers?.['X-API-KEY'] !== '{{connection.apiKey}}') errors.push('general/base.iml.json: missing connection API key header');
if (!base?.log?.sanitize?.includes('request.headers.`X-API-KEY`')) errors.push('general/base.iml.json: API key is not sanitized from logs');

function visitIml(value, file, path = '$', IML) {
  if (typeof value === 'string' && (value.includes('{{') || value.includes('}}'))) {
    const opens = value.match(/{{/g)?.length ?? 0;
    const closes = value.match(/}}/g)?.length ?? 0;
    if (opens !== closes) errors.push(`${relative(root, file)} ${path}: unbalanced IML delimiters`);
    if (IML) {
      IML.parse(value);
      for (const error of IML.errors) errors.push(`${relative(root, file)} ${path}: invalid IML (${error.message})`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((child, index) => visitIml(child, file, `${path}[${index}]`, IML));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) visitIml(child, file, `${path}.${key}`, IML);
  }
}

function findMakeEditor() {
  if (process.env.MAKE_APPS_EDITOR_PATH) return resolve(process.env.MAKE_APPS_EDITOR_PATH);
  for (const directory of [join(homedir(), '.vscode/extensions'), join(homedir(), '.vscode-insiders/extensions'), join(homedir(), '.cursor/extensions')]) {
    if (!existsSync(directory)) continue;
    const match = readdirSync(directory)
      .filter((name) => name.startsWith('integromat.apps-sdk-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
    if (match) return join(directory, match);
  }
}

const editor = findMakeEditor();
if (editor) {
  try {
    const require = createRequire(import.meta.url);
    const { getLanguageService, TextDocument } = require(join(editor, 'node_modules/vscode-json-languageservice'));
    const { IML } = require(join(editor, 'node_modules/@integromat/iml'));
    const schemaDirectory = join(editor, 'syntaxes/imljson/schemas');
    const schemaPaths = {
      manifest: join(editor, 'syntaxes/local-development/schemas/makecomapp.schema.json'),
      api: join(schemaDirectory, 'api.json'),
      base: join(schemaDirectory, 'base.json'),
      common: join(schemaDirectory, 'common.json'),
      epoch: join(schemaDirectory, 'epoch.json'),
      groups: join(schemaDirectory, 'groups.json'),
      parameters: join(schemaDirectory, 'parameters.json'),
      samples: join(schemaDirectory, 'samples.json'),
      scope: join(schemaDirectory, 'scope.json'),
    };
    schemaRefs.set(manifestPath, 'manifest');
    const matches = new Map();
    for (const [file, schema] of schemaRefs) {
      if (!jsonFiles.has(file)) continue;
      if (!matches.has(schema)) matches.set(schema, []);
      matches.get(schema).push(pathToFileURL(file).toString());
    }
    const languageService = getLanguageService({
      schemaRequestService: async (uri) => {
        const url = new URL(uri);
        url.hash = '';
        return readFileSync(fileURLToPath(url), 'utf8');
      },
      workspaceContext: { resolveRelativePath: (path, resource) => new URL(path, resource).toString() },
    });
    languageService.configure({
      validate: true,
      allowComments: false,
      schemas: [...matches].map(([schema, fileMatch]) => ({ uri: pathToFileURL(schemaPaths[schema]).toString(), fileMatch })),
    });
    for (const file of [...matches.values()].flatMap((value) => value).map(fileURLToPath)) {
      let content = readFileSync(file, 'utf8');
      if (relative(sourceRoot, file) === 'modules/download-render/download-render.communication.iml.json') {
        const compatible = { ...jsonFiles.get(file), headers: {} };
        if (Object.hasOwn(compatible, 'followRedirect')) {
          compatible.followRedirects = compatible.followRedirect;
          delete compatible.followRedirect;
        }
        if (Object.hasOwn(compatible, 'followAllRedirect')) {
          compatible.followAllRedirects = compatible.followAllRedirect;
          delete compatible.followAllRedirect;
        }
        content = JSON.stringify(compatible);
      }
      const uri = pathToFileURL(file).toString();
      const document = TextDocument.create(uri, 'imljson', 1, content);
      const diagnostics = await languageService.doValidation(document, languageService.parseJSONDocument(document));
      for (const diagnostic of diagnostics) errors.push(`${relative(root, file)}:${diagnostic.range.start.line + 1}: ${diagnostic.message}`);
    }
    for (const [file, value] of jsonFiles) {
      if (file.endsWith('.iml.json')) visitIml(value, file, '$', IML);
    }
  } catch (error) {
    errors.push(`Make editor validation failed (${error.message})`);
  }
} else {
  for (const [file, value] of jsonFiles) {
    if (file.endsWith('.iml.json')) visitIml(value, file, '$');
  }
  console.warn('Make editor not installed; skipped schema and parser-backed IML validation.');
}

if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exit(1);
}

console.log(`Checked ${files.length} public files.`);
