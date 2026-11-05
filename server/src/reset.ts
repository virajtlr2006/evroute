import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
fs.rmSync(dataDir, { recursive: true, force: true });
console.log('Database deleted. It will be re-created and re-seeded on next start.');
