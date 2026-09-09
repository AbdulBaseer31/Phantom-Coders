import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('local emulator configuration', () => {
  it('defines all required local emulators and ports', () => {
    const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../firebase.json'), 'utf8'));
    expect(config.emulators).toMatchObject({
      auth: { port: 9099 },
      firestore: { port: 8080 },
      functions: { port: 5001 },
      storage: { port: 9199 },
      ui: { enabled: true, port: 4000 },
    });
  });
});
