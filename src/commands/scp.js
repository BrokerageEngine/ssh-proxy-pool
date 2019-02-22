import { joinCommandArgs, requireArgs } from './util'

export function formatScpCommand({ port, key, proxy, forwardAgent, src, dest }) {
  requireArgs(['src', 'dest'], { src, dest }, 'scp')
  let args = ['scp']
  if (proxy) args = [...args, '-o', `"ProxyCommand ${proxy}"`]
  if (port) args = [...args, '-P', port]
  if (key) args = [...args, '-i', key]
  if (forwardAgent !== undefined)
    args = [...args, '-o', `"ForwardAgent ${forwardAgent}"`]

  args = [...args, src, dest]
  return joinCommandArgs(args)
}
