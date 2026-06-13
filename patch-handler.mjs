import { readFileSync, writeFileSync } from 'fs';

const file = '.open-next/server-functions/default/handler.mjs';
let content = readFileSync(file, 'utf8');

// Fix: replace `require(this.middlewareManifestPath)` with a mock
// The function returns null in minimalMode anyway, so we just return the empty manifest
const target = 'return this.minimalMode?null:require(this.middlewareManifestPath)';
const replacement = 'return{version:3,middleware:{},functions:{},sortedMiddleware:[]}';

if (!content.includes(target)) {
  console.error('Target pattern not found! Pattern:', target);
  process.exit(1);
}

const count = (content.split(target).length - 1);
console.log(`Found ${count} occurrences of target pattern`);

content = content.replaceAll(target, replacement);

const remaining = content.includes(target);
console.log('Remaining occurrences:', remaining ? 'YES (problem)' : 'none (good)');

writeFileSync(file, content);
console.log('Done. Patched getMiddlewareManifest() to return empty manifest mock.');
