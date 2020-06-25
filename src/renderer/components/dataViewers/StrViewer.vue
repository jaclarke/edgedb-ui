<template>
  <div class="str-viewer" :style="{
    '--line-count': lines.length
  }" :class="{
    'wrap-lines': settings.wrapLines
  }">
    <div class="line spacer"><span></span></div>
    <div class="line" v-for="line in lines">
      <span>{{ line }}</span>
    </div>
    <div class="line spacer"><span></span></div>

    <portal to="detailsPanel">
      <div class="statusbar-button" @click="settings.wrapLines = !settings.wrapLines">
        Line Wrap&nbsp;<span style="font-size: 12px; color: #9e9e9e;"
        >{{ settings.wrapLines ? 'ON' : 'OFF' }}</span>
      </div>
    </portal>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { viewerSettingsModule } from '@store/viewerSettings'

@Component
export default class StrViewer extends Vue {
  settings = viewerSettingsModule

  @Prop()
  item!: string

  get lines() {
    return this.item.split(/\r|\n|\r\n/)
  }
}
</script>

<style lang="stylus" scoped>
.str-viewer
  counter-reset: lineno
  display: grid
  grid-template-columns: auto 1fr
  grid-template-rows: 8px repeat(var(--line-count), min-content) minmax(8px, 1fr)
  line-height: 1.5em

.line
  display: contents

  &:before
    counter-increment: lineno
    content: counter(lineno)
    color: #9a9a9a
    text-align: right
    background: #202020
    padding: 0 8px
    border-right: 1px solid rgba(255,255,255,0.1)
    position: sticky
    left: 0

  > span
    white-space: pre
    padding: 0 6px

    .wrap-lines &
      white-space: pre-wrap

.spacer
  &:before
    counter-increment: none
    content: ''
</style>
