const log = require('electron-log');
const svcRequest = require('./svc_request.js');

DEBUG=false;
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = 'debug';
log.transports.file.level = 'debug';

const CHECK_INTERVAL = 5 * 1000;
var BLOCK_COUNT_LOCAL = 1;
var BLOCK_COUNT_NETWORK = 1;
var LAST_BLOCK_COUNT_LOCAL = 0;

var SERVICE_CFG = null; // { service_host: '127.0.0.1', service_port: '8070', service_password: 'xxx'};
var SAVE_COUNTER = 0;
var TX_LAST_INDEX = 1;
var TX_LAST_COUNT = 0;
var TX_CHECK_STARTED = false;

var taskWorker = null;

function logDebug(msg){
    if(!DEBUG) return;
    log.debug(msg);
}

// every 5 secs
function checkBlockUpdate(){
    if(!SERVICE_CFG) return;
    let svc = new svcRequest(SERVICE_CFG);
    svc.getStatus().then((blockStatus) => {
        let blockCount = parseInt(blockStatus.blockCount,10);
        let knownBlockCount = parseInt(blockStatus.knownBlockCount, 10);

        if(blockCount <= BLOCK_COUNT_LOCAL || knownBlockCount <= BLOCK_COUNT_NETWORK){
            logDebug('blockCout unchanged OR Invalid');
            return;
        }

        BLOCK_COUNT_LOCAL = blockCount;
        BLOCK_COUNT_NETWORK = knownBlockCount;
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
        if(BLOCK_COUNT_LOCAL <= 1) return;
        // don't check if block count not updated
        if(LAST_BLOCK_COUNT_LOCAL === BLOCK_COUNT_LOCAL && TX_CHECK_STARTED) return;
        
        checkTransactionsUpdate();
        LAST_BLOCK_COUNT_LOCAL = BLOCK_COUNT_LOCAL;

    }).catch((err) => {
        logDebug(`checkBlockUpdate failed: ${err.message}`);
        return false;
    });
}

//var TX_CHECK_COUNTER = 0;
function checkTransactionsUpdate(){
    if(!SERVICE_CFG) return;

    let svc = new svcRequest(SERVICE_CFG);

    svc.getBalance().then((balance)=> {
            process.send({
                type: 'balanceUpdated',
                data: balance
            });

            if(BLOCK_COUNT_LOCAL > 1){
                let currentBLockCount = BLOCK_COUNT_LOCAL-1;
                let startIndex = (!TX_CHECK_STARTED ? 1 : TX_LAST_INDEX);
                let searchCount = currentBLockCount;
                let needCountMargin = false;
                let blockMargin = 10;
                if(TX_CHECK_STARTED){
                    searchCount = (currentBLockCount - TX_LAST_COUNT);
                    needCountMargin = true;
                }

                let startIndexWithMargin = (startIndex == 1 ? 1 : (startIndex-blockMargin));
                let searchCountWithMargin = needCountMargin ?  searchCount+blockMargin : searchCount;
                let trx_args = {
                    firstBlockIndex: startIndexWithMargin,
                    blockCount: searchCountWithMargin
                };
                
                svc.getTransactions( trx_args ).then((trx) => {
                    process.send({
                        type: 'transactionUpdated',
                        data: trx
                    });
                    return true;
                }).catch((err)=>{
                    logDebug(`svc.getTransaction failed: ${err.message}`);
                    return false;
                });
                TX_CHECK_STARTED = true;
                TX_LAST_INDEX = currentBLockCount;
                TX_LAST_COUNT = currentBLockCount;
            }
    }).catch((err)=>{
        logDebug(`svc.getBalance failed: ${err.message}`);
        return false;
    });
}

function saveWallet(){
    if(!SERVICE_CFG) return;
    // check balance
    let svc = new svcRequest(SERVICE_CFG);
    svc.save().then(()=> {
        logDebug(`wallet has been saved`);
        return true;
    }).catch((err)=>{
        logDebug(`svc.save failed: ${err.message}`);
        return false;
    });
}

function workOnTasks(){
    taskWorker = setInterval(() => {
        checkBlockUpdate();
        if(SAVE_COUNTER > 60){
            saveWallet();
            SAVE_COUNTER = 0;
        }
        SAVE_COUNTER++
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
            setTimeout(workOnTasks, 5000);
            break;
        case 'stop':
            if(taskWorker === undefined || taskWorker === null){
                try{
                    logDebug(`stopping worker`);
                    clearInterval(taskWorker);
                    process.exit(0);
                }catch(e){
                    logDebug(`failed to stop worker: ${e.message}`);
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

process.on('disconnect', () => function(err){
    logDebug(`worker disconnected`);
    process.exit(1);
});