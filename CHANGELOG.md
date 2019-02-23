# Change Log
## ssh-proxy-pool


<a name="0.0.3"></a>
## [0.0.1] (2019-02-23)


### Features

* all the bastion settings are now opt-out. Meaning they are automatically set on all the commands. You can override them on a specific command by setting them directly.

### Bugs

* rsync now works with the bastion

<a name="0.0.1"></a>
## [0.0.1] (2019-02-22)


### Features

* Initial Release
* Support "proxy" in "run","scpCopyToRemote", "scpCopyFromRemote", "buildSSHCommand" commands
* Support "forwardAgent" in "run","scpCopyToRemote", "scpCopyFromRemote", "buildSSHCommand" commands

### Docs

* Update readme with new documentation
