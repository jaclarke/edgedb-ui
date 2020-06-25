<template>
  <div style="width: max-content">
    <div class="form" :class="{
      'form-disabled': dumping
    }">
      <label>Dump Database</label>
      <ui-select v-model="$v.database.$model">
        <option disabled value="">Select Database</option>
        <option v-for="name in databaseNames"
          :value="name">{{ name }}</option>
      </ui-select>

      <label>To File</label>
      <ui-file-picker v-model="$v.filePath.$model" type="save" />
    </div>
    <div class="bottom-bar">
      <div class="dump-progress">
        <template v-if="dumping">
          <ui-progress />
          <span class="progress-info">{{ bytesWritten ? `Dumping (${formattedBytesSize})` : 'Connecting to database' }}</span>
        </template>
        <div v-else-if="bytesWritten" class="dump-complete">Dump complete <span class="secondary">({{ formattedBytesSize }})</span></div>
        <div v-if="failureMessage" class="dump-failed">
          Dump failed<br>
          <span class="secondary">{{ failureMessage }}</span>
        </div>
      </div>
      <ui-button @click="beginDump" :disabled="$v.$invalid || dumping">{{dumping ? 'Cancel' : 'Dump'}}</ui-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import { required } from 'vuelidate/lib/validators'

import { formatBytes } from '@utils/misc'

import { connectionsModule } from '@store/connections'

import UiButton from '@ui/Button.vue'
import UiSelect from '@ui/Select.vue'
import UiFilePicker from '@ui/FilePicker.vue'
import UiProgress from '@ui/Progress.vue'

@Component({
  components: {
    UiButton,
    UiSelect,
    UiFilePicker,
    UiProgress,
  },
  validations: {
    database: {
      required
    },
    filePath: {
      required
    }
  }
})
export default class DumpPage extends Vue {
  @Inject()
  readonly module!: any

  get databaseNames() {
    return this.module.connectionDatabaseNames ?? []
  }

  database = ''
  filePath = ''

  dumping = false
  bytesWritten = 0
  failureMessage = ''

  get formattedBytesSize() {
    return formatBytes(this.bytesWritten)
  }

  beginDump() {
    this.bytesWritten = 0
    this.failureMessage = ''
    this.dumping = true
    this.module.dumpDatabase({
      database: this.database,
      path: this.filePath,
      progress: (bytes) => this.bytesWritten = bytes
    })
      .then(() => {
        console.log('dump complete')
      })
      .catch(err => {
        this.failureMessage = err.message
      })
      .finally(() => {
        this.dumping = false
      })
  }

  @Watch('module.connectionDatabaseNames', {
    immediate: true
  })
  watchDatabases(databases) {
    if (!databases) {
      connectionsModule.fetchDatabases({connectionId: this.module.connectionId})
    }
  }
}
</script>

<style lang="stylus" scoped>
.form
  display: grid
  grid-template-columns: max-content 280px
  grid-gap: 8px 15px
  align-items: center

  label
    text-align: end

.form-disabled
  opacity: 0.7
  pointer-events: none

.bottom-bar
  display: flex
  justify-content: flex-end
  align-items: center
  margin-top: 15px

.dump-progress
  flex-grow: 1
  display: flex
  flex-direction: column
  margin-right: 15px

.progress-info
  text-align: right
  color: #ababab
  margin-top: 4px

.secondary
  color: #ababab

.dump-complete
  text-align: right
  color: #79bf28

.dump-failed
  text-align: right
  color: #e6535a
</style>
