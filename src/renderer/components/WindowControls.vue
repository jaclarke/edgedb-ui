<template>
  <div class="window-controls">
    <div class="controls">
      <div class="button" @click="toggleDevtools">
        <svg class="dev-icon">
          <use xlink:href="#dev-tool" />
        </svg>
      </div>
      <div class="button" @click="reloadWindow">
        <svg class="dev-icon">
          <use xlink:href="#dev-reload" />
        </svg>
      </div>
      <div class="button" @click="buttonAction('minimise')">
        <span>&#xE921;</span>
      </div>
      <div class="button" @click="buttonAction('toggleMax')">
        <span v-if="isMaximised">&#xE923;</span>
        <span v-else>&#xE922;</span>
      </div>
      <div class="button close" @click="buttonAction('close')">
        <span>&#xE8BB;</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { windowModule } from '@store/window'

import 'assets/icons/dev-tool.svg'
import 'assets/icons/dev-reload.svg'

@Component
export default class WindowControls extends Vue {
  
  get isMaximised() {
    return windowModule.isMaximised
  }

  buttonAction(action: string) {
    ipc.callMain('windowControl:buttonPressed', action)
  }

  reloadWindow() {
    ipc.callMain('dev:reloadWindow')
  }

  toggleDevtools() {
    ipc.callMain('dev:toggleDevtools')
  }
}
</script>

<style lang="stylus" scoped>
.window-controls
  background: #181818
  -webkit-app-region: drag

.controls
  height: 32px
  display: grid
  grid-auto-columns: 46px
  grid-auto-flow: column
  font-family: "Segoe MDL2 Assets"
  font-size: 10px
  color: #fff
  user-select: none
  cursor: default
  -webkit-app-region: no-drag

.button
  display: flex
  justify-content: center
  align-items: center

  &:hover
    background: rgba(255,255,255,0.1)
  &:active
    background: rgba(255,255,255,0.2)

.close
  &:hover
    background: #e81123
  &:active
    background: #f1707a

.dev-icon
  width: 16px
  height: 16px
  fill: none
  stroke-width: 1.2px
</style>
