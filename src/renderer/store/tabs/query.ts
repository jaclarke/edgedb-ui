import { Module, VuexModule, Mutation, Action, RegisterOptions } from 'vuex-class-modules'

import store from '@store/store'
import { connectionsModule } from '@store/connections'
import { typesResolverModule } from '@store/typesResolver'
import { QueryResponse } from '@shared/interfaces'
import { ResizablePanelModule } from '@store/resizablePanel'
import { ITabModule } from '@store/tabs'
import { decodeRawResult, EdgeDBSet, ICodec, CodecKind, extractTids } from '@utils/edgedb'
import { wraparoundIndex } from '@utils/misc'
import { splitQuery } from '@utils/query'

export enum ErrorAttrs {
  HINT = 1,               // 0x_00_01
  DETAILS = 2,            // 0x_00_02
  SERVER_TRACEBACK = 257, // 0x_01_01
  
  // Subject to be changed/deprecated
  POSITION_START = -15,   // 0x_FF_F1
  POSITION_END = -14,     // 0x_FF_F2
  LINE = -13,             // 0x_FF_F3
  COLUMN = -12,           // 0x_FF_F4
}

interface ResultGroup {
  status: string
  list: Row[]
  count: number
  selectedIndex: number
  time: number
}

interface ImplicitLimitRow {
  id: string
  rowType: 'implicitlimit'
  depth: number
}

class ResultRow {
  rowType = 'result'

  item: any
  expandable: boolean
  itemKind: CodecKind
  private _children: ResultRow[]

  constructor(
    public id: string,
           item: any,
    public codec: ICodec,
    public name?: string,
    public depth: number = 0,
    public expanded: boolean = false,
  ) {
    this.item = Object.seal(item)
    this.itemKind = codec.getKind()
    this.expandable = isExpandable(item, codec)
  }

  get children() {
    return this._children ?? (this._children = this._getChildren())
  }

  getChildrenList(implicitLimit: number): Row[] {
    if (!this.expanded) return []
    const limited = !!implicitLimit && this.children.length === (implicitLimit+1)
    const childList = this.children.slice(0, limited ? implicitLimit : undefined)
      .flatMap(child => {
        return [
          child,
          ...child.getChildrenList(implicitLimit)
        ]
      })
    if (limited && this.itemKind === 'set') {
      childList.push({
        rowType: 'implicitlimit',
        id: this.id+'+implicitlimit',
        depth: this.depth+1
      })
    }
    return childList
  }

  getChildrenCount(implicitLimit: number): number {
    const limited = !!implicitLimit && this.children.length === (implicitLimit+1)
    const children = this.itemKind !== 'set' ? this.children :
      this.children.slice(0, limited ? implicitLimit : undefined)
    return children.reduce(
      (sum, child) => sum + (child.expanded ? child.getChildrenCount(implicitLimit) : 0),
      this.children.length
    )
  }

  private _getChildren(): ResultRow[] {
    const subCodecs = this.codec.getSubcodecs()
    switch (this.itemKind) {
      case 'object':
      case 'namedtuple':
        return this.codec.getSubcodecsNames()
          .map((name, i) => {
            const item = this.item[name]
            return new ResultRow(
              this.id+'.'+name,
              item,
              subCodecs[i],
              name,
              this.depth + 1,
            )
          })
      case 'array':
      case 'tuple':
      case 'set':
        return (this.item as unknown as any[]).map((item, i) => {
          return new ResultRow(
            this.id+'.'+i,
            item,
            subCodecs[i%subCodecs.length],
            this.itemKind === 'array' ? i.toString() : undefined,
            this.depth + 1,
          )
        })
      default:
        return []
    }
  }
}

type Row = ResultRow | ImplicitLimitRow

function isExpandable(item: any, codec: ICodec) {
  switch (codec.getKind()) {
    case 'object':
      return codec.getSubcodecsNames().length > 0
    case 'set':
    case 'array':
    case 'tuple':
    case 'namedtuple':
      return (item as unknown as any[]).length > 0
    default:
      return false
  }
}

