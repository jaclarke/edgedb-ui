<template>
  <div style="display: contents">
    <resizable-panel :module="module.resultsPanel"
      mainClass="query-editor" resizeClass="results-details-panel">

      <template v-slot:main>
        <div class="actions-bar">
          <ui-select v-model="selectedConnection">
            <option disabled value="">Select Connection</option>
            <option v-for="conn in connections" :value="conn.id">{{ conn.name }}</option>
          </ui-select>

          <ui-select v-model="selectedDatabase">
            <option disabled value="">Select Database</option>
            <option v-for="db in databases" :value="db">{{ db }}</option>
          </ui-select>

          <ui-button @click="runQuery" icon="run"
            :loading="module.queryRunning" :disabled="!module.canQuery || module.queryRunning"
            style="margin-left: 25px">Run Query</ui-button>

          <div class="transaction" :class="{
            'transaction-active': inTransaction,
            'transaction-failed': transactionFailed
          }">
            <span v-if="inTransaction">{{
              transactionFailed ? 'Failed Transaction' : 'In Transaction'
            }}</span>

            <ui-button v-if="canStartTransaction"
              @click="module.startTransaction">Start Transaction</ui-button>
            <ui-button v-if="inTransaction"
              @click="module.rollbackTransaction">Rollback</ui-button>
            <ui-button v-if="inTransaction" :disabled="transactionFailed"
              @click="module.commitTransaction">Commit</ui-button>
          </div>

        </div>
        <div class="editor-wrapper" ref="editorWrapper">
          <monaco-editor class="editor" v-model="query" ref="editor"
            :options="monacoOptions" :amdRequire="monacoRequire"
            @editorDidMount="editorMounted" />
        </div>
      </template>

      <template v-slot:resize>
        <resizable-panel :module="module.detailPanel"
          mainClass="results" resizeClass="detail-viewer">
          <template v-slot:main>
            <div v-if="module.results && module.results.length+(module.error?1:0) > 1"
              class="result-group-tabs">
              <div v-for="result, i in module.results"
                class="result-group-tab"
                :class="{'result-group-selected': i === module.selectedResultGroup}"
                @click="module.selectResultGroup(i)">{{ result.status }}</div>
              <div v-if="module.error" class="result-group-tab result-group-error"
                :class="{'result-group-selected': module.selectedResultGroup === -1}"
                @click="module.selectResultGroup(-1)">ERROR</div>
            </div>
            <query-error-view v-if="module.error && module.selectedResultGroup === -1" />
            <results-tree-view v-else-if="showOutput" />
            <div class="no-output-status" v-else-if="module.resultGroup">
              {{ module.resultGroup.status }}
            </div>
          </template>
          <template v-slot:resize>
            <data-viewer v-if="module.resultSelected"
              :item="module.resultSelected.item"
              :codec="module.resultSelected.codec" />
          </template>
        </resizable-panel>
        <div v-if="module.queryRunning" class="loading-overlay">
          <loading />
        </div>
      </template>

    </resizable-panel>

    <portal :to="tabId">
      <span>Limit</span>
      <input class="implicitlimit-input" v-model.number="implicitLimit" />

      <div class="statusbar-button" v-if="!module.resultsPanel.isCollapsed"
        @click="module.toggleLayout()">
        <icon name="layout-vert" :style="{
          transform: module.resultsPanel.layout === 'vertical' ? 'rotate(90deg)' : 'none'
        }" />
      </div>
      
      <template v-if="module.resultGroup">
        <span class="status-detail">{{ resultCount }}<span class="label"> results</span></span>
        <span class="status-detail">{{ module.resultGroup.time }}<span class="label">&thinsp;ms</span></span>

        <div class="statusbar-button" v-if="!module.resultsPanel.isCollapsed"
          @click="module.detailPanel.setCollapsed()">{{ module.detailPanel.isCollapsed ? 'Show' : 'Hide' }} Detail</div>
        <portal-target name="detailsPanel" class="statusbar-details-settings" />
      </template>
    </portal>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'
import MonacoEditor from 'vue-monaco'

import { TransactionStatus } from '@utils/edgedb'

import UiButton from '@ui/Button.vue'
import UiSelect from '@ui/Select.vue'
import Icon from '@ui/Icon.vue'
import ResizablePanel from '@ui/ResizablePanel.vue'
import Loading from '@ui/Loading.vue'

import ResultsTreeView from '@components/ResultsTreeView.vue'
import QueryErrorView from '@components/QueryErrorView.vue'
import DataViewer from '@components/dataViewers/DataViewer'
import { connectionsModule } from '@store/connections'
import { ErrorAttrs } from '@store/tabs/query'

import 'assets/icons/layout-vert.svg'
import 'assets/icons/run.svg'

import 'monaco/init'

const statusesWithOutput = new Set([
  'SELECT', 'INSERT', 'DELETE', 'UPDATE', 'GET MIGRATION', 'DESCRIBE'
])

