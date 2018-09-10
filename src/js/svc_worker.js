const svcRequest = require('./svc_request.js');
const util = require('util');

const CHECK_INTERVAL = 5 * 1000; 

//var LAST_KNOW_BALANCE = 0.00;
var BLOCK_COUNT_LOCAL = 1;
var BLOCK_COUNT_NETWORK = 1;
var SERVICE_CFG = null; // { service_host: '127.0.0.1', service_port: '8070', service_password: 'xxx'};
var TASK_COUNTER = 0;
var SAVE_COUNTER = 0;
var LOGPREFIX = '[SVCWORKER]:';

var taskWorker = null;

// every 5 secs
function checkBlockUpdate(){
    if(!SERVICE_CFG) return;
    let svc = new svcRequest(SERVICE_CFG);
    svc.getStatus().then((blockStatus) => {
        if( parseInt(blockStatus.blockCount,10) !== BLOCK_COUNT_LOCAL
            || parseInt(blockStatus.knowBlockCount, 10) !== BLOCK_COUNT_NETWORK
        ){
            BLOCK_COUNT_LOCAL = parseInt(blockStatus.blockCount,10);
            BLOCK_COUNT_NETWORK = parseInt(blockStatus.knowBlockCount,10);
            process.send({
                type: 'blockUpdated',
                data: blockStatus
            });
        }
    }).catch((err) => {
        //console.log(`${LOGPREFIX} failed: checkBlockUpdate`, err);
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
            // also update transaction
            let trx_args = {blockCount: BLOCK_COUNT_LOCAL, firstBlockIndex: 1};
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
            
        // }else{
        //     return true;
        // }
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
        if(TASK_COUNTER > 3){
            checkTransactionsUpdate();
            TASK_COUNTER = 0;
        }
        TASK_COUNTER++;

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
            // initial check
            checkTransactionsUpdate();
            checkBlockUpdate();
            // scheduled tasks
            setTimeout(workOnTasks, 5000);
            
            break;
        case 'stop':
            if(!util.isNullOrUndefined(taskWorker)){
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