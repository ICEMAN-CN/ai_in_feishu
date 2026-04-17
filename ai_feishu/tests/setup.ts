import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Module, { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, '../src');

const _require = createRequire(import.meta.url);
_require('tsx/cjs');

// Required for admin router tests - ADMIN_API_KEY must be set at module load time
process.env.ADMIN_API_KEY = 'test-admin-api-key-for-testing';

const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...args: any[]) {
  if (request.startsWith('@/')) {
    const resolved = resolve(srcDir, request.slice(2));
    try {
      return originalResolveFilename.call(this, resolved + '.ts', ...args);
    } catch {
      return originalResolveFilename.call(this, resolved, ...args);
    }
  }
  return originalResolveFilename.call(this, request, ...args);
};
