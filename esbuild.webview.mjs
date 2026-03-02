import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

function ensureAgGridCss() {
  mkdirSync('dist', { recursive: true });
  const src = resolve('node_modules/ag-grid-community/styles/ag-grid.css');
  if (existsSync(src)) {
    copyFileSync(src, 'dist/ag-grid.css');
  } else {
    console.warn('[web] Warning: ag-grid.css not found at', src);
  }
}

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: 'dist/webview.js',
  sourcemap: !isProduction,
  minify: isProduction,
  target: ['chrome120'],
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'css',
  },
  define: {
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
  },
  logLevel: 'info',
};

ensureAgGridCss();

if (isWatch) {
  const ctx = await esbuild.context({
    ...config,
    plugins: [
      {
        name: 'watch-logger',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('[web] Build failed:', result.errors);
            } else {
              console.log('[web] Rebuilt successfully');
              ensureAgGridCss();
            }
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log('[web] Watching...');
} else {
  await esbuild.build(config);
}
