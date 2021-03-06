import { joinCommandArgs, wrapCommand } from 'ssh-pool/lib/commands/util'

function wrapCwd(cwd, command) {
  return `cd ${cwd} > /dev/null; ${command}; cd - > /dev/null`
}

export function formatSshCommand({
  port,
  key,
  strict,
  tty,
  remote,
  proxyUser,
  proxyHost,
  forwardAgent,
  cwd,
  command,
  verbosityLevel,
}) {
  let args = ['ssh']
  if (verbosityLevel) {
    switch (verbosityLevel) {
    case verbosityLevel <= 0: break
    case 1: args = [...args, '-v']; break
    case 2: args = [...args, '-vv']; break
    default: args = [...args, '-vvv']; break
    }
  }
  if (tty) args = [...args, '-tt']
  if (port) args = [...args, '-p', port]
  if (key) args = [...args, '-i', key]
  if (proxyHost) {
    let proxyCmd = "ssh -W %h:%p ";
    if (proxyUser) {
        proxyCmd += `${proxyUser}@${proxyHost}`
    }
    else {
      proxyCmd += `${proxyHost}`
    }
    args = [...args, '-o', `ProxyCommand='${proxyCmd}'`]
  }
  if (strict !== undefined)
    args = [...args, '-o', `StrictHostKeyChecking=${strict}`]
  if (forwardAgent !== undefined)
    args = [...args, '-o', `ForwardAgent='${forwardAgent}'`]

  if (remote) args = [...args, remote]

  const cwdCommand = cwd ? wrapCwd(cwd, command) : command
  if (command) args = [...args, wrapCommand(cwdCommand)]
  return joinCommandArgs(args)
}
