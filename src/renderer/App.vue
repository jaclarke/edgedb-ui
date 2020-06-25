<template>
  <div id="app" :style="{
    border: accentColour ? `1px solid ${accentColour}` : null,
    '--drag-cursor': dragCursor,
    '--accent-colour': accentColour
  }" :class="{
    'drag-overlay': !!dragCursor
  }">
    <connections-panel class="panel-connections" />
    <tab-bar class="panel-tabbar" />
    <main-panel class="panel-main" />
    <status-bar class="panel-statusbar" />
    <window-controls class="panel-wincontrols" />
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

import { windowModule } from '@store/window'

import ConnectionsPanel from './components/ConnectionsPanel.vue'
import MainPanel from './components/MainPanel.vue'
import WindowControls from './components/WindowControls.vue'
import StatusBar from './components/StatusBar.vue'
import TabBar from './components/TabBar.vue'

@Component({
  components: {
    ConnectionsPanel,
    MainPanel,
    WindowControls,
    StatusBar,
    TabBar,
  },
})
export default class App extends Vue {
  dragCursor: string = null

  get accentColour() {
    return windowModule.accentColour
  }

  mounted() {
    this.$root.$on('set-drag-cursor', (cursor: string | null) => {
      this.dragCursor = cursor
    })
  }
}
</script>

<style lang="stylus" scoped>
#app
  position: absolute
  top: 0
  left: 0
  right: 0
  bottom: 0
  display: grid
  grid-template-columns: auto 1fr auto
  grid-template-rows: auto 1fr 30px
  grid-template-areas: 'connections tabbar wincontrols' \
                       'connections main main' \
                       'statusbar statusbar statusbar'
  background-color: #333333
  font-family: Segoe UI, sans-serif
  font-size: 14px
  user-select: none
  cursor: default

  &.drag-overlay:after
    content: ''
    position: absolute
    top: 0
    left: 0
    right: 0
    bottom: 0
    z-index: 1000
    cursor: var(--drag-cursor)

.panel
  &-connections
    grid-area: connections

  &-main
    grid-area: main
    display: grid
    min-width: 0
    min-height: 0

  &-statusbar
    grid-area: statusbar
  
  &-tabbar
    grid-area: tabbar

  &-wincontrols
    grid-area: wincontrols

>>> input
  background-color: #292929
  color: #e0e0e0
  font-family: Segoe UI, sans-serif
  font-size: 13px
  padding: 5px 12px
  border-radius: 3px
  border: 1px solid #555555
  outline: 0

  &[type="checkbox"]
    -webkit-appearance: none
    padding: 0
    width: 18px
    height: 18px
    border-color: transparent
    display: flex
    align-items: center
    justify-content: center

    &:checked:after
      content: '\E73E'
      font-family: "Segoe MDL2 Assets"
      font-size: 14px
  
  &:focus
    border-color: var(--accent-colour)

  &.invalid
    border-color: #dc262e
    background-color: #382222

>>> button
  display: inline-flex
  align-items: center
  background: #292929
  color: #e0e0e0
  font-family: Segoe UI, sans-serif
  font-size: 13px
  border: 0
  border-radius: 4px
  padding: 5px 12px
  border-top: 1px solid #3a3a3a
  margin-top: -1px
  outline: 0
  box-shadow: 0 1px 1px rgba(0,0,0,0.3)
  white-space: nowrap

  &:focus, &:focus-within
    box-shadow: 0 0 0 1px var(--accent-colour), 0 1px 1px rgba(0,0,0,0.3)

  &:disabled
    opacity: 0.7
    box-shadow: none
    border-top: none
    margin-top: 0

  &:hover
    background: #2b2b2b

  &:active
    background: #272727
    border-top: none
    box-shadow: none
    margin-top: 0

>>> ::-webkit-scrollbar
  width: 11px
  height: 11px
 
>>> ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner
  background: rgba(0,0,0,0.1)
 
>>> ::-webkit-scrollbar-thumb
  background: rgba(255,255,255,0.1)
  
</style>
