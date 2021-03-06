# ssh-proxy-pool


[![version][version-badge]][package]
[![MIT License][license-badge]][license]

Run remote commands over a pool of server using SSH.  This is a wrapper for ssh-pool. It allows you to set
parameters for proxy and forwardAgent so that it is easier to work with bastion/jump servers between the developer
and the deployment server.

```sh
npm install ssh-proxy-pool
```

## Usage

```js
import { ProxyConnectionPool } from 'ssh-proxy-pool'

const pool = new ProxyConnectionPool(['user@server1', 'user@server2'])

async function run() {
  const results = await pool.run('hostname')
  console.log(results[0].stdout) // 'server1'
  console.log(results[1].stdout) // 'server2'
}
```

### new ProxyConnection(options)

Create a new connection to run command on a remote server.

**Parameters:**

```
@param {object} options Options
@param {string|object} options.remote Remote
@param {Stream} [options.stdout] Stdout stream
@param {Stream} [options.stderr] Stderr stream
@param {string} [options.key] SSH key
* @param {string} [options.proxy] Add a ProxyCommand to the scp command.
* @param {string} [options.forwardAgent] Add a ForwardAgent to the scp command
@param {function} [options.log] Log method
@param {boolean} [options.asUser] Use a custom user to run command
@param {number} [options.verbosityLevel] SSH verbosity level: 0 (none), 1 (-v), 2 (-vv), 3+ (-vvv)
```

The remote can use the shorthand syntax or an object:

```js
// You specify user and host
new Connection({ remote: 'user@localhost' })

// You can specify a custom SSH port
new Connection({ remote: 'user@localhost:4000' })

// You can also define remote using an object
new Connection({
  remote: {
    user: 'user',
    host: 'localhost',
    port: 4000,
  },
})
```

The log method is used to log output directly:

```js
import { Connection } from 'ssh-pool'

const connection = new Connection({
  remote: 'localhost',
  log: (...args) => console.log(...args),
})

connection.run('pwd')

// Will output:
// Running "pwd" on host "localhost".
// @localhost /my/directory
```

### connection.run(command, [options])

Run a command on the remote server, you can specify custom `childProcess.exec` options.

**Parameters:**

```
@param {string} command Command to run
@param {object} [options] Options
@param {boolean} [options.tty] Force a TTY allocation.
* @param {string} [options.proxy] Add a ProxyCommand to the scp command.
* @param {string} [options.forwardAgent] Add a ForwardAgent to the scp command
@returns {ExecResult}
@throws {ExecError}
```

```js
// Run "ls" command on a remote server
connection.run('ls').then(res => {
  console.log(res.stdout) // file1 file2 file3
})
```

### connection.copyToRemote(src, dest, [options])

Copy a file or a directory from local to a remote server, you can specify custom `childProcess.exec` options. It uses rsync under the hood.

**Parameters:**

```
* @param {string} src Source
* @param {string} dest Destination
* @param {object} [options] Options
* @param {string[]} [options.ignores] Specify a list of files to ignore.
* @param {string} [options.proxy] Add a ProxyCommand to the scp command.
* @param {string} [options.forwardAgent] Add a ForwardAgent to the scp command
* @param {string[]|string} [options.rsync] Specify a set of rsync arguments.
* @returns {ExecResult}
* @throws {ExecError}
```

```js
// Copy a local file to a remote file using Rsync
connection.copyToRemote('./localfile', '/remote-file').then(() => {
  console.log('File copied!')
})
```

### connection.copyFromRemote(src, dest, [options])

Copy a file or a directory from a remote server to local, you can specify custom `childProcess.exec` options. It uses rsync under the hood.

**Parameters:**

```
* @param {string} src Source
* @param {string} dest Destination
* @param {object} [options] Options
* @param {string[]} [options.ignores] Specify a list of files to ignore.
* @param {string[]|string} [options.rsync] Specify a set of rsync arguments.
* @returns {ExecResult}
* @throws {ExecError}
```

```js
// Copy a remote file to a local file using Rsync
connection.copyFromRemote('/remote-file', './local-file').then(() => {
  console.log('File copied!')
})
```

### new ConnectionPool(connections, [options])

Create a new pool of connections and custom options for all connections.
You can use either short syntax or connections to create a pool.

```js
import { Connection, ConnectionPool } from 'ssh-pool'

// Use shorthand.
const pool = new ConnectionPool(['server1', 'server2'])

// Use previously created connections.
const connection1 = new Connection({ remote: 'server1' })
const connection2 = new Connection({ remote: 'server2' })
const pool = new ConnectionPool([connection1, connection2])
```

Connection Pool accepts exactly the same methods as Connection. It runs commands in parallel on each server defined in the pool. You get an array of results.

### isRsyncSupported()

Test if rsync is supported on the local machine.

```js
import { isRsyncSupported } from 'ssh-pool'

isRsyncSupported().then(supported => {
  if (supported) {
    console.log('Rsync is supported!')
  } else {
    console.log('Rsync is not supported!')
  }
})
```

### exec(cmd, options, childModifier)

Execute a command and return an object containing `{ child, stdout, stderr }`.

```js
import { exec } from 'ssh-pool'

exec('echo "hello"')
  .then(({ stdout }) => console.log(stdout))
  .catch(({ stderr, stdout }) => console.error(stderr))
```

## License

MIT


[version-badge]: https://img.shields.io/npm/v/ssh-proxy-pool.svg?style=flat-square
[package]: https://www.npmjs.com/package/ssh-proxy-pool
[license-badge]: https://img.shields.io/npm/l/ssh-pool.svg?style=flat-square
[license]: https://github.com/BrokerageEngine/ssh-proxy-pool/blob/master/LICENSE
