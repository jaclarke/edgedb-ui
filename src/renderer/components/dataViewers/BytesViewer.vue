<template>
  <div class="bytes-viewer" @mouseover="highlightedIndex = -1">
    <div class="row header">
      <div class="line-no" :style="{width: (lineNoWidth+1)+'ch'}"></div>
      <div class="byte" v-for="i in 16">0{{ (i-1).toString(16) }}</div>
    </div>
    <div class="row" v-for="line, li in lines">
      <div class="line-no">{{ li.toString(16).padStart(lineNoWidth, '0') }}0</div>
      <div class="bytes">
        <div class="byte" v-for="byte, bi in line.bytes"
          :class="{highlighted: li*16+bi === highlightedIndex}"
          @mouseover.stop="highlightedIndex = li*16+bi">{{ byte }}</div>
      </div>
      <div class="ascii">
        <span v-for="char, ci in line.ascii"
          :class="{highlighted: li*16+ci === highlightedIndex}"
          @mouseover.stop="highlightedIndex = li*16+ci">{{ char }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class BytesViewer extends Vue {
  highlightedIndex = -1

  @Prop()
  item!: Uint8Array

  get lines() {
    return Array(Math.ceil(this.item.length/16)).fill(0)
      .map((_, i) => {
        const val = [...this.item.slice(i*16, (i+1)*16)]
        return {
          bytes: val.map(n => n.toString(16).padStart(2, '0')),
          ascii: val.map(n => n >= 32 && n <= 126 ? String.fromCharCode(n) : '·').join('')
        }
      })
  }

  get lineNoWidth() {
    return this.lines.length.toString().length
  }
}
</script>

<style lang="stylus" scoped>
.bytes-viewer
  font-family: monospace
  color: #e0e0e0
  width: max-content
  padding: 6px 10px

.row
  display: flex
  height: 20px
  line-height: 20px

.bytes
  display: flex
  width: 48ch

.byte
  margin-left: 1ch

.ascii
  margin-left: 2ch
  width: 19.2ch
  white-space: pre

  span
    padding: 0 0.1ch

.highlighted
  background: #ccc
  color: #222

.header, .line-no
  opacity: 0.65
</style>
