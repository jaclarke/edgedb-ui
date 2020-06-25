<template>
  <div style="width: max-content">
    <div class="form" :class="{
      'form-disabled': restoring
    }">
      <label>Restore Dump File</label>
      <ui-file-picker v-model="$v.filePath.$model" />

      <template v-if="$v.filePath.$error || $v.filePath.$pending || fileInfo">
        <div></div>
        <loading v-if="$v.filePath.$pending" />
        <div v-else-if="fileInfo" class="file-info">
          <label>File Size</label><span>{{ formatBytes(fileInfo.fileSize) }}</span>
          <label>Dump Version</label><span>{{ fileInfo.dumpVersion }}</span>
          <label>Dumped At</label><span>{{ fileInfo.headerInfo.dumpTime.toUTCString() }}</span>
          <label>Server Version</label><span>{{ fileInfo.headerInfo.serverVersion }}</span>
        </div>
        <div v-else style="color: #e6535a">
          File Error <span class="secondary">{{ fileError }}</span>
        </div>
      </template>

      <label>To Database</label>
      <input v-model="$v.database.$model" 
        :class="{invalid: $v.database.$error}" />
      
    </div>
    <div class="bottom-bar">
      <div class="restore-progress">
        <template v-if="restoring">
          <ui-progress :value="progress" />
          <span class="progress-info">{{ bytesRead ? `Restoring (${(progress*100).toFixed(0)}%)` : 'Connecting to database' }}</span>
        </template>
        <div v-else-if="failureMessage" class="restore-failed">
          Restore failed<br>
          <span class="secondary">{{ failureMessage }}</span>
        </div>
        <div v-else-if="bytesRead" class="restore-complete">Restore complete</div>
      </div>
      <ui-button @click="beginRestore" :disabled="$v.$invalid || restoring">{{restoring ? 'Cancel' : 'Restore'}}</ui-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import { required, alphaNum } from 'vuelidate/lib/validators'

import { formatBytes } from '@utils/misc'

import { connectionsModule } from '@store/connections'

import UiButton from '@ui/Button.vue'
import UiFilePicker from '@ui/FilePicker.vue'
import UiProgress from '@ui/Progress.vue'
import Loading from '@ui/Loading.vue'

@Component({
  components: {
    UiButton,
    UiFilePicker,
    UiProgress,
    Loading,
  },
  validations: {
    database: {
      required,
      alphaNum,
    },
    filePath: {
      required,
      validDumpFile(path) {
        if (!path) return false
        return this.module.checkDumpFile(path)
          .then(info => {
            this.fileInfo = info
            this.fileError = ''
            return true
          })
          .catch(err => {
            this.fileError = err.message
            this.fileInfo = null
            return false
          })
      }
    }
  }
})
export default class RestorePage extends Vue {
  formatBytes = formatBytes

  @Inject()
  readonly module!: any

  database = ''
  filePath = ''

  fileInfo: DumpFileInfo = null
  fileError = ''

  restoring = false
  bytesRead = 0
  failureMessage = ''

  get progress() {
    return this.fileInfo ? this.bytesRead / this.fileInfo.fileSize : 0
  }

  beginRestore() {
    this.bytesRead = 0
    this.failureMessage = ''
    this.restoring = true
    this.module.restoreDatabase({
      database: this.database,
      path: this.filePath,
      progress: (bytes) => this.bytesRead = bytes
    })
      .then(() => {
        console.log('restore complete')
      })
      .catch(err => {
        this.failureMessage = err.message
      })
      .finally(() => {
        this.restoring = false
      })
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

.restore-progress
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

.restore-complete
  text-align: right
  color: #79bf28

.restore-failed
  text-align: right
  color: #e6535a

.file-info
  display: grid;
  grid-template-columns: max-content auto
  grid-gap: 6px 10px
  align-items: center
  font-size: 13px
  color: #cacaca

  label
    text-align: end
    text-transform: uppercase
    font-size: 11px
    color: #ababab
</style>
