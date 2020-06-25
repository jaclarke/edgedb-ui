import { Module, VuexModule, Mutation, Action } from 'vuex-class-modules'

import store from '@store/store'
import { connectionsModule } from '@store/connections'
import { ResizablePanelModule } from '@store/resizablePanel'
import { ITabModule } from '@store/tabs'
import { layoutSchema, GraphLayout } from 'renderer/schemaLayout/runLayout'

export const gridSize = 20
export const tableWidth = gridSize*12
export const tableHeaderHeight = 28
export const tableItemHeight = 28
export const maxVisibleItems = 7.5

export enum LoadingState {
  FetchingSchema,
  GeneratingLayout
}

export enum Cardinality {
  ONE = 'ONE',
  MANY = 'MANY',
}

export interface SchemaField {
  name: string
  cardinality: Cardinality
  required: boolean
  targetName: string
  expr: string
  default: string
  '@is_local': boolean
  annotations: {
    name: string
    '@value': string
  }[]
  constraints: {
    name: string,
    params: {
      '@value': string
    }[]
  }[]
  inherited_from: string
}

export interface SchemaObject {
  name: string
  is_abstract: boolean
  baseNames: string[]
  ancestorNames: string[]
  inheritedBy: string[]
  annotations: {
    name: string
    '@value': string
  }[]
  links: (SchemaField & {
    exclusive: boolean
    properties: SchemaField[]
  })[]
  properties: SchemaField[]
  indexes: {
    name: string
    expr: string
  }
}

function getTableHeight(object: SchemaObject) {
  const fields = [...object.links, ...object.properties].filter(field => !field.name.startsWith('__')),
        height = tableHeaderHeight + Math.min(fields.length, maxVisibleItems) * tableItemHeight

  return Math.ceil(height/gridSize)*gridSize
}

@Module
export class SchemaTabModule extends VuexModule implements ITabModule<SchemaTabModule> {
  connectionId: string = null
  database: string = null
  detailPanel: ResizablePanelModule = null
  debug = false

  loading: LoadingState = null
  schemaData: SchemaObject[] = null
  graphLayout: GraphLayout = null
  selectedObjectName: string = null
  hoveredLink: string = null
  hideInherited = false

  get title() {
    return this.database
  }

  get routes() {
    return this.hideInherited ?
      this.graphLayout?.routes.filter(route => route.link.type !== 'inherits')
      : this.graphLayout?.routes
  }

  get schemaObjects() {
    return this.schemaData?.reduce((objects, object) => {
      objects[object.name] = object
      return objects
    }, {} as {[name: string]: SchemaObject}) ?? {}
  }

  get selectedObject() {
    return this.schemaObjects[this.selectedObjectName]
  }

  @Action
  async init({id, config}: {id: string, config: {connectionId: string, database: string}}) {
    this.setConfig(config)

    this._setupPanel(
      new ResizablePanelModule({store, name: id+'-detailpanel'}),
    )

    this.fetchSchemaData()
  }

  @Action
  async fetchSchemaData() {
    const { connectionId, database } = this
    this.setLoadingState(LoadingState.FetchingSchema)
    const { result } = await connectionsModule.runQuery({
      connectionId,
      database,
      query: `WITH MODULE schema,
        UserObjectType := (
            SELECT ObjectType
            FILTER .name LIKE 'default::%'
          )
      SELECT UserObjectType {
        name,
        is_abstract,
        baseNames := (
          SELECT .bases
          FILTER .name != 'std::Object'
          ORDER BY @index
        ).name,
        ancestorNames := (SELECT .ancestors ORDER BY @index).name,
        inheritedBy := .<bases[IS ObjectType].name,
        annotations: {
          name,
          @value
        },
        links: {
          name,
          cardinality,
          required,
          targetName := .target.name,
          expr,
          default,
          @is_local,
          annotations: {
            name,
            @value
          },
          constraints: {
            name,
            params: {
              @value
            } FILTER .name != '__subject__'
          },
          exclusive := 'std::exclusive' in .constraints.name,
          inherited_from := (
            SELECT UserObjectType.ancestors[IS ObjectType]
            FILTER .links@is_local = true
              AND .links.name = UserObjectType.links.name
            LIMIT 1
          ).name,
          properties: {
            name,
            cardinality,
            required,
            targetName := .target.name,
            @is_local,
            annotations: {
              name,
              @value
            },
            constraints: {
              name,
              params: {
                @value
              } FILTER .name != '__subject__'
            },
          } FILTER .name NOT IN {'source', 'target'}
        } FILTER .name != '__type__',
        properties: {
          name,
          cardinality,
          required,
          targetName := .target.name,
          expr,
          default,
          @is_local,
          annotations: {
            name,
            @value
          },
          constraints: {
            name,
            params: {
              @value
            } FILTER .name != '__subject__'
          },
          inherited_from := (
            SELECT UserObjectType.ancestors[IS ObjectType]
            FILTER .properties@is_local = true
              AND .properties.name = UserObjectType.properties.name
            LIMIT 1
          ).name
        },
        indexes: {
          name,
          expr
        },
      }`
    })

    this.updateSchemaData(result)

    await this.generateGraphLayout()

    this.setLoadingState(null)
  }

  @Mutation
  updateSchemaData(schemaData: SchemaObject[]) {
    this.schemaData = schemaData
  }

  @Action
  async generateGraphLayout() {
    if (!this.schemaData || !this.schemaData.length) return;

    this.setLoadingState(LoadingState.GeneratingLayout)

    const schema = this.schemaData.map(object => ({
      ...object,
      size: {
        width: tableWidth,
        height: getTableHeight(object)
      }
    }))
    console.time('layoutSchema')
    const layout = await layoutSchema(schema, gridSize)
    console.timeEnd('layoutSchema')

    this.updateGraphLayout(layout)
  }

  @Mutation
  updateGraphLayout(graphLayout: GraphLayout) {
    this.graphLayout = graphLayout
  }

  @Action
  selectObject(name: string) {
    this.setSelectedObjectName(name)
    if (this.detailPanel.isCollapsed) {
      this.detailPanel.setCollapsed(false)
    }
  }

  @Mutation
  setSelectedObjectName(name: string) {
    this.selectedObjectName = name
  }

  @Mutation
  setHoveredLink(linkId: string) {
    this.hoveredLink = linkId
  }

  @Mutation
  toggleHideInherited() {
    this.hideInherited = !this.hideInherited
  }

  @Action
  async destroy({id}: {id: string}) {
    store.unregisterModule(id+'-detailpanel')
  }

  @Mutation
  setConfig(config: {connectionId: string, database: string}) {
    this.connectionId = config.connectionId
    this.database = config.database
  }

  @Mutation
  setLoadingState(loading: LoadingState | null) {
    this.loading = loading
  }

  @Mutation
  toggleDebug() {
    this.debug = !this.debug
  }

  @Mutation
  private _setupPanel(detailPanel: ResizablePanelModule) {
    this.detailPanel = detailPanel
    detailPanel.changeLayout('horizontal')
    detailPanel.updateSize(40)
  }
}
