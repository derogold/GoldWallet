const {electron, remote} = require('electron');
const fs = require('fs');
const childProcess = require('child_process');
const execFile = childProcess.execFile;
const spawn = childProcess.spawn;
const path = require('path');
const util = require('util');
const svcRequest = require('./svc_request.js');
const uiUpdater = require('./ui_updater.js');
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});

const ERROR_WALLETLAUNCH = 'Failed to start turtle-service. Set the path to turtle-service properly in the settings tab.';
const ERROR_WRONG_PASSWORD = 'Failed to load your wallet, please check your password';

const SERVICE_LOG_DEBUG = remote.getGlobal('wsession').debug;
const SERVICE_LOG_LEVEL_DEFAULT = 0;
const SERVICE_LOG_LEVEL_DEBUG = 4;
const SERVICE_LOG_LEVEL = (SERVICE_LOG_DEBUG ? SERVICE_LOG_LEVEL_DEBUG : SERVICE_LOG_LEVEL_DEFAULT);
const DEFAULT_WALLET_EXT = 'twl';

var serviceInitialized = false;
let the_service = null;
let the_cworker;
let serviceProcess;

// reset global vars
function resetGlobals(){
    remote.getGlobal('wsession').loadedWalletAddress = '';
    remote.getGlobal('wsession').synchronized = false;
    remote.getGlobal('wsession').syncStarted = false;
    remote.getGlobal('wsession').serviceReady = false;
    remote.getGlobal('wsession').nodeFee = null;
    remote.getGlobal('wsession').configUpdated = false;
    remote.getGlobal('wsession').walletHash = '';
    remote.getGlobal('wsession').txList = [];
    remote.getGlobal('wsession').txLen = 0;
    remote.getGlobal('wsession').txLastHash = '';
    remote.getGlobal('wsession').txLastTimestamp = '';
    onSectionChanged('reset-oy');
}

function doInit(){
    if(remote.getGlobal('wsession').configUpdated || !serviceInitialized){
        serviceInitialized = true;
        remote.getGlobal('wsession').configUpdated = false;
        the_service = null;
    } 
    let cfg = {
        service_host: settings.get('service_host'),
        service_port: settings.get('service_port'),
        service_password: settings.get('service_password')
    }
    if(!the_service) the_service = new svcRequest(cfg);
}

function isRunning() {
    return !util.isNullOrUndefined(serviceProcess);
}

// start entry point, to test if config ok, service runnable and pass is good
function startService(filePath, password, scanHeight, onError, onSuccess) {
    doInit();
    let file = path.basename(filePath);
    let directory = path.dirname(filePath);

    // test exec
    const ptest = execFile(
        settings.get('service_bin'), [
            '--rpc-password', settings.get('service_password'),
            '-w', path.join(directory, file),
            '-p', password,
            '--log-level', 0,
            '--address'
        ], (error, stdout, stderr) => {
            if(error){
                console.log(error);
                onError(ERROR_WALLETLAUNCH);
            }else{
                if(stdout && stdout.length && stdout.indexOf('TRTL') !== -1){
                    let trimmed = stdout.trim();
                    let wa = trimmed.substring(trimmed.indexOf('TRTL'), trimmed.length);
                    remote.getGlobal('wsession').loadedWalletAddress = wa;
                    doRunService(filePath, password, scanHeight, onError, onSuccess);
                }else{
                    // just stop here
                    onError(ERROR_WRONG_PASSWORD);
                }
            }
        }
    );
}

