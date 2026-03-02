import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: !isProduction,
  minify: isProduction,
  target: 'node18',
  define: {
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
  },
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context({
    ...config,
    plugins: [
      {
        name: 'watch-logger',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('[ext] Build failed:', result.errors);
            } else {
              console.log('[ext] Rebuilt successfully');
            }
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log('[ext] Watching...');
} else {
  await esbuild.build(config);
}
