// Removes dist/ before a build, so a file deleted from src/ does not linger in
// the package. Plain Node so it works the same on every platform.
import { rmSync } from 'node:fs';

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
