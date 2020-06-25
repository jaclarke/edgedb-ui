import { Module, VuexModule, Mutation, Action } from 'vuex-class-modules'

import store from '@store/store'
import { deepSeal, formatName } from '@utils/misc'
import { connectionsModule } from '@store/connections'
import { ITabModule } from '@store/tabs'
import { ICodec, decodeRawResult, EdgeDBSet } from '@utils/edgedb'
import { ResizablePanelModule } from '@store/resizablePanel'

type Column = {
  kind: 'property' | 'link'
  index: number
  name: string
  required: boolean
  many: boolean
  typeName: string
}

interface CellPos {
  row: number
  col: string
}

@Module
export class DataTabModule extends VuexModule implements ITabModule<DataTabModule> {
  connectionId = ''
  database = ''
  objectName = ''
  detailPanel: ResizablePanelModule = null
  private _destroyQueryWatcher = null

  columns: Column[] | null = null
  columnCodecs: ICodec[] = null
  data: {[key: string]: any}[] | null = null
  selectedCell: CellPos = null
  objectsCount: number | null = null
  loading = false

  limit = 100
  linkLimit = 20
  offset = 0
  dataOffset = 0
  orderBy: {
    col: string
    dir: 'ASC' | 'DESC'
  }[] = []

  get title() {
    return `${this.database} ❭ ${formatName(this.objectName)}`
  }

  get selectedItem() {
    if (!this.selectedCell) return;

    const {col, row} = this.selectedCell

    const item = this.data[row-1]?.[col]
    const codec = this.columnCodecs[this.columns.findIndex(c => c.name === col)]

    return codec ? { item, codec } : null
  }
  
  @Action
  async init(
    {id, config, module}: {id: string, config: {connectionId: string, database: string, objectName: string}, module: DataTabModule}
  ) {
    this._setupPanel(
      new ResizablePanelModule({store, name: id+'-detailpanel'}),
    )
    this.setDatabaseObject(config)

    this._setupQueryWatcher(
      module.$watch(
        () => [this.dataQuery, this.offset, this.limit].join(','), 
        query => {
          if (query) this.fetchData()
        }
      )
    )

    this.setLoading(true)
    await this.fetchColumns()
  }

  @Action
  async destroy({id}: {id: string}) {
    store.unregisterModule(id+'-detailpanel')
    this._destroyQueryWatcher()
  }

  get dataQuery() {
    if (!this.columns) return null
    return `SELECT ${this.objectName} {
      ${
        this.columns.map(column => {
          if (column.kind === 'link') {
            //return `${column.name} LIMIT ${this.linkLimit},
            return `${column.name}__count__ := <int32>count(.${column.name})`
          }
          return column.name
        })
          .join(',\n')
      }
    }
    ${
      this.orderBy.length ? ('ORDER BY ' + this.orderBy
        .map(o => `.${o.col} ${o.dir}`)
        .join(' THEN ')) : ''
    }
    OFFSET <int32>$offset
    LIMIT <int32>$limit`
  }

  @Action
  async fetchColumns() {
    const result = (await connectionsModule.runQuery({
      connectionId: this.connectionId,
      database: this.database,
      query: `WITH MODULE schema
      SELECT ObjectType {
        links: {
          name,
          cardinality,
          required,
          targetName := .target.name,
        } FILTER .name != '__type__',
        properties: {
          name,
          cardinality,
          required,
          targetName := .target.name,
        },
      } FILTER .name = <str>$objectName`,
      args: {
        objectName: this.objectName
      }
    })).result?.[0]

    if (!result) {
      throw new Error('Failed to retrieve columns data')
    }

    this.updateColumns([
      ...result.properties.map((prop, i) => ({
          kind: 'property',
          index: i,
          name: prop.name,
          required: prop.required,
          many: prop.cardinality === 'MANY',
          typeName: prop.targetName
      } as Column)),
      ...result.links.map((link, i) => ({
        kind: 'link',
        index: i + result.properties.length,
        name: link.name,
        required: link.required,
        many: link.cardinality === 'MANY',
        typeName: link.targetName,
      } as Column)),
    ])
  }

  @Action
  async fetchData() {
    this.setLoading(true)
    try {
      const { connectionId, database, dataQuery, offset, limit } = this

      const {result} = await connectionsModule.runRawQuery({
        connectionId,
        database,
        query: dataQuery,
        args: {
          offset,
          limit
        }
      })

      const decodedResult = await decodeRawResult(result.result, result.outTypeId)

      this.updateData({...decodedResult, offset})
    } finally {
      this.setLoading(false)
    }

    const {result: count} = await connectionsModule.runQuery({
      connectionId: this.connectionId,
      database: this.database,
      query: `SELECT <int32>count(${this.objectName})`
    })

    this.updateObjectCount(count[0])
  }

  @Mutation
  setSelectedCell(cell: CellPos) {
    this.selectedCell = cell
  }

  @Mutation
  setDatabaseObject({connectionId, database, objectName}: {connectionId: string, database: string, objectName: string}) {
    this.connectionId = connectionId
    this.database = database
    this.objectName = objectName
  }

  @Mutation
  setLoading(loading: boolean) {
    this.loading = loading
  }

  @Mutation
  updateColumns(columns: Column[]) {
    this.columns = deepSeal(columns)
  }

  @Mutation
  updateData({result, codec, offset}: {result: EdgeDBSet, codec: ICodec, offset: number}) {
    this.columnCodecs = codec.getSubcodecs()
    this.data = deepSeal(result)
    this.dataOffset = offset

    if (this.selectedCell && this.data.length < this.selectedCell.row) {
      this.selectedCell = this.data.length === 0 ? null : {
        row: this.data.length,
        col: this.selectedCell.col
      }
    }
  }

  @Mutation
  updateObjectCount(count: number) {
    this.objectsCount = count
  }

  @Mutation
  updateOffset(offset: number) {
    this.offset = offset
  }

  @Mutation
  updateOrderBy(order: {col: string, dir: 'ASC' | 'DESC'}[]) {
    this.orderBy = order
  }

  @Mutation
  private _setupPanel(detailPanel: ResizablePanelModule) {
    this.detailPanel = detailPanel
    detailPanel.changeLayout('vertical')
    detailPanel.updateSize(30)
  }

  @Mutation
  private _setupQueryWatcher(unwatch: any) {
    this._destroyQueryWatcher = unwatch
  }
}
