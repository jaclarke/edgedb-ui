// @ts-check
const { readFileSync, writeFileSync } = require('fs')
const cpy = require('cpy')
 
;(async () => {
  await cpy('./{editor,base}/**', '../../../../dist/monaco/vs/', {
    cwd: './node_modules/monaco-editor/min/vs/',
    parents: true
  })

  const requirejs = readFileSync('./node_modules/requirejs/require.js', 'utf8')
  writeFileSync('./dist/monaco/require.js', 
`var _monaco = (function () {
  //Define a require object here that has any
  //default configuration you want for RequireJS. If
  //you do not have any config options you want to set,
  //just use an simple object literal, {}. You may need
  //to at least set baseUrl.
  var require = {};

  ${ requirejs }

  return {require, define};
}());`
  )

  console.log('Files copied!')
})()
