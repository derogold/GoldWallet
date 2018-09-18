const svcRequest = require('./svc_request.js');

//var LAST_KNOW_BALANCE = 0.00;
const CHECK_INTERVAL = 5 * 1000;
var BLOCK_COUNT_LOCAL = 1;
var BLOCK_COUNT_NETWORK = 1;
var LAST_BLOCK_COUNT_LOCAL = 0;

var SERVICE_CFG = null; // { service_host: '127.0.0.1', service_port: '8070', service_password: 'xxx'};
var SAVE_COUNTER = 0;
var LOGPREFIX = '[SVCWORKER]:';

var TX_LAST_INDEX = 1;
var TX_LAST_COUNT = 0;
var TX_CHECK_STARTED = false;

var taskWorker = null;

// every 5 secs
function checkBlockUpdate(){
    if(!SERVICE_CFG) return;
    let svc = new svcRequest(SERVICE_CFG);
    svc.getStatus().then((blockStatus) => {
        let blockCount = parseInt(blockStatus.blockCount,10);
        let newKnownBlockCount = parseInt(blockStatus.knownBlockCount, 10);

        if(blockCount <= BLOCK_COUNT_LOCAL || newKnownBlockCount <= BLOCK_COUNT_NETWORK){
            BLOCK_COUNT_LOCAL = blockCount;
            BLOCK_COUNT_NETWORK = newKnownBlockCount;
            return;
        }

        BLOCK_COUNT_LOCAL = blockCount;
        BLOCK_COUNT_NETWORK = newKnownBlockCount;
        // add any extras here, so renderer not doing too much thing
        let dispKnownBlockCount = (newKnownBlockCount-1);

        let dispBlockCount = (blockCount > dispKnownBlockCount ? dispKnownBlockCount : blockCount);

        let syncPercent = ((dispBlockCount / dispKnownBlockCount) * 100);
        if(syncPercent >= 99){
            syncPercent = syncPercent.toFixed(3);
        }else{
            syncPercent = syncPercent.toFixed(2);
        }

        blockStatus.displayBlockCount = dispBlockCount;
        blockStatus.displayKnownBlockCount = dispKnownBlockCount;
        
        process.send({
            type: 'blockUpdated',
            data: blockStatus
        });

        // don't check if we can't get any block
        if(BLOCK_COUNT_LOCAL <= 1) return;

        // don't check if block count not updated
        if(LAST_BLOCK_COUNT_LOCAL === BLOCK_COUNT_LOCAL && TX_CHECK_STARTED) return;

        // only check if block count >= 4;
        let newBlocks = (BLOCK_COUNT_LOCAL - LAST_BLOCK_COUNT_LOCAL);
        if( newBlocks >= 4 ){
            checkTransactionsUpdate();
            LAST_BLOCK_COUNT_LOCAL = BLOCK_COUNT_LOCAL;
        }
    }).catch((err) => {
        return false;
    });
}

//var TX_CHECK_COUNTER = 0;
function checkTransactionsUpdate(){
    // no config or not running
    if(!SERVICE_CFG) return;
    // check balance
    let svc = new svcRequest(SERVICE_CFG);
    svc.getBalance().then((balance)=> {
        // if(parseFloat(balance.availableBalance) !== LAST_KNOW_BALANCE){
            LAST_KNOW_BALANCE = balance.availableBalance;
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
                    console.log(`${LOGPREFIX} failed to get transaction`,err);
                    return false;
                });
                TX_CHECK_STARTED = true;
                TX_LAST_INDEX = currentBLockCount;
                TX_LAST_COUNT = currentBLockCount;
            }
    }).catch((err)=>{
        console.log(`${LOGPREFIX} Failed to checkTransactionsUpdate`, err);
        return false;
    });
}

function saveWallet(){
    if(!SERVICE_CFG) return;
    // check balance
    let svc = new svcRequest(SERVICE_CFG);
    svc.save().then(()=> {
        console.log(`${LOGPREFIX} wallet has been saved`);
        return true;
    }).catch((err)=>{
        console.log(`${LOGPREFIX} Failed: saving error`, err);
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
            break;
        case 'start':
            try { clearInterval(taskWorker);} catch (err) {}
            // initial block check;
            checkBlockUpdate();

            // initial check
            //checkTransactionsUpdate(); // just to get balance

            // scheduled tasks
            setTimeout(workOnTasks, 5000);
            break;
        case 'stop':
            if(taskWorker === undefined || taskWorker === null){
                try{
                    console.log(`${LOGPREFIX} stopping request, clearing tasks`);
                    clearInterval(taskWorker);
                    process.exit(0);
                }catch(e){
                    console.log('Failed to stop worker');
                }
            }
            break;
        default:
            break;
    }
});

process.on('uncaughtException', function (err) {
    console.log(LOGPREFIX, err);
    process.exit(1);
});

process.on('disconnect', () => function(err){
    console.log(LOGPREFIX, 'disconnected');
    process.exit(1);
});