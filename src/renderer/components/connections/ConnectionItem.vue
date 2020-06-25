<template>
  <tree-view-item :name="connection.name" icon="server" :hasChildren="true"
    v-model="expanded" :isLoading="isLoading">
    <template v-slot:extra>
      <icon name="settings-alt" class="settings-icon" @click="openSettingsTab" />
    </template>
    <template v-slot:children v-if="connection.databases">
      <DatabaseItem v-for="database in connection.databases"
        :connection="connection" :database="database" />
    </template>
  </tree-view-item>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'

import { connectionsModule } from '@store/connections'
import { tabsModule } from '@store/tabs'

import TreeViewItem from './TreeViewItem.vue'
import DatabaseItem from './DatabaseItem.vue'
import Icon from '@ui/Icon.vue'

import 'assets/icons/server.svg'
import 'assets/icons/settings-alt.svg'

@Component({
  components: {
    TreeViewItem,
    DatabaseItem,
    Icon,
  }
})
export default class ConnectionItem extends Vue {
  expanded = false

  @Prop()
  connection!: any

  get isLoading() {
    return !this.connection.databases && !!this.connection.connecting.length
  }

  openSettingsTab() {
    tabsModule.openConnSettingsTab({connectionId: this.connection.id})
  }

  @Watch('expanded')
  expandedChanged(expanded) {
    if (expanded && !this.connection.databases) {
      connectionsModule.fetchDatabases({connectionId: this.connection.id})
    }
  }

  @Watch('connection.databases')
  dbChanged(_, old) {
    if (!old) this.expanded = true
  }
}
</script>

<style lang="stylus" scoped>
.connection-status
  width: 10px
  height: @width
  border-radius: ( @width / 2 )
  background-color: #bada55

.settings-icon
  cursor: pointer
</style>
