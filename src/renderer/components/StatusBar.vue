<template>
  <div class="statusbar">
    <portal-target :name="portalSourceTabId" :key="portalSourceTabId"
      class="tab-status" />
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

import { tabsModule } from '@store/tabs'

@Component
export default class StatusBar extends Vue {

  get portalSourceTabId() {
    return tabsModule.currentTabId || ''
  }

}
</script>

<style lang="stylus" scoped>
.statusbar
  display: flex
  background-color: #181818
  color: #e0e0e0
  font-size: 13px
  padding: 0 0.5em

>>> .statusbar-button
  padding: 0 0.6em
  cursor: pointer
  height: 100%
  display: flex
  align-items: center

  &:hover
    background: rgba(255,255,255,0.08)

.tab-status
  display: flex
  align-items: center
  margin-left: 250px
  flex-grow: 1
</style>
