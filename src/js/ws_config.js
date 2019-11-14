var config = {};

// self explanatory, your application name, descriptions, etc
config.appName = 'GoldWallet';
config.appDescription = 'DeroGold Wallet';
config.appSlogan = 'DeroGold. For a Better Tomorrow!';
config.appId = 'derogold.goldwallet';
config.appGitRepo = 'https://github.com/derogold/GoldWallet.git';

// default port number for your daemon (e.g. TurtleCoind)
config.daemonDefaultRpcPort = 6969;

// wallet file created by this app will have this extension
config.walletFileDefaultExt = 'wallet';

// change this to match your wallet service executable filename
config.walletServiceBinaryFilename = 'DeroGold-service';

// version on the bundled service (turtle-service)
config.walletServiceBinaryVersion = "v0.4.0";

// config file format supported by wallet service, possible values:
// ini -->  for turtle service (or its forks) version <= v0.8.3
// json --> for turtle service (or its forks) version >= v0.8.4
config.walletServiceConfigFormat = "json";

// default port number for your wallet service (e.g. turtle-service)
config.walletServiceRpcPort = 1337;

// block explorer url, the [[TX_HASH]] will be substituted w/ actual transaction hash
config.blockExplorerUrl = 'http://derogold4ever.online/transaction.html?hash=[[TX_HASH]]';

// default remote node to connect to, set this to a known reliable node for 'just works' user experience
config.remoteNodeDefaultHost = 'derogold4ever.online';


// remote node list update url, set to null if you don't have one
// for DEGO:
// raw list: https://raw.githubusercontent.com/derogold/derogold-nodes-json/master/derogold-nodes.json
config.remoteNodeListUpdateUrl = 'https://raw.githubusercontent.com/derogold/derogold-nodes-json/master/derogold-nodes.json';

// set to false if using raw/unfiltered node list
config.remoteNodeListFiltered = false;

// fallback remote node list, in case fetching update failed, fill this with known to works remote nodes
config.remoteNodeListFallback = [
  'publicnode.ydns.eu:6969',
  'derogold4ever.online:6969',
  'node.stx.nl:6969',
];
config.remoteNodeCacheSupported = false;
config.remoteNodeSslSupported = false;

// your currency name
config.assetName = 'DeroGold';
// your currency ticker
config.assetTicker = 'DEGO';
// your currency address prefix, for address validation
config.addressPrefix = 'dg';
// standard wallet address length, for address validation
config.addressLength = 97;
// integrated wallet address length, for address validation. Added length is length of payment ID encoded in base58.
config.integratedAddressLength = 185;

// minimum fee for sending transaction
config.minimumFee = 10000;
// minimum amount for sending transaction
config.mininumSend = 1000;
// default mixin/anonimity for transaction
config.defaultMixin = 3;
// to represent human readable value
config.decimalPlaces = 2;
// to convert from atomic unit
config.decimalDivisor = 100;

// obfuscate address book entries, set to false if you want to save it in plain json file.
// not for security because the encryption key is attached here
config.addressBookObfuscateEntries = true;
// key use to obfuscate address book contents
config.addressBookObfuscationKey = '79009fb00ca1b7130832a42de45142cf6c4b7f333fe6fba5';
// initial/sample entries to fill new address book
config.addressBookSampleEntries = [
  {
    name: 'GoldWallet Donation',
    address: 'dg47xN74St6btXZUDo96NW7G62djERbst3eFuiQCaMo1AADep62Siqu3vmnDcc3tFXf1wgnVKvGwD1eyYZqYBhrB2ChcBtGJL',
    paymentId: '',
  }
];
// cipher config for private address book
config.addressBookCipherConfig = {
  algorithm: 'aes-256-gcm',
  saltLenght: 128,
  pbkdf2Rounds: 10000,
  pbkdf2Digest: 'sha512'
};

module.exports = config;
