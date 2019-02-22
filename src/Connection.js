import path from 'path'
import {Connection  as OriginalConnection } from "ssh-pool"

import { tmpName as asyncTmpName } from 'tmp'
import { formatRsyncCommand, isRsyncSupported } from 'ssh-pool/commands/rsync'
import { formatTarCommand } from 'ssh-pool/commands/tar'
import { formatCdCommand } from 'ssh-pool/commands/cd'
import { formatMkdirCommand } from 'ssh-pool/commands/mkdir'
import { formatRawCommand } from 'ssh-pool/commands/raw'
import { formatRmCommand } from 'ssh-pool/commands/rm'
import { joinCommandArgs } from 'ssh-pool/commands/util'
import { parseRemote, formatRemote } from 'ssh-pool/remote'
import { exec, series, deprecateV3, deprecateV5 } from 'ssh-pool/util'


import { formatSshCommand } from './commands/ssh'
import { formatScpCommand } from './commands/scp'
const tmpName = async options =>
  new Promise((resolve, reject) =>
    asyncTmpName(options, (err, name) => {
      if (err) reject(err)
      else resolve(name)
    }),
  )

/**
 * An ExecResult returned when a command is executed with success.
 * @typedef {object} ExecResult
 * @property {Buffer} stdout
 * @property {Buffer} stderr
 * @property {ChildProcess} child
 */

/**
 * An ExecResult returned when a command is executed with success.
 * @typedef {object} MultipleExecResult
 * @property {Buffer} stdout
 * @property {Buffer} stderr
 * @property {ChildProcess[]} children
 */

/**
 * An ExecError returned when a command is executed with an error.
 * @typedef {Error} ExecError
 * @property {Buffer} stdout
 * @property {Buffer} stderr
 * @property {ChildProcess} child
 */

/**
 * Materialize a connection to a remote server.
 */
class Connection extends  OriginalConnection{
  /**
   * Initialize a new `Connection` with `options`.
   *
   * @param {object} options Options
   * @param {string|object} options.remote Remote
   * @param {Stream} [options.stdout] Stdout stream
   * @param {Stream} [options.stderr] Stderr stream
   * @param {string} [options.key] SSH key
   * @param {function} [options.log] Log method
   * @param {boolean} [options.asUser] Use a custom user to run command
   * @param {number} [options.verbosityLevel] The SSH verbosity level: 0 (none), 1 (-v), 2 (-vv), 3+ (-vvv)
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * Run a command remotely using SSH.
   * All exec options are also available.
   *
   * @see https://nodejs.org/dist/latest-v8.x/docs/api/child_process.html#child_process_child_process_exec_command_options_callback
   * @param {string} command Command to run
   * @param {object} [options] Options
   * @param {boolean} [options.tty] Force a TTY allocation.
   * @returns {ExecResult}
   * @throws {ExecError}
   */
  async run(command, { tty: ttyOption, cwd,proxy, forwardAgent,  ...cmdOptions } = {}) {
    let tty = ttyOption
    if (command.startsWith('sudo') && typeof ttyOption === 'undefined') {
      deprecateV3('You should set "tty" option explictly when you use "sudo".')
      tty = true
    }
    this.log('Running "%s" on host "%s".', command, this.remote.host)
    const cmd = this.buildSSHCommand(command, { tty, cwd ,proxy, forwardAgent})
    return this.runLocally(cmd, cmdOptions)
  }





  /**
   * Run a copy from the local to the remote using scp.
   * All exec options are also available.
   *
   * @see https://nodejs.org/dist/latest-v8.x/docs/api/child_process.html#child_process_child_process_exec_command_options_callback
   * @param {string} src Source
   * @param {string} dest Destination
   * @param {object} [options] Options
   * @param {string[]} [options.ignores] Specify a list of files to ignore.
   * @param {...object} [cmdOptions] Command options
   * @returns {ExecResult}
   * @throws {ExecError}
   */
  async scpCopyToRemote(src, dest, { ignores, proxy, forwardAgent,...cmdOptions } = {}) {
    const archive = path.basename(await tmpName({ postfix: '.tar.gz' }))
    const srcDir = path.dirname(src)
    const remoteDest = `${formatRemote(this.remote)}:${dest}`

    const compress = joinCommandArgs([
      formatCdCommand({ folder: srcDir }),
      '&&',
      formatTarCommand({
        mode: 'compress',
        file: path.basename(src),
        archive,
        excludes: ignores,
      }),
    ])

    const createDestFolder = formatMkdirCommand({ folder: dest })

    const copy = joinCommandArgs([
      formatCdCommand({ folder: srcDir }),
      '&&',
      formatScpCommand({

        port: this.remote.port,
        key: this.options.key,
        proxy,
        forwardAgent,
        src: archive,
        dest: remoteDest,
      }),
    ])

    const cleanSrc = joinCommandArgs([
      formatCdCommand({ folder: srcDir }),
      '&&',
      formatRmCommand({ file: archive }),
    ])

    const extract = joinCommandArgs([
      formatCdCommand({ folder: dest }),
      '&&',
      formatTarCommand({ mode: 'extract', archive }),
    ])

    const cleanDest = joinCommandArgs([
      formatCdCommand({ folder: dest }),
      '&&',
      formatRmCommand({ file: archive }),
    ])

    return this.aggregate([
      () => this.runLocally(compress, cmdOptions),
      () => this.run(createDestFolder, cmdOptions),
      () => this.runLocally(copy, cmdOptions),
      () => this.runLocally(cleanSrc, cmdOptions),
      () => this.run(extract, cmdOptions),
      () => this.run(cleanDest, cmdOptions),
    ])
  }

