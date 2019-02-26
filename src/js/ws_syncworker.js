const log = require('electron-log');
const WalletShellApi = require('./ws_api');

let DEBUG = false;
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = 'debug';
log.transports.file.level = 'debug';

const SYNC_INTERVAL = 4 * 1000;
const SYNC_FAILED_MAX = 24;

var serviceConfig = null; // { service_host: '127.0.0.1', service_port: '8070', service_password: 'xxx'};
var workerState = {
    CONNECTED: true,
    PAUSED: false,
    TX_CHECK_INITIALIZED: false,
    FAILED_COUNT: 0
};
var syncState = {
    LAST_BLOCK_COUNT: 1,
    LAST_KNOWN_BLOCK_COUNT: 1,
    TX_LAST_INDEX: 1,
    TX_LAST_COUNT: 0,
    TX_CHECK_SKIPPED_COUNT: 0,

};
var wsapi = null;
var taskWorker = null;

function logDebug(msg) {
    if (!DEBUG) return;
    log.debug(`[syncworker] ${msg}`);
}

function initApi(cfg) {
    if (wsapi instanceof WalletShellApi) return;
    logDebug('Initializing WalletShellApi');
    serviceConfig = cfg;
    wsapi = new WalletShellApi(serviceConfig);
}

function checkBlockUpdate() {
    if (!serviceConfig || wsapi === null) return;
    logDebug('-> blockUpdater: fetching block update');
    wsapi.getStatus().then((blockStatus) => {
        let lastConStatus = workerState.CONNECTED;
        let conFailed = parseInt(blockStatus.knownBlockCount, 10) === 1;
        if (conFailed) {
            logDebug('-> blockUpdater: Got bad known block count, mark connection as broken');
            if (lastConStatus !== conFailed) {
                let fakeStatus = {
                    blockCount: -200,
                    knownBlockCount: -200,
                    displayBlockCount: -200,
                    displayKnownBlockCount: -200,
                    syncPercent: -200
                };
                process.send({
                    type: 'blockUpdated',
                    data: fakeStatus
                });
            }
            workerState.CONNECTED = false;
            return;
        }

        // we have good connection
        workerState.CONNECTED = true;
        workerState.FAILED_COUNT = 0;
        let blockCount = parseInt(blockStatus.blockCount, 10);
        let knownBlockCount = parseInt(blockStatus.knownBlockCount, 10);

        let blockCountUpdated = (blockCount > syncState.LAST_BLOCK_COUNT);
        let knownBlockCountUpdated = (knownBlockCount > syncState.LAST_KNOWN_BLOCK_COUNT);
        if (!blockCountUpdated && !knownBlockCountUpdated && syncState.TX_CHECK_SKIPPED_COUNT < 8) {
            logDebug(`-> blockUpdater: no update, skip block notifier (${syncState.TX_CHECK_SKIPPED_COUNT})`);
            syncState.TX_CHECK_SKIPPED_COUNT += 1;
            return;
        }

        syncState.TX_CHECK_SKIPPED_COUNT = 0;
        logDebug('-> blockUpdater: block updated, notify block update');
        let txcheck = (syncState.LAST_KNOWN_BLOCK_COUNT < knownBlockCount || syncState.LAST_BLOCK_COUNT < knownBlockCount);
        syncState.LAST_BLOCK_COUNT = blockCount;
        syncState.LAST_KNOWN_BLOCK_COUNT = knownBlockCount;

        // add any extras here, so renderer not doing too much things
        let dispKnownBlockCount = (knownBlockCount - 1);
        let dispBlockCount = (blockCount > dispKnownBlockCount ? dispKnownBlockCount : blockCount);
        let syncPercent = ((dispBlockCount / dispKnownBlockCount) * 100);
        if (syncPercent <= 0 || syncPercent >= 99.995) {
            syncPercent = 100;
        } else {
            syncPercent = syncPercent.toFixed(2);
        }

        blockStatus.displayBlockCount = dispBlockCount;
        blockStatus.displayKnownBlockCount = dispKnownBlockCount;
        blockStatus.syncPercent = syncPercent;
        process.send({
            type: 'blockUpdated',
            data: blockStatus
        });

        // don't check if we can't get any block
        if (syncState.LAST_BLOCK_COUNT <= 1) return;

        // don't check tx if block count not updated
        if (!txcheck && workerState.TX_CHECK_INITIALIZED) {
            logDebug('-> blockUpdater: Tx check skipped');
            return;
        }

        checkTransactionsUpdate();

    }).catch((err) => {
        workerState.FAILED_COUNT++;
        logDebug(`-> blockUpdater: FAILED, ${err.message} | failed count: ${workerState.FAILED_COUNT}`);
        if (workerState.FAILED_COUNT > SYNC_FAILED_MAX) {
            logDebug('-> blockUpdater: too many timeout, mark connection as broken');

            let fakeStatus = {
                blockCount: -200,
                knownBlockCount: -200,
                displayBlockCount: -200,
                displayKnownBlockCount: -200,
                syncPercent: -200
            };
            process.send({
                type: 'blockUpdated',
                data: fakeStatus
            });
            workerState.STATE_CONNECTED = false;
            return;
        }
        return false;
    });
}

