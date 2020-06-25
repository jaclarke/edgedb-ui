// @ts-nocheck

import { themeData } from './themeData'
import languageDef from './languageDef'

window.define = _monaco.define
_monaco.require.config({ paths: { vs: './monaco/vs' }, waitSeconds: 0 })

_monaco.require(['vs/editor/editor.main'], (monaco: any) => {
  monaco.editor.defineTheme('edgeQL', themeData)

  monaco.languages.register({ id: 'edgeQL' })

  monaco.languages.setLanguageConfiguration('edgeQL', {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['\'', '\''],
      ['"', '"']
    ],
    surroundingPairs: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<', '>'],
      ['\'', '\''],
      ['"', '"']
    ]
  })

  monaco.languages.setMonarchTokensProvider('edgeQL', languageDef)
})