  /**
   * Run a copy from the remote to the local using scp.
   * All exec options are also available.
   *
   * @see https://nodejs.org/dist/latest-v8.x/docs/api/child_process.html#child_process_child_process_exec_command_options_callback
   * @param {string} src Source
   * @param {string} dest Destination
   * @param {object} [options] Options
   * @param {string[]} [options.ignores] Specify a list of files to ignore.
   * @param {...object} [cmdOptions] Command options
   * @returns {MultipleExecResult}
   * @throws {ExecError}
   */
  async scpCopyFromRemote(src, dest, { ignores,proxy, forwardAgent, ...cmdOptions } = {}) {
    const archive = path.basename(await tmpName({ postfix: '.tar.gz' }))
    const srcDir = path.dirname(src)
    const srcArchive = path.join(srcDir, archive)
    const remoteSrcArchive = `${formatRemote(this.remote)}:${srcArchive}`

    const compress = joinCommandArgs([
      formatCdCommand({ folder: srcDir }),
      '&&',
      formatTarCommand({
        mode: 'compress',
        file: path.basename(src),
        archive,
        excludes: ignores,
      }),
    ])

    const createDestFolder = formatMkdirCommand({ folder: dest })

    const copy = formatScpCommand({

      port: this.remote.port,
      key: this.options.key,
      proxy,
      forwardAgent,
      src: remoteSrcArchive,
      dest,
    })

    const cleanSrc = joinCommandArgs([
      formatCdCommand({ folder: srcDir }),
      '&&',
      formatRmCommand({ file: archive }),
    ])

    const extract = joinCommandArgs([
      formatCdCommand({ folder: dest }),
      '&&',
      formatTarCommand({ mode: 'extract', archive }),
    ])

    const cleanDest = joinCommandArgs([
      formatCdCommand({ folder: dest }),
      '&&',
      formatRmCommand({ file: archive }),
    ])

    return this.aggregate([
      () => this.run(compress, cmdOptions),
      () => this.runLocally(createDestFolder, cmdOptions),
      () => this.runLocally(copy, cmdOptions),
      () => this.run(cleanSrc, cmdOptions),
      () => this.runLocally(extract, cmdOptions),
      () => this.runLocally(cleanDest, cmdOptions),
    ])
  }

  /**
   * Build an SSH command.
   *
   * @private
   * @param {string} command
   * @param {object} options
   * @returns {string}
   */
  buildSSHCommand(command, options) {
    return formatSshCommand({
      port: this.remote.port,
      key: this.options.key,
      strict: this.options.strict,
      tty: this.options.tty,
      proxy: this.options.proxy,
      forwardAgent: this.options.forwardAgent,
      verbosityLevel: this.options.verbosityLevel,
      remote: formatRemote(this.remote),
      command: formatRawCommand({ command, asUser: this.options.asUser }),
      ...options,
    })
  }

  /**
   * Abstract method to copy using rsync.
   *
   * @private
   * @param {string} src
   * @param {string} dest
   * @param {object} options
   * @param {string[]|string} rsync Additional arguments
   * @param {string[]} ignores Files to ignore
   * @param {...object} cmdOptions Command options
   * @returns {ExecResult}
   * @throws {ExecError}
   */
  async rsyncCopy(src, dest, { rsync, ignores, ...cmdOptions } = {}) {
    this.log('Copy "%s" to "%s" via rsync', src, dest)

    const sshCommand = formatSshCommand({
      port: this.remote.port,
      key: this.options.key,
      strict: this.options.strict,
      tty: this.options.tty,
      proxy: this.options.proxy,
      forwardAgent: this.options.forwardAgent
    })

    const cmd = formatRsyncCommand({
      src,
      dest,
      remoteShell: sshCommand,
      additionalArgs: typeof rsync === 'string' ? [rsync] : rsync,
      excludes: ignores,
    })

    return this.runLocally(cmd, cmdOptions)
  }




}

export default Connection