@Component({
  components: {
    UiButton,
    UiSelect,
    Icon,
    Loading,
    ResizablePanel,
    MonacoEditor,
    ResultsTreeView,
    QueryErrorView,
    DataViewer,
  }
})
export default class QueryView extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  tabId!: string

  monacoOptions = {
    language: 'edgeQL',
    theme: 'edgeQL',
    tabSize: 2,
    fixedOverflowWidgets: true
  }

  resizeObserver = null

  TransactionStatus = TransactionStatus

  get query() {
    return this.module.query
  }
  set query(query: string) {
    this.module.updateQuery(query)
  }

  get selectedConnection() {
    return this.module.connectionId
  }
  set selectedConnection(val) {
    this.module.selectConnection(val)
  }

  get selectedDatabase() {
    return this.module.database
  }
  set selectedDatabase(val) {
    this.module.updateDatabase(val)
  }

  get connections() {
    return Object.values(connectionsModule.connections || {})
  }

  get databases() {
    return Object.keys(
      connectionsModule.connections
      ?.[this.module.connectionId]
      ?.databases || {}
    )
  }

  get implicitLimit() {
    return this.module.implicitLimit
  }
  set implicitLimit(limit) {
    this.module.setImplicitLimit(limit)
  }

  get resultCount() {
    const {resultGroup, resultImplicitLimit: limit} = this.module
    if (limit && resultGroup?.count === (limit+1)) {
      return limit+'+'
    }
    return resultGroup?.count
  }

  get showOutput() {
    return statusesWithOutput.has(this.module.resultGroup?.status)
  }

  get transactionState() {
    return connectionsModule.connections?.[this.module.connectionId]?.databases?.[this.module.database]?.transactionState
  }

  get canStartTransaction() {
    return this.transactionState !== TransactionStatus.TRANS_INTRANS &&
           this.transactionState !== TransactionStatus.TRANS_INERROR
  }

  get inTransaction() {
    return this.transactionState === TransactionStatus.TRANS_INTRANS ||
           this.transactionState === TransactionStatus.TRANS_INERROR
  }

  get transactionFailed() {
    return this.transactionState === TransactionStatus.TRANS_INERROR
  }

  editorMounted(editor) {
    const monaco = this.$refs.editor?.monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      this.module.runQuery()
    })

    this.resizeObserver = new ResizeObserver(() => {
      editor.layout()
    })
    this.resizeObserver.observe(this.$refs.editorWrapper)
  }

  runQuery() {
    this.module.runQuery()
  }

  destroyed() {
    this.resizeObserver.disconnect()
  }

  monacoRequire = _monaco.require

  @Watch('module.error')
  updateMonacoErrorMarkers(error) {
    const model = this.$refs.editor?.getEditor().getModel(),
          monaco = this.$refs.editor?.monaco

    if (!model) return;


    if (error?.attrs?.has(ErrorAttrs.LINE)) {
      const lineNo = Number(error.attrs.get(ErrorAttrs.LINE)),
            column = Number(error.attrs.get(ErrorAttrs.COLUMN)),
            hint = error.attrs.get(ErrorAttrs.HINT)

      monaco.editor.setModelMarkers(model, 'EdgeDBError', [{
        startColumn: column,
        endColumn: column,
        startLineNumber: lineNo,
        endLineNumber: lineNo,
        message: error.message + (hint ? `, ${hint}` : ''),
        severity: monaco.MarkerSeverity.Error
      }])
    } else {
      monaco.editor.setModelMarkers(model, 'EdgeDBError', [])
    }
  }
}
</script>

<style lang="stylus" scoped>
>>> .query-editor
  display: grid
  grid-template-rows: 40px 1fr
  contain: unset

.actions-bar
  display: flex
  align-items: center

  > *
    margin-left: 10px

.editor-wrapper
  overflow: hidden

.editor
  width: 100%
  height: 100%

>>> .results
  overflow: auto
  background-color: #2c2c2c
  display: flex
  flex-direction: column

>>> .results-details-panel
  display: grid

>>> .detail-viewer
  color: #e0e0e0
  background: #252525
  display: flex
  overflow: auto

>>> .data-viewer-no-viewer
  width: 100%
  height: 100%
  display: flex
  justify-content: center
  align-items: center
  color: #9e9e9e

.loading-overlay
  position: absolute
  background: #2c2c2c80
  height: 100%
  width: 100%
  display: flex
  align-items: center
  justify-content: center

  svg
    height: 42px
    width: 42px
    stroke-width: 1

.statusbar-details-settings
  display: flex
  margin-left: auto
  align-self: stretch

.status-detail
  font-size: 13px
  padding: 0 7px
  
  .label
    color: #bbb

.implicitlimit-input
  width: 35px
  padding: 2px 4px
  margin-left: 4px
  margin-right: 5px

.no-output-status
  color: #adadad
  padding: 8px 12px

.result-group
  &-tabs
    display: flex
    color: #9a9a9a
    font-size: 13px
    border-bottom: 1px solid #3e3e3e
    overflow: scroll hidden
    flex-shrink: 0

    &::-webkit-scrollbar
      width: 0px
      height: 0px

  &-tab
    padding: 5px 10px 6px
    cursor: pointer
    flex-shrink: 0
  
  &-selected
    color: var(--accent-colour)
    border-bottom: 1px solid var(--accent-colour)
  
  &-error
    color: #e6535a
    border-bottom-color: #e6535a

.transaction
  margin-left: 50px
  padding: 3px
  border-radius: 5px
  color: rgba(255,255,255,0.9)
  flex-shrink: 0

  &.transaction-active
    background: var(--accent-colour)

  &.transaction-failed
    background: #e6535a

  span
    font-size: 11px
    margin: 0 5px
    text-transform: uppercase
    color: rgba(255,255,255,0.8)
</style>
