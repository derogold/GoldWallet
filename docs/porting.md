## Porting WalletShell for Other Coin

Note that this is only valid/possible for `turtle-service` compatible coin (TurtleCoin fork).

You can port WalletShell to be used for other (`turtle-service` compatible) coin with few simple steps (assuming you already clone the repo):

### 1. Update package.json
This step is important in order to avoid conflict with the original WalletShell, if user install both wallet version.

Edit `package.json` file, change the values of the following items:
- `name`
- `productName`
- `appId`

### 2. Update ws_config.js
Edit `src/js/ws_config.js` file, update config values to match your coin requirements.
Each config item name are self explanatory.

### 3. Re-skining (Optional)
If you need to re-skin/updating the appearance:
- Edit `src/css/common.css` to modify general appearance (layout, sizing, color, etc)
- Replace `src/assets/image/*` with your own.

#### Final Note:
_You can use, modify WalletShell as you want, as long as you comply with WalletShell's [license](https://github.com/turtlecoin/turtle-wallet-electron/blob/master/LICENSE.md)_.