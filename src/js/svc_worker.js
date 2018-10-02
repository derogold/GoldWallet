const log = require('electron-log');
const svcRequest = require('./svc_request.js');


let DEBUG=false;
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = 'debug';
log.transports.file.level = 'debug';

const CHECK_INTERVAL = 8 * 1000;
var LAST_BLOCK_COUNT = 1;
var LAST_KNOWN_BLOCK_COUNT = 1;

var SERVICE_CFG = null; // { service_host: '127.0.0.1', service_port: '8070', service_password: 'xxx'};
var SAVE_COUNTER = 0;
var TX_LAST_INDEX = 1;
var TX_LAST_COUNT = 0;
var TX_CHECK_STARTED = false;
var STATE_CONNECTED = true;
var STATE_SAVING = false;

var taskWorker = null;

function logDebug(msg){
    if(!DEBUG) return;
    log.debug(`[svcworker] ${msg}`);
}

function checkBlockUpdate(){
    if(!SERVICE_CFG || STATE_SAVING) return;
    logDebug('START: checkBlockUpdate');
    let svc = new svcRequest(SERVICE_CFG);
    svc.getStatus().then((blockStatus) => {
        let lastConStatus = STATE_CONNECTED;
        let conFailed  = parseInt(blockStatus.knownBlockCount, 10) === 1;
        if(conFailed){
            logDebug('Known block count returned 1, mark connection as broken');
            if(lastConStatus !== conFailed){
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
            STATE_CONNECTED = false;
            return;
        }

        // we have good connection
        STATE_CONNECTED = true;

        let blockCount = parseInt(blockStatus.blockCount,10);
        let knownBlockCount = parseInt(blockStatus.knownBlockCount, 10);
        logDebug(`last bc: ${LAST_BLOCK_COUNT} | current lbc: ${blockCount}`);
        logDebug(`last kbc: ${LAST_KNOWN_BLOCK_COUNT} | current kbc: ${knownBlockCount}`);

        if(blockCount <= LAST_BLOCK_COUNT && knownBlockCount <= LAST_KNOWN_BLOCK_COUNT){
            logDebug(`SKIPPED: block update notify`);
            return;
        }

        logDebug('START: notify block update');

        let txcheck = (LAST_KNOWN_BLOCK_COUNT < knownBlockCount || LAST_BLOCK_COUNT < knownBlockCount);
        LAST_BLOCK_COUNT = blockCount;
        LAST_KNOWN_BLOCK_COUNT = knownBlockCount;

        // add any extras here, so renderer not doing too much things
        let dispKnownBlockCount = (knownBlockCount-1);
        let dispBlockCount = (blockCount > dispKnownBlockCount ? dispKnownBlockCount : blockCount);
        let syncPercent = ((dispBlockCount / dispKnownBlockCount) * 100);
        if(syncPercent <=0 ){
            syncPercent = 100;
        }else if(syncPercent >= 99){
            syncPercent = syncPercent.toFixed(3);
        }else{
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
        if(LAST_BLOCK_COUNT <= 1) return;

        // don't check tx if block count not updated
        if(!txcheck && TX_CHECK_STARTED){
            logDebug(`SKIPPED: tx check`);
            return;
        }

        checkTransactionsUpdate();

    }).catch((err) => {
        logDebug(`FAILED: checkBlockUpdate, ${err.message}`);
        return false;
    });
}

//var TX_CHECK_COUNTER = 0;
function checkTransactionsUpdate(){
    if(!SERVICE_CFG || STATE_SAVING) return;

    logDebug('START: checkTransactionsUpdate');
    let svc = new svcRequest(SERVICE_CFG);

    svc.getBalance().then((balance)=> {
            process.send({
                type: 'balanceUpdated',
                data: balance
            });

            if(LAST_BLOCK_COUNT > 1){
                let currentBLockCount = LAST_BLOCK_COUNT-1;
                let startIndex = (!TX_CHECK_STARTED ? 1 : TX_LAST_INDEX);
                let searchCount = currentBLockCount;
                let needCountMargin = false;
                let blockMargin = 10;
                if(TX_CHECK_STARTED){
                    searchCount = (currentBLockCount - TX_LAST_COUNT);
                    needCountMargin = true;
                }

                let startIndexWithMargin = (startIndex === 1 ? 1 : (startIndex-blockMargin));
                let searchCountWithMargin = needCountMargin ?  searchCount+blockMargin : searchCount;
                let trx_args = {
                    firstBlockIndex: startIndexWithMargin,
                    blockCount: searchCountWithMargin
                };

                logDebug(`START: getTransactions, args: ${JSON.stringify(trx_args)}`);
                
                svc.getTransactions( trx_args ).then((trx) => {
                    process.send({
                        type: 'transactionUpdated',
                        data: trx
                    });
                    return true;
                }).catch((err)=>{
                    logDebug(`FAILED svc.getTransaction, ${err.message}`);
                    return false;
                });
                TX_CHECK_STARTED = true;
                TX_LAST_INDEX = currentBLockCount;
                TX_LAST_COUNT = currentBLockCount;
            }
    }).catch((err)=> {
        logDebug(`FAILED: svc.getBalance failed: ${err.message}`);
        return false;
    });
}

function saveWallet(){
    if(!SERVICE_CFG) return;
    logDebug('Saving wallet..');
    STATE_SAVING = true;

    // check balance
    let svc = new svcRequest(SERVICE_CFG);
    svc.save().then(()=> {
        logDebug(`OK: wallet has been saved`);
        STATE_SAVING = false;
        return true;
    }).catch((err)=>{
        logDebug(`FAILED: svc.save failed, ${err.message}`);
        STATE_SAVING = false;
        return false;
    });
}

function workOnTasks(){
    taskWorker = setInterval(() => {
        logDebug("== TASK WORKER STARTED ==");
        checkBlockUpdate();
        if(SAVE_COUNTER > 8){
            saveWallet();
            SAVE_COUNTER = 0;
        }
        SAVE_COUNTER++;
    }, CHECK_INTERVAL);
}

// {type: 'blah', msg: 'any'}
process.on('message', (msg) => {
    let cmd = msg || '';
    cmd.type = msg.type || 'cfg';
    cmd.data = msg.data || null;

    switch (cmd.type) {
        case 'cfg':
            if(cmd.data){
                SERVICE_CFG = cmd.data;
                process.send({
                    type: 'serviceStatus',
                    data: 'OK'
                });
            }
            if(cmd.debug){
                DEBUG = true;
                logDebug('Running worker in debug mode');
            }
            break;
        case 'start':
            try { clearInterval(taskWorker);} catch (err) {}
            // initial block check;
            checkBlockUpdate();

            // initial check
            checkTransactionsUpdate(); // just to get balance

            // scheduled tasks
            logDebug(`Scheduled tasks will be start in 5s, recurring every: ${CHECK_INTERVAL/1000}s`);
            setTimeout(workOnTasks, 5000);
            break;
        case 'stop':
            if(taskWorker === undefined || taskWorker === null){
                try{
                    logDebug(`stopping worker`);
                    clearInterval(taskWorker);
                    process.exit(0);
                }catch(e){
                    logDebug(`FAILED: stopWorker, ${e.message}`);
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

process.on('disconnect', () => function(){
    logDebug(`worker disconnected`);
    process.exit(1);
});