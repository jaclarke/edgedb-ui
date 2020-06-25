<template>
  <div class="panel">
    <div v-if="!connections">
      loading...
    </div>
    <div v-else class="treeview">
      <div class="treeview-wrapper">
        <connection-item v-for="conn in connections" :connection="conn" />
      </div>
    </div>
    <div class="new-connection">
      <icon name="add" @click="createNewConnection" /><span>New Connection</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

import { connectionsModule } from '@store/connections'
import { tabsModule } from '@store/tabs'
import Icon from '@ui/Icon.vue'

import ConnectionItem from './connections/ConnectionItem.vue'

import 'assets/icons/add.svg'

@Component({
  components: {
    ConnectionItem,
    Icon,
  }
})
export default class ConnectionsPanel extends Vue {
  get connections() {
    return connectionsModule.connections
  }

  createNewConnection() {
    tabsModule.newConnSettingsTab()
  }
}
</script>

<style lang="stylus" scoped>
.panel
  background-color: #252525
  width: 250px
  color: #E0E0E0
  font-size: 14px
  display: flex
  flex-direction: column
  min-height: 0

.treeview
  padding: 20px 0
  display: flex
  flex-direction: column
  overflow: auto
  flex-grow: 1

.treeview-wrapper
  width: max-content
  min-width: 100%

.new-connection
  display: flex
  align-items: center
  color: #d0d0d0
  cursor: pointer

  svg
    padding: 4px
    opacity: 0.6
    transition: opacity 0.2s

  span
    opacity: 0
    transition: opacity 0.2s
  
  svg:hover, svg:hover + span
    opacity: 1
</style>
