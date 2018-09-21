# WalletShell

![WalletShell Logo](docs/walletshell.png)  
This is a GUI wallet for TurtleCoin made using Electron, this means it's written in JavaScript, HTML and CSS. 

It is meant to be able to work on Windows, Linux and MacOS, however so far we've only been able to test it on Linux &amp; Windows.

![WalletShell Screens](https://raw.githubusercontent.com/rixombea/turtle-wallet-electron/wssx/sc/wssc.gif "WalletShell Screens")

### Features:
This wallet contains the basic functions required to manage your TurtleCoin wallet:

* Wallet creation
  * Create new wallet
  * Import from private keys
  * Import from mnemonic seed
* Basic wallet operation
  * Open an existing  wallet
  * Display wallet address & balance
  * Display private keys/seed
  * Export private keys/seed
  * Transactions listing/sorting/searching
  * Display transaction detail
  * Incoming Transaction notification
  * Send TurtleCoin to single recipient address, allow to set payment id and custom fee. Provides address lookup from addressbook.
* Address book
  * Add/Edit/Delete address entry (label/name, address and payment id)
  * Listing/sorting/searching existing entries
  * Allow to store same wallet address with different payment id
  * Autosave address after sending to new/unknown recipient
* Misc
  * Provides setting to set local or public node address
  * Provides setting to set custom turtle-service path
  * Provides setting to use system tray (on closing/minimizing wallet)
  * Provides list of public nodes, fetch/updated daily from turtlecoin-nodes-json repo. Display order of public nodes will be shuffled on every access to settings page, to give relatively fair opportunity for node operators to be on top of the list
  * Custom node address that is not on the list will be added/remembered for future use


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
