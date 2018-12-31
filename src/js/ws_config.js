var config = {};

// self explanatory, your application name, descriptions, etc
config.appName = 'GoldWallet';
config.appDescription = 'DeroGold Wallet';
config.appSlogan = 'The Litecoin to TurtleCoin\'s Bitcoin';
config.appId = 'gold.wallet.dego';
config.appGitRepo = 'https://github.com/ExtraHash/dego-wallet-electron';

// default port number for your daemon (e.g. TurtleCoind)
config.daemonDefaultRpcPort = 6969;

// wallet file created by this app will have this extension
config.walletFileDefaultExt = 'wallet';

// change this to match your wallet service executable filename
config.walletServiceBinaryFilename = 'DeroGold-service';

// version on the bundled service (turtle-service)
config.walletServiceBinaryVersion = "v0.0.4";

// config file format supported by wallet service, possible values:
// ini -->  for turtle service (or its forks) version <= v0.8.3
// json --> for turtle service (or its forks) version >= v0.8.4
config.walletServiceConfigFormat = "json";

// default port number for your wallet service (e.g. turtle-service)
config.walletServiceRpcPort = 1337;

// block explorer url, the [[TX_HASH]] will be substituted w/ actual transaction hash
config.blockExplorerUrl = '';

// default remote node to connect to, set this to a known reliable node for 'just works' user experience
config.remoteNodeDefaultHost = 'goldminer.tk';

// remote node list update url, set to null if you don't have one
config.remoteNodeListUpdateUrl = '';

// fallback remote node list, in case fetching update failed, fill this with known to works remote nodes
config.remoteNodeListFallback = [
    'goldminer.tk:6969',
];

// your currency name
config.assetName = 'DeroGold';
// your currency ticker
config.assetTicker =  'DEGO';
// your currency address prefix, for address validation
config.addressPrefix =  'dg';
// standard wallet address length, for address validation
config.addressLength = 99;
// intergrated wallet address length, for address validation
config.integratedAddressLength = 187;

// minimum fee for sending transaction
config.minimumFee = 0.1;
// minimum amount for sending transaction
config.mininumSend = 0.1;
// default mixin/anonimity for transaction
config.defaultMixin = 3;
// to convert from atomic unit
config.decimalDivisor = 100;
// to represent human readable value
config.decimalPlaces = 2;

// obfuscate address book entries, set to false if you want to save it in plain json file.
// not for security because the encryption key is attached here
config.addressBookObfuscateEntries = true;
// key use to obfuscate address book contents
config.addressBookObfuscationKey = '79009fb00ca1b7130832a42de45142cf6c4b7f333fe6fba5';
// initial/sample entries to fill new address book
config.addressBookSampleEntries = [
    { name: 'ExtraHash',
      address: 
'dg4weDyL6UNLvymc1M2RAPVcyHy2SGVFMQaaryiuqGvTR6F83Wg2kRbGRAy4SfomvWG67gwkieGnqc6baXx9DqbN2cbskdAxS',
      paymentId: 'DF794857BC4587ECEC911AF6A6AB02513FEA524EC5B98DA8702FAC92195A94B2', 
    }
];

module.exports = config;
