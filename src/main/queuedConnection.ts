import { AwaitConnection } from 'edgedb/client'

class PendingPromise<T> {
  promise: Promise<T>
  resolve?: (value?: T | PromiseLike<T>) => void
  reject?: (reason?: any) => void
  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

export class QueuedConnection {
  private queue: {pending: PendingPromise<any>, task: () => Promise<any>}[] = []

  constructor(public conn: AwaitConnection) {}

  private _whenConnIdle<T>(task: () => Promise<T>) {
    const pending = new PendingPromise<T>()
    this.queue.push({pending, task})

    if (this.queue.length === 1) this._processQueue()

    return pending.promise
  }

  private async _processQueue() {
    if (this.queue.length) {
      const {pending, task} = this.queue[0]

      try {
        pending.resolve( await task() )
      } catch (e) {
        pending.reject(e)
      }

      this.queue.shift()
      this._processQueue()
    }
  }

  execute(...args: Parameters<typeof AwaitConnection.prototype.execute>) {
    return this._whenConnIdle(() => this.conn.execute(...args)) 
  }

  fetchOne(...args: Parameters<typeof AwaitConnection.prototype.fetchOne>) {
    return this._whenConnIdle(() => this.conn.fetchOne(...args)) 
  }

  fetchAll(...args: Parameters<typeof AwaitConnection.prototype.fetchAll>) {
    return this._whenConnIdle(() => this.conn.fetchAll(...args))
  }

  fetchAllRaw(...args: Parameters<typeof AwaitConnection.prototype._fetchAllRaw>) {
    return this._whenConnIdle(() => this.conn._fetchAllRaw(...args))
  }

  fetchOneJSON(...args: Parameters<typeof AwaitConnection.prototype.fetchOneJSON>) {
    return this._whenConnIdle(() => this.conn.fetchOneJSON(...args)) 
  }

  fetchAllJSON(...args: Parameters<typeof AwaitConnection.prototype.fetchAllJSON>) {
    return this._whenConnIdle(() => this.conn.fetchAllJSON(...args)) 
  }

  close() {
    return this.conn.close()
  }
}
