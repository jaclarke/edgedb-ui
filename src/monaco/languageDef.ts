// Based on pygments highlighter definition https://github.com/edgedb/edgedb/blob/f69f6936b97f495cf0ddd3d8294ed0e00b4ddfde/edb/edgeql/pygments/__init__.py
// and monarch sample code https://microsoft.github.io/monaco-editor/monarch.html

// TODO: Rewrite properly (autogenerate from https://github.com/edgedb/edgedb-editor-plugin maybe?)

import {
  reservedKeywords,
  unreservedKeywords,
  operators,
  navigation,
  typeBuiltins,
  moduleBuiltins,
  constraintBuiltins,
  fnBuiltins,
  boolLiterals,
} from './symbols'

function caseInsensitize(token: string) {
  return token.split('')
    .map(char => `[${char}${char.toUpperCase()}]`)
    .join('')
}

function escapeSymbols(symbols: string) {
  return '\\' + symbols.split('').join('\\')
}

const languageDef = {
  builtins: [...typeBuiltins, ...constraintBuiltins, ...fnBuiltins, ...moduleBuiltins],

  tokenizer: {
    root: [
      [/[ \t\r\n]+/, 'whitespace'],
      {include: '@comments'},
      {include: '@identifiers'},
      [/[{}()\[\]]/, '@brackets'],
      [/@\w+/, 'name.decorator'],
      [/\$\w+/, 'name.variable'],
      [operators.map(escapeSymbols).join('|'), 'operator'],
      [navigation.map(escapeSymbols).join('|'), 'punctuation.navigation'],
      [/[;,]/, 'delimiter'],
      {include: '@numbers'},
      {include: '@strings'},
    ],

    comments: [
      [/#.*$/, 'comment.singleline'],
    ],

    identifiers: [
      [/[a-zA-Z_]\w*/, {cases: {
          '(__source__|__subject__)': 'name.builtin.pseudo',
          '__type__': 'name.builtin.pseudo',
          [`(${boolLiterals.map(caseInsensitize).join('|')})`]: 'keyword.constant',
          [`(${reservedKeywords.map(caseInsensitize).join('|')})`]: 'keyword.reserved',
          [`(${unreservedKeywords.map(caseInsensitize).join('|')})`]: 'keyword.reserved',
          '@builtins': 'name.builtin',
          '@default': 'indentifier'
        }}
      ],
    ],

    strings: [
      [/r?(?<Q>['"])(\\['"]|\n|.)*?\k<Q>/, 'string'],
      [/(?<Q>\$(?:[A-Za-z_]\w*)?\$)(\n|.)*?\k<Q>/, 'string.other'],
      [/`.*?`/, 'string.backtick'],
    ],

    numbers: [
      [/(?<!\w)((\d+(\.\d+)?([eE]([+-])?[0-9]+))|(\d+\.\d+))n?/, 'number'],
      [/(?<!\w)\d+n?/, 'number'],
    ],
  }
}

export default languageDef
