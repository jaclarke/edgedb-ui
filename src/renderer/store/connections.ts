import Vue from 'vue'
import { Module, VuexModule, Action, Mutation } from 'vuex-class-modules'
import { groupBy } from 'lodash'
import { TransactionStatus } from '@utils/edgedb'
import { Query, QueryResponse, RawQueryResponse } from '@shared/interfaces'

import store from './store'

const ipc = (window as any).ipc

interface Connection {
  id: string
  name: string

  databases: {[name: string]: Database} | null
  connecting: string[]
  connected: string[]

  serverVersion?: string
}

interface Database {
  name: string

  modules: {[name: string]: Module} | null
  transactionState: TransactionStatus
}

interface Module {
  name: string
  builtin: boolean

  objects: DBObject[] | null
}

interface DBObject {
  fullName: string
  typeName: string

  module: string
  name: string
}

@Module
class ConnectionsModule extends VuexModule {
  connections: {[id: string]: Connection} = null

  recentlyActive = {
    connectionId: '',
    database: ''
  }

  hideBuiltinModules = true

  @Action
  async fetchConnections() {
    this.updateConnections(
      await ipc.callMain('connections:getConnections')
    )
  }

  @Action
  async fetchDatabases({connectionId}: {connectionId: string}) {
    const connection = this.connections?.[connectionId]
    if (!connection) return;

    const {result: databases} = await this.runQuery({
      connectionId,
      query: `SELECT sys::Database.name;`
    })

    this.updateDatabases({connection, databases})
    this.fetchTransactionStates({connection})
  }

  @Action
  async fetchModules({connectionId, database}: {connectionId: string, database: string}) {
    const connection = this.connections?.[connectionId],
          db = connection?.databases?.[database]
    if (!db) return;

    const {result: modules} = await this.runQuery({
      connectionId,
      database,
      query: `SELECT schema::Module {name, builtin};`
    })

    this.updateModules({database: db, modules})

    await this.fetchDBObjects({
      connectionId,
      database,
      modules: modules.filter(module => !module.builtin).map(module => module.name)
    })
  }

  @Action
  async fetchDBObjects(
    {connectionId, database, modules}: {connectionId: string, database: string, modules: string []}
  ) {
    const connection = this.connections?.[connectionId],
          db = connection?.databases?.[database]
    if (!db) return;

    const {result: objects} = await this.runQuery({
      connectionId,
      database,
      query: `SELECT schema::ObjectType {
        typeName := .__type__.name,
        name
      }
      FILTER ${
        modules.map(module => `.name LIKE '${module}::%'`).join(' OR ')
      }`
    })

    this.updateDBObjects({database: db, objects, modules})
  }

  @Action
  async closeConnection(connection: {connectionId: string, database: string}) {
    await ipc.callMain('connections:closeConnection', connection)
  }

  @Action
  async runQuery(query: Query): Promise<QueryResponse> {
    return await ipc.callMain('query:run', query)
  }

  @Action
  async runRawQuery(query: Query): Promise<RawQueryResponse> {
    return await ipc.callMain('query:runRaw', query)
  }

  @Action
  fetchTransactionStates({connection}: {connection: Connection}) {
    for (const database of connection.connected) {
      ipc.callMain('connections:getTransactionState', {
        connectionId: connection.id,
        database
      }).then(state => {
        this.updateTransactionState({
          id: connection.id,
          database,
          state: state || TransactionStatus.TRANS_UNKNOWN
        })
      })
    }
  }

  @Mutation
  updateConnections(connections: {id: string, name: string, connected: string[], serverVersion?: string}[]) {
    if (!this.connections) this.connections = {}
    connections.forEach(connectionInfo => {
      Vue.set(this.connections, connectionInfo.id, {
        ...(this.connections[connectionInfo.id] || {
          databases: null,
          connecting: [],
          connected: [],
        }),
        ...connectionInfo
      })
    })
  }

  @Mutation
  connectionOpening(connInfo: {id: string, database: string}) {
    const connection = this.connections?.[connInfo.id]
    if (!connection) return;

    connection.connected = connection.connected.filter(db => db !== connInfo.database)
    if (!connection.connecting.includes(connInfo.database)) connection.connecting.push(connInfo.database)
  }

  @Mutation
  connectionOpened(connInfo: {id: string, database: string, serverVersion: string}) {
    const connection = this.connections?.[connInfo.id]
    if (!connection) return;

    connection.connecting = connection.connecting.filter(db => db !== connInfo.database)
    if (!connection.connected.includes(connInfo.database)) connection.connected.push(connInfo.database)
    connection.serverVersion = connInfo.serverVersion

    this.recentlyActive = {
      connectionId: connInfo.id,
      database: connInfo.database
    }
  }

  @Mutation
  connectionClosed(connInfo: {id: string, database: string}) {
    const connection = this.connections?.[connInfo.id]
    if (!connection) return;

    connection.connected = connection.connected.filter(db => db !== connInfo.database)
    connection.connecting = connection.connecting.filter(db => db !== connInfo.database)

    if (
      this.recentlyActive.connectionId === connInfo.id &&
      this.recentlyActive.database === connInfo.database
    ) {
      this.recentlyActive.database = ''
    }
  }

  @Mutation
  updateDatabases({connection, databases}: {connection: Connection, databases: string[]}) {
    connection.databases = databases.reduce((dbs, name) => {
      dbs[name] = connection.databases?.[name] || {
        name,
        modules: null,
        transactionState: TransactionStatus.TRANS_UNKNOWN
      }
      return dbs
    }, {})
  }

  @Mutation
  updateModules({database, modules}: {database: Database, modules: {name: string, builtin: boolean}[]}) {
    database.modules = modules.reduce((mods, module) => {
      mods[module.name] = {
        objects: null,
        ...database.modules?.[module.name],
        ...{
          name: module.name,
          builtin: module.builtin,
        }
      }
      return mods
    }, {} as typeof database.modules)
  }

  @Mutation
  updateDBObjects({database, objects, modules}: {database: Database, objects: {name: string, typeName: string}[], modules: string[]}) {
    const groupedObjects = groupBy(objects.map(obj => {
      const [module, name] = obj.name.split('::')
      return {
        typeName: obj.typeName,
        fullName: obj.name,
        name,
        module
      }
    }), 'module')
    
    for (const module of modules) {
      if (database.modules[module]) {
        database.modules[module].objects = groupedObjects[module] || []
      }
    }
  }

  @Mutation
  updateTransactionState({id, database, state}: {id: string, database: string, state: TransactionStatus}) {
    const db = this.connections?.[id]?.databases?.[database]
    if (!db) return;

    db.transactionState = state
  }
}

export const connectionsModule = new ConnectionsModule({store, name: 'connections'})


ipc.listenBroadcast('connections:configsUpdated', (connections) => {
  connectionsModule.updateConnections(connections)
})
ipc.listenBroadcast('connections:connectionOpening', ({configId, database}) => {
  connectionsModule.connectionOpening({id: configId, database})
})
ipc.listenBroadcast('connections:connectionOpened', ({configId, database, serverVersion}) => {
  connectionsModule.connectionOpened({id: configId, database, serverVersion})
})
ipc.listenBroadcast('connections:connectionClosed', ({configId, database}) => {
  connectionsModule.connectionClosed({id: configId, database})
})
ipc.listenBroadcast('connections:transactionStateChanged', ({configId, database, state}) => {
  connectionsModule.updateTransactionState({id: configId, database, state})
})

connectionsModule.fetchConnections()
