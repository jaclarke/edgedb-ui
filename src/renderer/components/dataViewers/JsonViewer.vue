<template>
  <div class="json-viewer" v-html="parsedJSON"></div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { JSONParse, JSONNumber } from '@utils/jsonParser'

function JSONtoHTML(json: any, depth = 0) {
  switch (typeof json) {
    case 'boolean':
      return `<span class="bool">${json}</span>`
    case 'string':
      return `<span class="str">"${json}"</span>`
    case 'object':
      if (json === null) {
        return '<span class="null">null</span>'
      } else if (json instanceof JSONNumber) {
        return `<span class="number">${json.val}</span>`
      } else if (Array.isArray(json)) {
        return '[\n' + '    '.repeat(depth+1)
          + json.map(val => JSONtoHTML(val, depth+1))
            .join(',\n'+'    '.repeat(depth+1))
          + '\n' + '    '.repeat(depth) + ']'
      } else {
        return '{\n' + '    '.repeat(depth+1)
          + Object.entries(json).map(([key, val]) => {
              return `"<span class="key">${key}</span>": ${JSONtoHTML(val, depth+1)}`
            })
            .join(',\n'+'    '.repeat(depth+1))
          + '\n' + '    '.repeat(depth) + '}'
      }
  }
}

@Component
export default class JsonViewer extends Vue {
  @Prop()
  item!: string

  get parsedJSON() {
    return JSONtoHTML(JSONParse(this.item))
  }
}
</script>

<style lang="stylus" scoped>
.json-viewer
  padding: 6px 10px
  white-space: pre
  color: #aaa
  line-height: 1.5em

  >>> .key
    color: #e0e0e0
  >>> .str
    color: #e5df59
  >>> .number
    color: #b466ce
  >>> .bool
    color: #2dd8a5
  >>> .null
    color: #bbb
</style>
