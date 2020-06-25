import * as net from 'net'
import { Client } from 'ssh2'

interface Config {
  username: string
  password?: string
  privateKey?: string | Buffer
  passphrase?: string
  port?: number
  host: string
  srcPort?: number
  srcHost?: string
  dstPort: number
  dstHost: string
  localHost?: string
  localPort?: number
  keepAlive?: boolean
}

export async function createTunnel(configArgs: Config) {
  const config = {
    ...{
			port: 22,
			srcPort: 0,
			srcHost: '127.0.0.1',
			localHost: '127.0.0.1',
			localPort: configArgs.dstPort,
    },
    ...configArgs
  }

  const sshConnection = new Client()

  const connections = new Set<net.Socket>()

  return new Promise<net.Server>((resolve, reject) => {

    sshConnection.on('error', reject)

    sshConnection.on('ready', () => {
      sshConnection.off('error', reject)

      const server = net.createServer((socket) => {
        connections.add(socket)

        socket.on('error', (err) => {
          socket.destroy()
        })

        socket.on('close', () => {
          connections.delete(socket)

          if (!connections.size && !config.keepAlive) {
            server.close()
          }
        })

        sshConnection.forwardOut(config.srcHost, config.srcPort, config.dstHost, config.dstPort, (err, sshStream) => {
          if (err) {
            socket.emit('error', err)
            return;
          }
          if (sshStream) {
            sshStream.on('error', err => socket.emit('error', err))
            socket.on('close', () => {
              sshStream.close()
            })
            sshStream.on('close', () => {
              socket.end()
            })
            socket.pipe(sshStream).pipe(socket)
          }
        })
      })

      sshConnection.on('end', () => {
        server.close()
      })

      sshConnection.on('error', (err) => {
        server.emit('error', err)
      })

      server.on('close', () => {
        sshConnection.end()
      })

      server.on('error', (err) => {
        server.close()
      })

      server.on('error', reject)

      server.listen(config.localPort, config.localPort, () => {
        server.off('error', reject)

        resolve(server)
      })
    })

    try {
      sshConnection.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase
      })
    } catch (err) {
      reject(err)
    }

  })
}