function doRunService(filePath, password, scanHeight, onError, onSuccess) {
    doInit();

    let file = path.basename(filePath);
    let directory = path.dirname(filePath);
    let logFilename = `${file.split(' ').join('').split('.')[0]}.log`;
    let logFile = path.join(directory, logFilename);
    let walletFile = path.join(directory, file);
    let walletArgs = [
        '-w', walletFile,
        '-p', password,
        '--rpc-password', settings.get('service_password'),
        '--enable-cors', '*',
        '--daemon-address', settings.get('daemon_host'),
        '--daemon-port', settings.get('daemon_port'),
        '--log-level', SERVICE_LOG_LEVEL,
        '--log-file', logFile
    ];
    // if(scanHeight && scanHeight > 1024) walletArgs = walletArgs.concat(['--scan-height', scanHeight]);
    serviceProcess = spawn(settings.get('service_bin'), walletArgs);
    
    serviceProcess.on('close', function (code, signal) {
        console.log(`turtle-service terminated by ${signal}, code: ${code}`);
        serviceProcess = null;
    });

    serviceProcess.on('error', function(err) {
        console.log('turtle-service error', err);
         serviceProcess = null;
    });

    /* The process has been spawned, now we check if its running */
    var TEST_OK = false;
    if (isRunning()) {
        function testConnection(retry) {
            the_service.getAddress().then((address) => {
                if(!TEST_OK){
                    remote.getGlobal('wsession').loadedWalletAddress = address;
                    remote.getGlobal('wsession').serviceReady = true;
                    // start the worker here?
                    startWorker();
                    uiUpdater.updateUiState({
                        type: 'addressUpdated',
                        data: address
                    });
                    onSuccess(walletFile, scanHeight);
                    TEST_OK = true;
                }
                return true;
            }).catch((err) => {
                if(retry >= 12 && !TEST_OK){
                    onError(err);
                    return false;
                }else{
                    //console.log(`testconn ${retry} failed`);
                    setTimeout(function(){
                        let nextTry = retry+1;
                        console.log(`retrying testconn (${nextTry})`);
                        testConnection(nextTry);
                    },2000);
                }
            });
        }

        setTimeout(function(){
            testConnection(0);
        }, 5000);
    } else {
        console.log('turtle-service not running');
        if(onError) onError(ERROR_WALLETLAUNCH);
    }
}

function startWorker(){
    the_cworker = childProcess.fork(
        path.join(__dirname,'./svc_worker.js')
    );

    the_cworker.on('message', (m) => {
        if(m.type === 'serviceStatus' ){
            the_cworker.send({
                type: 'start',
                data: {}
            });
            remote.getGlobal('wsession').serviceReady = true;
            remote.getGlobal('wsession').syncStarted = true;
        }else{
            handleWorkerUpdate(m);
        }
    });

    the_cworker.send({
        type: 'cfg',
        data:  { 
            service_host: settings.get('service_host'),
            service_port: settings.get('service_port'),
            service_password: settings.get('service_password')
        }
    });

    the_cworker.on('close', function (code, signal) {
        console.log(`service worker terminated by ${signal}`);
        the_cworker = null;
    });

    the_cworker.on('exit', function (code, signal) {
        console.log(`service worker terminated by ${signal}`);
        the_cworker = null;
    });

    the_cworker.on('error', function(err) {
        console.log('service worker error', err);
        try{the_cworker.kill('SIGKILL');}catch(e){}
    });
}

function stopWorker(){
    doInit();
    if(util.isNullOrUndefined(the_cworker)) return;
    try{
        the_cworker.send({type: 'stop', data: {}});
        the_cworker.kill('SIGTERM');
    }catch(e){
        console.log('failed to stop cworker', e);
    }
}

function stopService(dokill) {
    dokill = dokill || false;
    doInit();
    let signal = 'SIGTERM';
    if(dokill) signal = 'SIGKILL';
    return new Promise(function (resolve) {
        if (isRunning()) {
            the_service.save().then(() =>{
                try{
                    serviceProcess.kill(signal);
                    resetGlobals();
                    resolve(true);
                }catch(err){
                    console.log('SIGTERM failed', err);
                    resetGlobals();
                    resolve(false);
                }
            }).catch((err) => {
                console.log('failed to save wallet', err);
                try{
                    serviceProcess.kill('SIGKILL');
                    resetGlobals();
                    resolve(true);
                }catch(err){
                    console.log('SIGKILL FAILED', err);
                    resetGlobals();
                    resolve(false);
                }
            });
        } else {
            resetGlobals();
            resolve(false);
        }
    });
}

function getNodeFee(){
    the_service.getFeeInfo().then((res) => {
        // store
        let theFee = (res.amount / 100);
        remote.getGlobal('wsession').nodeFee = theFee;
        uiUpdater.updateUiState({
            type: 'nodeFeeUpdated',
            data: theFee
        });
        return theFee;
    }).catch((err) => {
        console.log('failed to get node fee', err);
        return 0;
    });
}

function resetFromHeight(scanHeight){
    scanHeight = scanHeight || 0;
    let reset_params = {};
    if(scanHeight > 1024) reset_params.scanHeight = scanHeight;
    // this shit always return invalid request
    console.log(`resetting from height ${scanHeight}`);
    the_service.reset(reset_params).then( () => {
        console.log('Reset OK');
        return true;
    }).catch((err) => {
        console.log('Reset Failed',err);
        return true;
        // do nothing
    });
}

