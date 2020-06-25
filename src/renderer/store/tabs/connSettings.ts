import { Module, VuexModule, Mutation, Action } from 'vuex-class-modules'
import nanoid from 'nanoid'

import { ITabModule } from '@store/tabs'
import { connectionsModule } from '@store/connections'
import { ConnectionConfig, DumpRestoreRequest, DumpFileInfo } from '@shared/interfaces'

const ipc = (window as any).ipc

@Module
export class ConnSettingsTabModule extends VuexModule implements ITabModule<ConnSettingsTabModule> {
  connectionId = ''
  config = {
    name: '',
    host: '',
    port: null,
    user: '',
    password: '',
    defaultDatabase: '',
    useSSH: false,
    ssh_host: '',
    ssh_port: null,
    ssh_user: '',
    ssh_authType: 'password',
    ssh_password: '',
    ssh_keyFile: '',
    ssh_passphrase: '',
  }
  configModified = false

  get title() {
    return `${this.connectionName || 'New Connection'} Settings`
  }

  get connectionName() {
    return connectionsModule.connections[this.connectionId]?.name || ''
  }

  get connectionDatabaseNames() {
    const dbs = connectionsModule.connections[this.connectionId]?.databases
    return dbs && Object.keys(dbs)
  }
  
  @Action
  async init(
    {config}: {config: {connectionId?: string}}
  ) {
    this.setConnectionId(config.connectionId || nanoid())
    this.getConnectionConfig()
  }

  @Mutation
  private setConnectionId(connectionId: string) {
    this.connectionId = connectionId
  }

  @Action
  async getConnectionConfig() {
    const config: ConnectionConfig = await ipc.callMain('connections:getConnectionConfig', this.connectionId)
    if (config) this.setConfig(config)
  }

  @Action
  async saveConnectionConfig() {
    const config: ConnectionConfig = {
      id: this.connectionId,
      name: this.config.name,
      host: this.config.host,
      port: this.config.port || undefined,
      user: this.config.user,
      password: this.config.password,
      defaultDatabase: this.config.defaultDatabase || undefined,
      ssh: this.config.useSSH ? {
        host: this.config.ssh_host,
        port: this.config.ssh_port || undefined,
        user: this.config.ssh_user,
        auth: this.config.ssh_authType === 'password' ? {
          type: 'password',
          password: this.config.ssh_password,
        } : {
          type: 'key',
          keyFile: this.config.ssh_keyFile,
          passphrase: this.config.ssh_passphrase || undefined
        }
      } : undefined
    }
    const result = await ipc.callMain('connections:testAndSaveConfig', config)
    this.setConfigModified(false)

    return result
  }

  @Mutation
  updateConfig({key, val}) {
    this.config[key] = val
    this.configModified = true
  }

  @Mutation
  private setConfigModified(modified: boolean) {
    this.configModified = modified
  }

  @Mutation
  setConfig({name, host, port, user, password, defaultDatabase, ssh}: ConnectionConfig) {
    this.config = {
      name,
      host,
      port: port || null,
      user,
      password,
      defaultDatabase: defaultDatabase || '',
      useSSH: !!ssh,
      ssh_host: ssh?.host,
      ssh_port: ssh?.port || null,
      ssh_user: ssh?.user,
      ssh_authType: ssh?.auth.type || 'password',
      ssh_password: (ssh?.auth as any)?.password || '',
      ssh_keyFile: (ssh?.auth as any)?.keyFile || '',
      ssh_passphrase: (ssh?.auth as any)?.passphrase || '',
    }
  }

  @Action
  async dumpDatabase(
    {database, path, progress}:
    {database: string, path: string, progress: (bytes: number) => void}
  ) {
    const stopListening = ipc.listenBroadcast('dump:bytesWritten',
      ({path: progressPath, bytesWritten}) => {
        if (progressPath === path) progress(bytesWritten)
      }
    )

    try {
      await ipc.callMain('dump:begin', {
        connectionId: this.connectionId,
        database,
        path
      } as DumpRestoreRequest)
    } finally {
      stopListening()
    }
  }

  @Action
  async checkDumpFile(path: string): Promise<DumpFileInfo> {
    return await ipc.callMain('restore:checkFile', path)
  }

  @Action
  async restoreDatabase(
    {database, path, progress}:
    {database: string, path: string, progress: (bytes: number) => void}
  ) {
    const stopListening = ipc.listenBroadcast('restore:bytesRead',
      ({path: progressPath, bytesRead}) => {
        if (progressPath === path) progress(bytesRead)
      }
    )
    
    try {
      await ipc.callMain('restore:begin', {
        connectionId: this.connectionId,
        database,
        path
      } as DumpRestoreRequest)
    } finally {
      stopListening()
    }

    if (connectionsModule.connections[this.connectionId]?.databases) {
      await connectionsModule.fetchDatabases({connectionId: this.connectionId})
      if (connectionsModule.connections[this.connectionId].databases[database]?.modules) {
        connectionsModule.fetchModules({connectionId: this.connectionId, database})
      }
    }
  }
}
