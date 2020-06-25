// @ts-check
const { FuseBox, CSSPlugin, VueComponentPlugin, WebIndexPlugin, JSONPlugin } = require('fuse-box')
const execa = require('execa')
const { SVGSymbolsPlugin } = require('./src/svgsymbolsplugin/plugin')

const fuse = FuseBox.init({
  homeDir: 'src',
  output: 'dist/$name.js',
  allowSyntheticDefaultImports: true,
  ignoreModules: ['electron'],
  alias: {
    'edgedb': '~/edgedb/dist/src/',
    '@shared': '~/shared/',
    '@store': '~/renderer/store/',
    '@components': '~/renderer/components/',
    '@utils': '~/renderer/utils/',
    '@ui': '~/renderer/ui/',
  },
  plugins: [
    WebIndexPlugin({
      bundles: ['renderer'],
      target: 'renderer.html',
      template: 'src/renderer/renderer.html',
      path: '.',
    }),
    CSSPlugin(),
    JSONPlugin(),
    SVGSymbolsPlugin(),
  ]
})


fuse.bundle('main')
  .target('electron')
  .instructions('>main/main.ts -electron-devtools-installer')

fuse.bundle('preload')
  .target('electron')
  .instructions('>preload.ts')

fuse.dev({
  httpServer: false
})
fuse.bundle('renderer')
  .target('browser')
  .plugin(VueComponentPlugin())
  .instructions('>renderer/index.ts')
  .hmr()
  .watch()

fuse.bundle('schemaLayoutWorker')
  .target('browser')
  .instructions('>workers/schemaLayout/layout.ts')

fuse.run()
  .then(() => {
    const child = execa("node", [`${ __dirname }/node_modules/electron/cli.js`, 'dist/main.js'], { stdio: "inherit" })
    .on("close", () => process.exit())
    .on('data', (data) => console.log("electron > " + data))
  })
