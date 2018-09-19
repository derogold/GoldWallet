# WalletShell

This is a GUI wallet for TurtleCoin made using Electron, this means it's written in JavaScript, HTML and CSS. 

It is meant to be able to work on Windows, Linux and MacOS, however so far we've only been able to test it on Linux &amp; Windows.

![WalletShell Screens](https://raw.githubusercontent.com/rixombea/turtle-wallet-electron/wssx/sc/wssc.gif "WalletShell Screens")

### Features:
This wallet contains the basic functions required to manage your TurtleCoin wallet:
  * Basic tasks: Open an existing wallet file, create new wallet file, import an existing wallet using keys or mnemonic seed.
  * Wallet operations: display wallet balance, list transactions, send new transfer, display/export private keys &amp; mnemonic seed.
  * Address book: store and label your contact's wallet address, searchable and can be looked up during sending new transaction.
  * UI/Misc: Provides up-to-date public node address or specify your own local node, able to specify start scan height when importing wallet for faster sync, incoming transaction notification, minimize/close to system tray.

There is still plenty of room for improvements and features, so we will gladly accept help from anyone who is capable of lending a hand.

### Notes

WalletShell relies on `turtle-service` to manage wallet container &amp; rpc communication.

WalletShell release packaged includes ready to use `turtle-service` binary, which is unmodified copy TurtleCoin release archive.

On first launch, WalletShell will try to detect location/path of bundled `turtle-service` binary, but if it's failed, you can set path to the `turtle-service` binary on the Settings tab.

If you don't trust the bundled `turtle-service` file, you can compare the sha256 sum against one from the official release, or just download and use binary from official TurtleCoin release, which you can download here: https://github.com/turtlecoin/turtlecoin/releases. Then,  make sure to update your `turtle-service` path setting.

### Download &amp; Run WalletShell

* Download latest packaged release/installer for your platform here: https://github.com/turtlecoin//turtle-wallet-electron/releases

* Windows: run the downloaded installer `walletshell-<version>-win-setup.exe`, WalletShell will be lauched after installation completed.
* GNU/Linux: extract downloaded archived, then run the executable binary (`walletshell-<version>/walletshell`) 
* macOS: ??? extract downloaded archived, then run the executable binary (`WalletShell.app/Contents/MacOs/WalleSshell`) ??


### Build
You need to have `Node.js` and `npm` installed, go to https://nodejs.org and find out how to get it installed on your platform.

Once you have Node+npm installed:
```
# first, download turtle-service binary for each platform
# from TurtleCoin official repo
# https://github.com/turtlecoin/turtlecoin/releases
# extract the turtle-service executable somewhere

# clone the repo
$ git clone https://github.com/turtlecoin/turtle-wallet-electron
$ cd turtle-wallet-electron

# install dependencies
$ npm install

# create build+dist directory
$ mkdir -p ./build && mkdir -p ./dist

# copy/symlink icons from assets, required for packaging
$ cp ./src/assets/icon.* ./build/

# build GNU/Linux package
$ mkdir -p ./bin/lin
$ cp /path/to/linux-version-of/turtle-service ./bin/lin/
$ npm run dist-lin

# build Windows package
$ mkdir -p ./bin/win
$ cp /path/to/win-version-of/turtle-service.exe ./bin/win/
$ npm run dist-lin

# build OSX package
$ mkdir -p ./bin/osx
$ cp /path/to/osx-version-of/turtle-service ./bin/osx/
$ npm run dist-mac
```

Resulting packages or installer can be found inside `dist/` directory.