@Module
export class QueryTabModule extends VuexModule implements ITabModule<QueryTabModule> {
  connectionId = ''
  database = ''
  query = ''
  implicitLimit = 100
  resultsPanel: ResizablePanelModule = null
  detailPanel: ResizablePanelModule = null

  queryRunning = false
  results: ResultGroup[] = []
  resultImplicitLimit = 0
  selectedResultGroup = 0

  error: {
    message: string
    stackTrace?: string
    errorNames?: string[]
    attrs?: Map<ErrorAttrs, string>
  } = null

  title = 'Query'

  get canQuery() {
    return this.connectionId && this.database && this.query.trim()
  }

  get resultGroup() {
    return this.results[this.selectedResultGroup] ?? null
  }

  get resultSelected() {
    const {resultGroup} = this
    if (!resultGroup || resultGroup.selectedIndex === null) return null

    const row = resultGroup.list[resultGroup.selectedIndex]
    return row.rowType === 'result' ? row : null
  }

  @Mutation
  selectResultGroup(index: number) {
    this.selectedResultGroup = index
  }

  @Mutation
  expandResultRow(
    {rowIndex, change = 'TOGGLE'}: {rowIndex: number, change: 'EXPAND' | 'COLLAPSE' | 'TOGGLE'}
  ) {
    const resultGroup = this.results[this.selectedResultGroup]
    const row = resultGroup.list[rowIndex]
    if (!row || row.rowType !== 'result' || !row.expandable) return;

    const prevExpanded = row.expanded
    row.expanded = change === 'TOGGLE' ? !row.expanded : change === 'EXPAND'

    if (row.expanded !== prevExpanded) {
      if (!row.expanded) {
        resultGroup.list.splice(rowIndex+1, row.getChildrenCount(this.resultImplicitLimit))
      } else {
        resultGroup.list.splice(rowIndex+1, 0, ...row.getChildrenList(this.resultImplicitLimit))
      }
    }
  }

  @Mutation
  selectResultItem(rowIndex: number) {
    const resultGroup = this.results[this.selectedResultGroup]
    if (resultGroup.list[rowIndex]?.rowType === 'result') {
      resultGroup.selectedIndex = rowIndex
    }
  }

  @Action
  moveSelection(direction: 'UP' | 'DOWN') {
    const {resultGroup} = this
    let index = resultGroup.selectedIndex
    if (index === null || !resultGroup.list?.length) return;

    do {
      index = wraparoundIndex(
        index + (direction === 'UP' ? -1 : 1),
        0, resultGroup.list.length-1)
    } while (resultGroup.list[index].rowType !== 'result')

    this.selectResultItem(index)
  }

  @Action
  async runQuery() {
    if (!this.canQuery) return;

    const {connectionId, database, query, implicitLimit} = this

    this.updateQueryRunning(true)

    const queryParts = splitQuery(query)

    const tids: string[] = []

    let firstQuery = true
    for (const queryPart of queryParts) {
      try {
        const {result, time, status} = await connectionsModule.runRawQuery({
          connectionId,
          database,
          query: queryPart,
          limit: implicitLimit && (implicitLimit+1)
        })
      
        const decodedResult = await decodeRawResult(result.result, result.outTypeId)

        if (firstQuery) {
          this.clearResult()
          this.updateError(null)
          this.updateResultImplicitLimit(implicitLimit)
          this.resultsPanel.setCollapsed(false)
          firstQuery = false
        }

        this.appendResult({
          ...decodedResult,
          time,
          status
        })

        tids.push(...extractTids(decodedResult.result, decodedResult.codec))

      } catch(e) {
        this.updateError({
          message: e.message.slice(0, 1).toUpperCase() + e.message.slice(1),
          stackTrace: e.stack,
          errorNames: e.errorNames,
          attrs: e.attrs && new Map(e.attrs)
        })
        if (firstQuery) {
          this.clearResult()
        }
        if (this.resultsPanel.isCollapsed) {
          this.resultsPanel.updateSize(25)
          this.resultsPanel.setCollapsed(false)
        }
        break;
      }
    }

    this.updateQueryRunning(false)

    typesResolverModule.resolveTids({
      connectionId,
      database,
      tids
    })
  }

