// Token colours from examples on https://edgedb.com/

export const themeData = {
  base: 'vs-dark',
  inherit: true,
  colors: {
    'editor.selectionBackground': '#444444',
    'editor.lineHighlightBackground': '#252525',
    'editorCursor.foreground': '#dfdfdf',
    'editorWhitespace.foreground': '#3b3a32',
  },
  rules: [
    {
      token: 'source',
      foreground: '#dedede'
    },
    {
      token: 'name.variable',
      foreground: '#2dd8a5'
    },
    {
      token: 'operator',
      foreground: '#fb9256'
    },
    {
      token: 'comment',
      foreground: '#8b8b8f'
    },
    {
      token: 'keyword.constant',
      foreground: '#b466ce'
    },
    {
      token: 'keyword.reserved',
      foreground: '#ee464d'
    },
    {
      token: 'name.builtin',
      foreground: '#2dd8a5'
    },
    {
      token: 'string',
      foreground: '#e5df59'
    },
    {
      token: 'number',
      foreground: '#b466ce'
    },
  ]
}
