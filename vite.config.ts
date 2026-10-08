import { defineConfig } from 'vitest/config';

const PORT = 3064;
// A leading dot allows the domain and every subdomain (game.asked.hu, ...)
const ALLOWED_HOSTS = ['.asked.hu'];

export default defineConfig({
  base: './',
  // host: true listens on all interfaces so the game is reachable from other machines
  server: { port: PORT, strictPort: true, host: true, allowedHosts: ALLOWED_HOSTS },
  preview: { port: PORT, strictPort: true, host: true, allowedHosts: ALLOWED_HOSTS },
  build: {
    rolldownOptions: {
      // added after minification so the notice survives in the published bundle
      output: { postBanner: '/*! Nightfall Survivors (c) 2026 cucu0628. All rights reserved. See LICENSE. */' },
    },
  },
  test: { environment: 'node' },
});
