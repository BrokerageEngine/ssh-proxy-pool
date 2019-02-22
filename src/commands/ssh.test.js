import { formatSshCommand } from './ssh'

describe('ssh', () => {
  describe('#formatSshCommand', () => {
    it('should support tty', () => {
      expect(formatSshCommand({ tty: true })).toBe('ssh -tt')
    })

    it('should support port', () => {
      expect(formatSshCommand({ port: 3000 })).toBe('ssh -p 3000')
    })

    it('should support key', () => {
      expect(formatSshCommand({ key: 'foo' })).toBe('ssh -i foo')
    })

    it('should support proxy', () => {
      expect(formatSshCommand({ proxy: 'ssh -W %h:%p user@bastion' })).toBe("ssh -o ProxyCommand='ssh -W %h:%p user@bastion'")
    })
    it('should support strict', () => {
      expect(formatSshCommand({ strict: true })).toBe(
        'ssh -o StrictHostKeyChecking=true',
      )
      expect(formatSshCommand({ strict: false })).toBe(
        'ssh -o StrictHostKeyChecking=false',
      )
      expect(formatSshCommand({ strict: 'no' })).toBe(
        'ssh -o StrictHostKeyChecking=no',
      )
      expect(formatSshCommand({ strict: 'yes' })).toBe(
        'ssh -o StrictHostKeyChecking=yes',
      )
    })

    it('should support forwardAgent', () => {
      expect(formatSshCommand({ forwardAgent: true })).toBe(
        'ssh -o ForwardAgent=true',
      )
      expect(formatSshCommand({ forwardAgent: false })).toBe(
        'ssh -o ForwardAgent=false',
      )
      expect(formatSshCommand({ forwardAgent: 'no' })).toBe(
        'ssh -o ForwardAgent=no',
      )
      expect(formatSshCommand({ forwardAgent: 'yes' })).toBe(
        'ssh -o ForwardAgent=yes',
      )
    })
    it('should support remote', () => {
      expect(
        formatSshCommand({
          remote: 'user@host',
        }),
      ).toBe('ssh user@host')
    })

    it('should support command', () => {
      expect(
        formatSshCommand({
          remote: 'user@host',
          command: 'echo "ok"',
        }),
      ).toBe('ssh user@host "echo \\"ok\\""')
    })

    it('should support cwd', () => {
      expect(
        formatSshCommand({
          remote: 'user@host',
          command: 'echo "ok"',
          cwd: '/usr',
        }),
      ).toBe(
        'ssh user@host "cd /usr > /dev/null; echo \\"ok\\"; cd - > /dev/null"',
      )
    })

    it('should support verbosityLevel', () => {
      expect(
        formatSshCommand({
          remote: 'user@host',
          command: 'echo "ok"',
          cwd: '/usr',
          verbosityLevel: 2,
        }),
      ).toBe(
        'ssh -vv user@host "cd /usr > /dev/null; echo \\"ok\\"; cd - > /dev/null"',
      )
    })
  })
})
