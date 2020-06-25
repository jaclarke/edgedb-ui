<template>
  <div class="resizable-panel" ref="resizable" :class="{
    'layout-vertical': isVertical,
    'is-collapsed': module.isCollapsed
  }" :style="{
    '--panel-size': module.size+'%'
  }">
    <div class="main-panel" :class="mainClass" >
      <slot name="main" />
    </div>
    <template v-if="!module.isCollapsed">
      <div class="resizer" @mousedown="startResize"></div>
      <div class="resize-panel" :class="resizeClass">
        <slot name="resize" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class ResizablePanel extends Vue {
  @Prop()
  module!: ResizablePanelModule

  @Prop()
  mainClass: any

  @Prop()
  resizeClass: any

  get isVertical() {
    return this.module.layout === 'vertical'
  }

  startResize(event) {
    const startPos = this.isVertical ? event.clientY : event.clientX,
          containerSize = this.$refs.resizable[this.isVertical ? 'clientHeight' : 'clientWidth'],
          panelSize = this.module.size

    const onMove = (event) => {
      const currentPos = this.isVertical ? event.clientY : event.clientX,
            newSize = panelSize + (((startPos - currentPos) / containerSize) * 100)

      this.module.updateSize(newSize)
    }

    this.$root.$emit('set-drag-cursor', this.isVertical ? 'ns-resize' : 'ew-resize')
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', () => {
      this.$root.$emit('set-drag-cursor', null)
      document.removeEventListener('mousemove', onMove)
    }, {capture: true, once: true})
  }
}
</script>

<style lang="stylus" scoped>
$gridTemplate = 1fr 1px calc(var(--panel-size) - 0.5px)

.resizable-panel
  min-height: 0
  min-width: 0
  display: grid
  grid-template-columns: $gridTemplate
  grid-template-rows: 1fr
  overflow: hidden

  &.is-collapsed
    grid-template-columns: 1fr

.resizer
  position: relative
  background: #444
  cursor: ew-resize

  &:after
    content: ''
    position: absolute
    top: -4px
    bottom: @top
    left: @top
    right: @top
    z-index: 100

.main-panel, .resize-panel
  min-height: 0
  min-width: 0
  overflow: hidden
  contain: strict

.layout-vertical
  &.resizable-panel
    grid-template-columns: 1fr
    grid-template-rows: $gridTemplate

    &.is-collapsed
      grid-template-rows: 1fr

  > .resizer
    cursor: ns-resize
</style>
