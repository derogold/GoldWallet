const remote = require('electron').remote;
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});

const DEFAULT_TITLE = 'WalletShell TurtleCoin Wallet';

// TODO: this is the only thing left as global
const IS_DEBUG = remote.getGlobal('wsession').debug;

var gSession = function(){
    if (!(this instanceof gSession)) return new gSession();

    this.sessKey = 'wlshell';
    this.eventName = 'sessionUpdated';
    this.sessDefault = {
        loadedWalletAddress: '',
        walletHash: '',
        walletUnlockedBalance: 0,
        walletLockedBalance: 0,
        synchronized: false,
        syncStarted: false,
        serviceReady: false,
        connectedNode: '',
        txList: [],
        txLen: 0,
        txLastHash: null,
        txLastTimestamp: null,
        txNew: [],
        nodeFee: 0,
        nodeChoices: settings.get('pubnodes_data', []),
        servicePath: settings.get('service_bin', 'turtle-service'),
        configUpdated: false,
        uiStateChanged: false,
        defaultTitle: DEFAULT_TITLE,
        debug: IS_DEBUG
    };

    // initialize
    if(!sessionStorage.getItem(this.sessKey)){
        sessionStorage.setItem(this.sessKey, JSON.stringify(this.sessDefault));
    }
};

gSession.prototype.get = function(key){
    key = key || false;
    if(!key){
        return JSON.parse(sessionStorage.getItem(this.sessKey)) || this.sessDefault;
    }
    
    if(!this.sessDefault.hasOwnProperty(key)){
        throw new Error(`Invalid session key: ${key}`);
    }

    return JSON.parse(sessionStorage.getItem(this.sessKey))[key];
};

gSession.prototype.getDefault = function(key){
    if(!key){
        return this.sessDefault;
    }
    return this.sessDefault[key];
};

gSession.prototype.set = function(key, val){
    if(!this.sessDefault.hasOwnProperty(key)){
        throw new Error(`Invalid session key: ${key}`);
    }

    let sessData = this.get(); // all current data obj
    sessData[key] = val; // update value
    return sessionStorage.setItem(this.sessKey, JSON.stringify(sessData));
};

gSession.prototype.reset = function(key){
    if(key){
        if(!this.sessDefault.hasOwnProperty(key)){
            throw new Error('Invalid session key');
        }
        let sessData = this.get(); // all current data obj
        sessData[key] = this.sessDefault[key]; // set to default value
        return sessionStorage.setItem(this.sessKey, JSON.stringify(sessData[key]));
    }
    return sessionStorage.setItem(this.sessKey, JSON.stringify(this.sessDefault));
};

gSession.prototype.destroy = function(){
    return sessionStorage.removeItem(this.sessKey);
};

module.exports = gSession;