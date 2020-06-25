<template>
  <div class="query-error">
    <div class="name">
      <icon name="error" style="margin-right: 5px" />
      {{ isEdgeDBError ? errorName : 'Application Error' }}
    </div>
    <div class="message">{{ error.message }}</div>
    <div class="hint" v-if="hint">{{ hint }}</div>

    <div class="open-issue" v-if="isISE" @click="openIssue">Open a new issue on GitHub</div>

    <template v-if="stackTrace">
      <div class="stacktrace-button" @click="stackTraceExpanded = !stackTraceExpanded"
        :class="{expanded: stackTraceExpanded}">
        <icon name="chevron-right" />Stacktrace
      </div>
      <pre class="stacktrace" v-if="stackTraceExpanded">{{ stackTrace }}</pre>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Inject } from 'vue-property-decorator'

import Icon from '@ui/Icon.vue'
import { ErrorAttrs } from '@store/tabs/query'
import { connectionsModule } from '@store/connections'

import 'assets/icons/chevron-right.svg'
import 'assets/icons/error.svg'

async function getDebugDetails(module: QueryTabModule) {
  const serverVersion = connectionsModule.connections[module.connectionId]?.serverVersion || ''

  const schema: string = await connectionsModule.runQuery({
      connectionId: module.connectionId,
      database: module.database,
      query: 'DESCRIBE SCHEMA'
    })
    .then(({result}) => result[0])
    .catch(_ => '')
  
  return {
    serverVersion,
    schema,
    query: module.query
  }
}

@Component({
  components: { Icon }
})
export default class QueryErrorView extends Vue {
  @Inject()
  readonly module!: any

  stackTraceExpanded = false

  get error() {
    return this.module.error
  }

  get isEdgeDBError() {
    return this.error.errorNames?.includes('EdgeDBError')
  }

  get errorName() {
    return this.error.errorNames[0]
  }

  get hint() {
    return !this.isISE ? this.error.attrs?.get(ErrorAttrs.HINT) :
      'This is most likely a bug in EdgeDB. Please consider opening an issue ticket.'
  }

  get stackTrace() {
    if (this.isEdgeDBError) return this.error.attrs?.get(ErrorAttrs.SERVER_TRACEBACK)
    return this.error.stackTrace
  }

  get isISE() {
    return this.isEdgeDBError && this.error.errorNames.includes('InternalServerError')
  }

  async openIssue() {
    const details = await getDebugDetails(this.module)

    const issueTitle = `InternalServerError: ${this.error.message}`
    const issueTemplate = `<!-- Please search existing issues to avoid creating duplicates. -->
- EdgeDB Version: ${details.serverVersion}
- OS Version:

Steps to Reproduce:

1.
2.

<!-- This template has been automatically pre-filled with some debug info, please add/remove information as necessary -->
<details>
  <summary>Query</summary>
  
  \`\`\`
${ details.query }
  \`\`\`
</details>

<details>
  <summary>Schema</summary>
  
  \`\`\`
${ details.schema || 'Unable to retrieve schema' }
  \`\`\`
</details>

<details>
  <summary>Stacktrace</summary>
  
  \`\`\`
${ this.stackTrace }
  \`\`\`
</details>
`

    const url = new URL('https://github.com/edgedb/edgedb/issues/new')

    url.searchParams.set('title', issueTitle)
    url.searchParams.set('body', issueTemplate)

    window.openExternalUrl(url.toString())
  }
}
</script>

<style lang="stylus" scoped>
.query-error
  padding: 10px 12px
  color: #e0e0e0

.name
  font-weight: 500
  letter-spacing: 0.02em
  margin-bottom: 5px
  display: flex
  color: #e6535a

.hint
  margin-top: 3px
  color: #bbb

.stacktrace-button
  color: #adadad
  display: flex
  margin-top: 15px
  cursor: pointer

  &.expanded svg
    transform: rotate(90deg)

.stacktrace
  background: rgba(255,255,255,0.07)
  padding: 5px
  margin-top: 3px
  margin-left: 21px
  overflow: auto

.open-issue
  display: inline-block
  text-decoration: underline
  cursor: pointer
  margin: 5px 0
</style>