function getSecretKeys(address){
    return new Promise((resolve, reject) => {
        if(!the_service) return reject('Service Not Running');
        the_service.getBackupKeys({address: address}).then((result) => {
            return resolve(result);
        }).catch((err) => {
            console.log('Failed to get key', err);
            return reject(err);
        });
    });
}

function sendTransaction(params){
    return new Promise((resolve, reject) => {
        the_service.sendTransaction(params).then((result) => {
            return resolve(result);
        }).catch((err) => {
            return reject(err);
        });
    });
}

const ERROR_INVALID_PATH = 'Invalid directory/filename, please enter a valid path that you have write permission';
const ERROR_WALLET_CREATE = 'Wallet can not be created, please check your input and try again';
const ERROR_WALLET_IMPORT = 'Wallet import faield, please make sure you have entered correct information';
function createWallet (dir, name, password){
    return new Promise((resolve, reject) => {
        if(!dir || !name) return reject(new Error(ERROR_INVALID_PATH));
        try{
            fs.accessSync(dir, fs.constants.W_OK);
        }catch(e){
            return reject(new Error(ERROR_INVALID_PATH));
        }

        let filename = `${name}.${DEFAULT_WALLET_EXT}`;
        let walletFile = path.join(dir, filename);

        execFile(
            settings.get('service_bin'),
            [ '-g',  '-w', walletFile,  '-p', password,
              '--rpc-password', settings.get('service_password')
            ],
            (error, stdout, stderr) => {
                if (error) {
                    console.log('wallet create err', error);
                    return reject(new Error(ERROR_WALLET_CREATE));
                } else {
                    return resolve(walletFile);
                }
            }
        );
    });
}

function importFromKey(dir, name, password, viewKey, spendKey, scanHeight) {
    return new Promise((resolve, reject) => {
        scanHeight = scanHeight || 0;
        if(!dir || !name || !viewKey || !spendKey) return reject(new Error(ERROR_WALLET_IMPORT));
        try{
            fs.accessSync(dir, fs.constants.W_OK);
        }catch(e){
            return reject(new Error(ERROR_INVALID_PATH));
        } 

        let filename = `${name}.${DEFAULT_WALLET_EXT}`;
        let walletFile = path.join(dir, filename);

        let walletArgs = [ 
            '-g',
            '-w', walletFile,
            '-p', password,
            '--view-key', viewKey, 
            '--spend-key', spendKey,
            '--rpc-password', settings.get('service_password')
        ];

        if(scanHeight > 1024) walletArgs = walletArgs.concat(['--scan-height',scanHeight]);

        execFile(
            settings.get('service_bin'),
            walletArgs,
            (error, stdout, stderr) => {
                if (error) {
                    console.log('wallet importkey err', error);
                    return reject(new Error(ERROR_WALLET_IMPORT));
                } else {
                    return resolve(walletFile);
                }
            }
        );

    });
}


function importFromSeed(dir, name, password, mnemonicSeed, scanHeight) {
    return new Promise((resolve, reject) => {
        scanHeight = scanHeight || 0;
        if(!dir || !name || !mnemonicSeed) return reject(new Error(ERROR_WALLET_IMPORT));
        try{
            fs.accessSync(dir, fs.constants.W_OK);
        }catch(e){
            return reject(new Error(ERROR_INVALID_PATH));
        } 

        let filename = `${name}.${DEFAULT_WALLET_EXT}`;
        let walletFile = path.join(dir, filename);

        let walletArgs = [ 
            '-g',
            '-w', walletFile,
            '-p', password,
            '--mnemonic-seed', mnemonicSeed,
            '--rpc-password', settings.get('service_password')
        ];

        if(scanHeight > 1024) walletArgs = walletArgs.concat(['--scan-height',scanHeight]);

        execFile(
            settings.get('service_bin'),
            walletArgs,
            (error, stdout, stderr) => {
                if (error) {
                    console.log('wallet importseed err', error);
                    return reject(new Error(ERROR_WALLET_IMPORT));
                } else {
                    return resolve(walletFile);
                }
            }
        );

    });
}

// misc
function onSectionChanged(what){
    let msg = {
        type: 'sectionChanged',
        data: what
    };
    handleWorkerUpdate(msg);
}

// just pass it to ui_updater
function handleWorkerUpdate(msg){
    uiUpdater.updateUiState(msg);
}

module.exports = {
    startService,
    stopService,
    resetGlobals,
    isRunning,
    startWorker,
    stopWorker,
    resetFromHeight,
    getNodeFee,
    getSecretKeys,
    sendTransaction,
    createWallet,
    handleWorkerUpdate,
    onSectionChanged,
    importFromKey,
    importFromSeed
};