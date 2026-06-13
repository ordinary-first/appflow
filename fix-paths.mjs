import { readFileSync, writeFileSync } from 'fs';

const file = '.open-next/server-functions/default/handler.mjs';
let content = readFileSync(file, 'utf8');

const before = content.length;

// Replace Windows backslash paths inside string literals like ".next\server\..."
// These appear as ".next\\server\\" in the JS source (escaped backslash)
content = content.replaceAll('.next\\\\', '.next/');
content = content.replaceAll('.next\\', '.next/');

// Also fix remaining backslashes in paths that started with .next/
// After the above replacements, something like ".next/server\\pages-manifest.json" may remain
// Run a targeted fix for server/ subpaths
content = content.replaceAll('server\\\\', 'server/');
content = content.replaceAll('server\\', 'server/');

console.log(`Processed: ${before} → ${content.length} bytes`);

// Verify
const remaining = (content.split('.next' + '\\').length - 1);
console.log(`Remaining backslash .next paths: ${remaining}`);

writeFileSync(file, content);
console.log('Done.');