  @Mutation
  updateQueryRunning(running: boolean) {
    this.queryRunning = running
  }

  @Action
  async selectConnection(connectionId: string) {
    this.updateConnection(connectionId)
    const connection = connectionsModule.connections?.[connectionId]
    if (connection && !connection.databases) {
      await connectionsModule.fetchDatabases({ connectionId })
    }
  }

  @Action
  async init({id}: {id: string}) {
    this._setupPanels({
      resultsPanel: new ResizablePanelModule({store, name: id+'-resultspanel'}),
      detailPanel: new ResizablePanelModule({store, name: id+'-detailpanel'}),
    })
    this.detailPanel.changeLayout('horizontal')

    const connections = Object.values(connectionsModule.connections || {})
    await this.selectConnection(
      connectionsModule.recentlyActive.connectionId || 
      connections.find(conn => conn.connected.length > 0)?.id ||
      (connections.length === 1 && connections[0].id) || ''
    )
    this.updateDatabase(
      connectionsModule.recentlyActive.database ||
      (this.connectionId ?
        (connectionsModule.connections?.[this.connectionId]?.connected?.[0] || '') :
        ''
      )
    )
  }

  @Action
  async destroy({id}: {id: string}) {
    store.unregisterModule(id+'-resultspanel')
    store.unregisterModule(id+'-detailpanel')
  }

  @Mutation
  updateQuery(query: string) {
    this.query = query
  }

  @Mutation
  updateResultImplicitLimit(limit: number) {
    this.resultImplicitLimit = limit
  }

  @Mutation
  appendResult({result, codec, time, status}:
    {result: EdgeDBSet, codec: ICodec, time: number, status: string}) {

    const limited = !!this.resultImplicitLimit &&
      result.length === (this.resultImplicitLimit+1)

    const resultsList: Row[] = result
      .slice(0, limited ? this.resultImplicitLimit : undefined)
      .map((item, i) => {
        return new ResultRow(
          i.toString(),
          item,
          codec
        )
      })

    if (limited) {
      resultsList.push({
        rowType: 'implicitlimit',
        id: 'implicitlimit',
        depth: 0
      })
    }

    this.results.push({
      list: resultsList,
      count: result.length,
      time,
      status,
      selectedIndex: null
    })
    this.selectedResultGroup = this.results.length - 1
  }

  @Action
  async startTransaction() {
    if (!this.connectionId || !this.database) return;

    await connectionsModule.runQuery({
     connectionId: this.connectionId,
     database: this.database,
     query: 'START TRANSACTION'
    })
  }

  @Action
  async commitTransaction() {
    if (!this.connectionId || !this.database) return;

    await connectionsModule.runQuery({
     connectionId: this.connectionId,
     database: this.database,
     query: 'COMMIT'
    })
  }

  @Action
  async rollbackTransaction() {
    if (!this.connectionId || !this.database) return;

    await connectionsModule.runQuery({
     connectionId: this.connectionId,
     database: this.database,
     query: 'ROLLBACK'
    })
  }

  @Mutation
  clearResult() {
    this.results = []
  }

  @Mutation
  updateError(error: QueryTabModule['error']) {
    this.error = error
    this.selectedResultGroup = -1
  }

  @Mutation
  updateConnection(id: string) {
    if (this.connectionId !== id) this.database = ''
    this.connectionId = id
  }

  @Mutation
  updateDatabase(database: string) {
    this.database = database
  }

  @Action
  toggleLayout() {
    this.resultsPanel.changeLayout()
    this.detailPanel.changeLayout()
  }

  @Mutation
  setImplicitLimit(limit: number) {
    this.implicitLimit = limit
  }

  @Mutation
  private _setupPanels({resultsPanel, detailPanel}:
      {resultsPanel: ResizablePanelModule, detailPanel: ResizablePanelModule}) {
    this.resultsPanel = resultsPanel
    this.detailPanel = detailPanel
  }
}
