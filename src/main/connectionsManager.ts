import { app } from 'electron'
import { join } from 'path'
import { readFile } from 'fs'
import { promisify } from 'util'
import { Server, AddressInfo } from 'net'
import { ipcMain as ipc } from 'electron-better-ipc'
import * as edgedb from 'edgedb/index.node'
import { uuid } from 'edgedb/codecs/ifaces'
import LRU from 'edgedb/lru'
import * as z from 'zod'
import writeFileAtomic from 'write-file-atomic'
import { createTunnel } from './sshTunnel'
import { QueuedConnection } from './queuedConnection'
import { ConnectionParser, ConnectionConfig } from '@shared/interfaces'

const readFileAsync = promisify(readFile)

const ConnectionsParser = z.array(ConnectionParser)

const codecsTypeData = new LRU<uuid, Buffer>({capacity: 1000})
const codecRegistry = new edgedb._CodecsRegistry(codecsTypeData)

interface Connection {
  connection: QueuedConnection
  serverVersion: string
  sshTunnel?: SSHTunnel
}

interface SSHTunnel {
  server: Server
  host: string
  port: number
  connections: Set<Connection>
}

let connectionsStorePath: string

const connectionConfigs = new Map<string, ConnectionConfig>(),
      connections = new Map<string, Connection>(),
      sshTunnels = new Map<string, SSHTunnel>()

async function saveConnectionConfigs() {
  const data = JSON.stringify([...connectionConfigs.values()])
  await writeFileAtomic(connectionsStorePath, data)
}

async function setupSSHTunnel(config: ConnectionConfig) {
  const sshAuth = (config.ssh.auth.type === 'key') ? {
    privateKey: await readFileAsync(config.ssh.auth.keyFile),
    passphrase: config.ssh.auth.passphrase
  } : {
    password: config.ssh.auth.password
  }
  const server = await createTunnel({
    host: config.ssh.host,
    port: config.ssh.port || 22,
    dstHost: config.host,
    dstPort: config.port || 5656,
    localHost: '127.0.0.1',
    localPort: 0,
    keepAlive: true,
    username: config.ssh.user,
    ...sshAuth
  })
  const tunnel: SSHTunnel = {
    server,
    host: '127.0.0.1',
    port: (server.address() as AddressInfo).port,
    connections: new Set(),
  }
  sshTunnels.set(config.id, tunnel)
  return tunnel
}

async function setupConnection(config: ConnectionConfig, database: string, background = false) {
  const connectionInfo = {
    configId: config.id,
    database: database
  }

  if (!background) ipc.sendToRenderers('connections:connectionOpening', connectionInfo)

  try {
    let tunnel: SSHTunnel
    if (config.ssh) {
      tunnel = sshTunnels.get(config.id) || await setupSSHTunnel(config)
    }
    const rawConn = await edgedb.connect({
      host: tunnel ? tunnel.host : config.host,
      port: tunnel ? tunnel.port : ( config.port || 5656 ),
      user: config.user,
      password: config.password,
      database: connectionInfo.database,
      _codecRegistry: codecRegistry,
    })

    const serverVersion: string = await rawConn.fetchOne('SELECT sys::get_version_as_str()')
    const conn: Connection = {
      connection: new QueuedConnection(rawConn),
      serverVersion,
      sshTunnel: tunnel
    }
    if (tunnel) tunnel.connections.add(conn)

    conn.connection.conn.on('close', () => {
      if (!background) connections.delete(`${config.id}:${connectionInfo.database}`)
      if (conn.sshTunnel) {
        conn.sshTunnel.connections.delete(conn)
      }
      if (conn.sshTunnel?.connections.size === 0) {
        sshTunnels.delete(config.id)
        conn.sshTunnel.server.close()
      }
      if (!background) ipc.sendToRenderers('connections:connectionClosed', connectionInfo)
    }).on('transactionStateChanged', (state) => {
      if (!background) ipc.sendToRenderers('connections:transactionStateChanged', {
        ...connectionInfo,
        state
      })
    })

    if (!background) {
      connections.set(`${config.id}:${connectionInfo.database}`, conn)
      ipc.sendToRenderers('connections:connectionOpened', {...connectionInfo, serverVersion})
    }

    return conn

  } catch(error) {
    if (!background) ipc.sendToRenderers('connections:connectionClosed', connectionInfo)

    throw error
  }
}

export async function getConnection(connId: string, database?: string, background = false) {
  const config = connectionConfigs.get(connId)
  if (!config) throw new Error('Invalid Connection Id')

  const db = database ||
    [...connections.keys()].find(key => key.split(':')[0] === connId)?.split(':')[1] ||
    config.defaultDatabase ||
    config.user

  let conn: Connection

  if (!background) {
    conn = connections.get(`${connId}:${db}`)
  }

  if (!conn) conn = await setupConnection(config, db, background)

  return conn.connection
}

async function closeConnection(connId: string, database: string) {
  let conn = connections.get(`${connId}:${database}`)
  if (!conn) return;

  await conn.connection.close()
}

function getConnectionsSummary() {
  const connected = [...connections.keys()].map(key => key.split(':'))
  return [...connectionConfigs.values()].map(({id, name}) => ({
    id,
    name,
    connected: connected.filter(key => key[0] === id).map(key => key[1]),
    serverVersion: [...connections.entries()]
      .find(([key]) => key.startsWith(id+':'))?.[1].serverVersion
  }))
}

app.on('ready', async () => {
  connectionsStorePath = join(app.getPath('userData'), 'connections.json')

  try {
    let fileData = ConnectionsParser.parse(
      JSON.parse(
        await readFileAsync(connectionsStorePath, 'utf8')
      )
    )
    
    fileData.forEach(config => {
      connectionConfigs.set(config.id, config)
    })

  } catch (err) {
    console.log(err)
    // await saveConnectionConfigs()
  }
})

ipc.answerRenderer('connections:getConnections', () => {
  return getConnectionsSummary()
})

ipc.answerRenderer('connections:closeConnection',
  ({connectionId, database}: {connectionId: string, database: string}) => {
    closeConnection(connectionId, database)
  }
)

ipc.answerRenderer('connections:getConnectionConfig',
  (connectionId: string) => {
    return connectionConfigs.get(connectionId)
  }
)

ipc.answerRenderer('connections:testAndSaveConfig',
  async (config: ConnectionConfig) => {
    const {connection, serverVersion} = await setupConnection(config, config.defaultDatabase || config.user, true)
    
    await connection.close()

    connectionConfigs.set(config.id, config)
    await saveConnectionConfigs()

    ipc.sendToRenderers('connections:configsUpdated', getConnectionsSummary())

    return serverVersion
  }
)

ipc.answerRenderer('connections:getTypeData', (typeId: string) => {
  return codecsTypeData.get(typeId)
})

ipc.answerRenderer('connections:getTransactionState',
  ({connectionId, database}: {connectionId: string, database: string}) => {
    const conn = connections.get(`${connectionId}:${database}`)
    return conn?.connection.conn.serverTransactionState
  }
)

app.on('before-quit', async (event) => {
  if (connections.size) {
    await Promise.all(
      [...connections.values()].map(conn => conn.connection.close())
    )
    app.quit()
  }
})
