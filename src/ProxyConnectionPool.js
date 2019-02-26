/* eslint-disable func-names */
import Connection from './Connection'

class ProxyConnectionPool {
  /**
   * Initialize a new `ConnectionPool` with `connections`.
   * All Connection options are also supported.
   *
   * @param {Connection|string[]} connections Connections
   * @param {object} [options] Options
   */
  constructor(connections, options) {
    this.connections = connections.map(connection => {
      if (connection instanceof Connection) return connection
      return new Connection({ remote: connection, ...options })
    })
    this.isProxied = true;
  }

}

;[
  'run',
  'copy',
  'copyToRemote',
  'copyFromRemote',
  'scpCopyToRemote',
  'scpCopyFromRemote',
].forEach(method => {
  ProxyConnectionPool.prototype[method] = function(...args) {
    return Promise.all(
      this.connections.map(connection => connection[method](...args)),
    )
  }

  ProxyConnectionPool.prototype[`${method}WithCondition`] = function(conditionFunction, ...args) {
    return Promise.all(
      this.connections.map(connection => conditionFunction(connection) ? connection[method](...args): null)
    )
  }
})

export default ProxyConnectionPool
