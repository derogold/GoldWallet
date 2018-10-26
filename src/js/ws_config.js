var config = {};
// general
config.appName = 'WalletShell';
config.appDescription = 'TurtleCoin Wallet';
config.appSlogan = 'Slow and steady wins the race!';
config.appId = 'lol.turtlecoin.walletshell';
config.appGitRepo = 'https://github.com/turtlecoin/turtle-wallet-electron';

// binary filename, default port numbers
config.daemonDefaultRpcPort = 11898;
config.walletFileDefaultExt = 'twl';
config.walletServiceBinaryFilename = 'turtle-service';
config.walletServiceRpcPort = 8070;

// default/initial remote node
config.remoteNodeDefaultHost = 'public.turtlenode.io';
// remote node update url, set to null if you don't use it
config.remoteNodeListUpdateUrl = 'https://raw.githubusercontent.com/turtlecoin/turtlecoin-nodes-json/master/turtlecoin-nodes.json';
// fallback remote node list, in case fetching update failed
config.remoteNodeListFallback = [
    'public.turtlenode.io:11898',
    'public.turtlenode.net:11898',
];

// address config
config.assetName = 'TurtleCoin';
config.assetTicker =  'TRTL';
config.addressPrefix =  'TRTL';
config.addressLength = 99;
config.integratedAddressLength = 187;

// amount/values
config.minimumFee = 0.1;
config.mininumSend = 0.1;
config.defaultMixin = 3;
config.decimalDivisor = 100;
config.decimalPlaces = 2; // precision

// addressbook
config.addressBookObfuscateEntries = true;
config.addressBookObfuscationKey = '79009fb00ca1b7130832a42de45142cf6c4b7f333fe6fba5';
config.addressBookSampleEntries = [
    { name: 'labaylabay',
      address: 'TRTLv1A26ngXApin33p1JsSE9Yf6REj97Xruz15D4JtSg1wuqYTmsPj5Geu2kHtBzD8TCsfd5dbdYRsrhNXMGyvtJ61AoYqLXVS',
      paymentId: 'DF794857BC4587ECEC911AF6A6AB02513FEA524EC5B98DA8702FAC92195A94B2', 
    },
    { name: 'Macroshock',
      address: 'TRTLv3R17LWbVw8Qv4si2tieyKsytUfKQXUgsmjksgrgJsTsnhzxNAeLKPjsyDGF7HGfjqkDegu2LPaC5NeVYot1SnpfcYmjwie',
      paymentId: '', 
    },
    { name: 'RockSteady',
      address: 'TRTLuxEnfjdF46cBoHhyDtPN32weD9fvL43KX5cx2Ck9iSP4BLNPrJY3xtuFpXtLxiA6LDYojhF7n4SwPNyj9M64iTwJ738vnJk',
      paymentId: '', 
    }
];

module.exports = config;