function checkTransactionsUpdate() {
    if (!serviceConfig || wsapi === null) return;

    wsapi.getBalance().then((balance) => {
        process.send({
            type: 'balanceUpdated',
            data: balance
        });

        if (syncState.LAST_BLOCK_COUNT > 1) {
            logDebug('-> txUpdater: checking tx update');
            let currentBLockCount = syncState.LAST_BLOCK_COUNT - 1;
            let startIndex = (!workerState.TX_CHECK_INITIALIZED ? 1 : syncState.TX_LAST_INDEX);
            let searchCount = currentBLockCount;
            let needCountMargin = false;
            let blockMargin = 10;
            if (workerState.TX_CHECK_INITIALIZED) {
                searchCount = (currentBLockCount - syncState.TX_LAST_COUNT);
                needCountMargin = true;
            }

            let startIndexWithMargin = (startIndex === 1 ? 1 : (startIndex - blockMargin));
            let searchCountWithMargin = needCountMargin ? searchCount + blockMargin : searchCount;
            let trx_args = {
                firstBlockIndex: startIndexWithMargin,
                blockCount: searchCountWithMargin
            };
            logDebug(`-> txUpdater: args=${JSON.stringify(trx_args)}`);
            wsapi.getTransactions(trx_args).then((trx) => {
                process.send({
                    type: 'transactionUpdated',
                    data: trx
                });
                saveWallet();
                return true;
            }).catch((err) => {
                logDebug(`-> txUpdater: getTransactions FAILED, ${err.message}`);
                return false;
            });
            workerState.TX_CHECK_INITIALIZED = true;
            syncState.TX_LAST_INDEX = currentBLockCount;
            syncState.TX_LAST_COUNT = currentBLockCount;
        }
    }).catch((err) => {
        logDebug(`-> txUpdater: getBalance FAILED, ${err.message}`);
        return false;
    });
}

function saveWallet() {
    if (!serviceConfig) return;
    wsapi.save().then(() => {
        logDebug(`-> saveWallet: OK`);
        return true;
    }).catch(() => {
        return false;
    });
}

function syncWallet() {
    taskWorker = setInterval(() => {
        if (workerState.PAUSED) return;
        logDebug(`Wallet sync tasks...`);
        checkBlockUpdate();
    }, SYNC_INTERVAL);
}

// {type: 'blah', msg: 'any'}
process.on('message', (msg) => {
    let cmd = msg || '';
    cmd.type = msg.type || 'cfg';
    cmd.data = msg.data || null;

    switch (cmd.type) {
        case 'cfg':
            if (cmd.data) {
                serviceConfig = cmd.data;
                initApi(serviceConfig);
                process.send({
                    type: 'serviceStatus',
                    data: 'OK'
                });
            }
            if (cmd.debug) {
                DEBUG = true;
                logDebug('Config received.');
                logDebug('Running in debug mode.');
            }
            break;
        case 'start':
            logDebug('Starting');
            try { clearInterval(taskWorker); } catch (err) { }
            // initial block check;
            checkBlockUpdate();

            // initial check, only to get balance
            checkTransactionsUpdate();

            setTimeout(syncWallet, 5000);
            break;
        case 'pause':
            if (workerState.PAUSED) return;
            logDebug('Got suspend command');
            process.send({
                type: 'blockUpdated',
                data: {
                    blockCount: -50,
                    knownBlockCount: -50,
                    displayBlockCount: -50,
                    displayKnownBlockCount: -50,
                    syncPercent: -50
                }
            });
            workerState.PAUSED = true;
            break;
        case 'resume':
            logDebug('Got resume command');
            syncState.TX_CHECK_SKIPPED_COUNT = 5;
            wsapi = null;
            initApi(serviceConfig);
            setTimeout(() => {
                wsapi.getBalance().then(() => {
                    logDebug(`Warming up: getBalance OK`);
                }).catch((err) => {
                    logDebug(`Warming up: getBalance FAILED, ${err.message}`);
                });
                workerState.PAUSED = false;
            }, 15000);

            process.send({
                type: 'blockUpdated',
                data: {
                    blockCount: -10,
                    knownBlockCount: -10,
                    displayBlockCount: -10,
                    displayKnownBlockCount: -10,
                    syncPercent: -10
                }
            });
            break;
        case 'stop':
            logDebug('Got stop command, halting all tasks and exit...');
            syncState.TX_SKIPPED_COUNT = 0;
            serviceConfig = wsapi = null;
            if (taskWorker === undefined || taskWorker === null) {
                try {
                    clearInterval(taskWorker);
                    process.exit(0);
                } catch (e) {
                    logDebug(`FAILED, ${e.message}`);
                    process.exit(1);
                }
            }
            break;
        default:
            break;
    }
});

process.on('uncaughtException', function (err) {
    logDebug(`worker uncaughtException: ${err.message}`);
    process.exit(1);
});

process.on('disconnect', () => function () {
    logDebug(`worker disconnected`);
    process.exit(1);
});