// Installs the resolution hooks (tests/hooks.mjs) before any test module is loaded.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./hooks.mjs', pathToFileURL(import.meta.filename));
