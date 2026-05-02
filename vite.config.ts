import { defineConfig } from 'vite';

const fromRoot = (relativePath: string): string =>
  decodeURIComponent(new URL(relativePath, import.meta.url).pathname);

export default defineConfig({
  resolve: {
    alias: {
      '@events': fromRoot('./src/events'),
      '@config': fromRoot('./src/config'),
      '@entities': fromRoot('./src/entities'),
      '@systems': fromRoot('./src/systems'),
      '@scenes': fromRoot('./src/scenes'),
      '@render': fromRoot('./src/render'),
      '@utils': fromRoot('./src/utils'),
      '@app-types': fromRoot('./src/types'),
    },
  },
});
