const {webFrame, remote} = require('electron');
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});
const gutils = require('./gutils');
const brwin = remote.getCurrentWindow();
const gSession = require('./gsessions');
const wlsession = new gSession();

/* sync progress ui */
const syncDiv = document.getElementById('navbar-div-sync');
const syncInfoBar = document.getElementById('navbar-text-sync');
const connInfoDiv = document.getElementById('conn-info');

/* web frame cache clearing interval */
const WFCLEAR_INTERVAL = 5;
let WFCLEAR_TICK = 0;

function setWinTitle(title){
    let defaultTitle = wlsession.get('defaultTitle');
    let newTitle = defaultTitle;
    if(title){
        newTitle = `${defaultTitle} ${title}`;
    }
    brwin.setTitle(newTitle);
}

function triggerTxRefresh(){
    const txUpdateInputFlag = document.getElementById('transaction-updated');
    txUpdateInputFlag.value = 1;
    txUpdateInputFlag.dispatchEvent(new Event('change'));
}

function updateSyncProgres(data){
    const iconSync = document.getElementById('navbar-icon-sync');
    let blockCount = data['displayBlockCount'];
    let knownBlockCount = data['displayKnownBlockCount'];
    let blockSyncPercent = data['syncPercent'];
    let statusText = '';

    // restore/reset
    if(knownBlockCount === -100){
        // sync status text
        statusText = 'IDLE';
        syncInfoBar.innerHTML = statusText;
        // sync info bar class
        syncDiv.className = '';
        // sync status icon
        iconSync.setAttribute('data-icon', 'pause-circle');
        iconSync.classList.remove('fa-spin');
        // connection status
        connInfoDiv.classList.remove('conn-warning');
        connInfoDiv.classList.add('hidden');
        connInfoDiv.textContent = '';
        
        // sync sess flags
        wlsession.set('syncStarted', false);
        wlsession.set('synchronized', false);
        // reset wintitle
        setWinTitle();
        // no node connected
        wlsession.set('connectedNode', '');
    }else if(knownBlockCount === -200){
        // not connected
        // status info bar class
        syncDiv.className = 'failed';
        // sync status text
        statusText = 'NOT CONNECTED';
        syncInfoBar.textContent = statusText;
        //sync status icon
        iconSync.setAttribute('data-icon', 'times');
        iconSync.classList.remove('fa-spin');
        // connection status
        connInfoDiv.classList.remove('hidden');
        connInfoDiv.classList.add('conn-warning');
        connInfoDiv.innerHTML = 'Connection failed, try switching to another Node in settings page, close and reopen your wallet';
        wlsession.set('connectedNode', '');
    }else{
        // sync sess flags
        wlsession.set('syncStarted', true);
        statusText = `${blockCount}/${knownBlockCount}` ;
        if(blockCount+1 >= knownBlockCount && knownBlockCount != 0) {
            // info bar class
            syncDiv.classList = 'synced';
            // status text
            statusText = `SYNCED ${statusText}`
            syncInfoBar.textContent = statusText;
            // status icon 
            iconSync.setAttribute('data-icon', 'check');
            iconSync.classList.remove('fa-spin');
            // sync status sess flag
            wlsession.set('synchronized', true);
         } else {
             // info bar class
            syncDiv.className = 'syncing';
            // status text
            statusText = `SYNCING ${statusText} (${blockSyncPercent}%)`;
            syncInfoBar.textContent = statusText;
            // status icon
            iconSync.setAttribute('data-icon', 'sync');
            iconSync.classList.add('fa-spin');
            // sync status sess flag
            wlsession.set('synchronized', false);
        }
        
        let connStatusText = `Connected to: <strong>${wlsession.get('connectedNode')}</strong>`;
        let connNodeFee = parseInt(wlsession.get('nodeFee'), 10);
        if(connNodeFee >=1 ){
            connStatusText += ` | Node fee: <strong>${connNodeFee} TRTL</strong>`;
        }
        connInfoDiv.classList.remove('conn-warning');
        connInfoDiv.classList.remove('hidden');
        connInfoDiv.innerHTML = connStatusText;
    }

    if(WFCLEAR_TICK === 0 || WFCLEAR_TICK === WFCLEAR_INTERVAL){
        webFrame.clearCache();
        WFCLEAR_TICK = 0;
    }
    WFCLEAR_TICK++;
}

function updateBalance(data){
    const balanceAvailableField = document.querySelector('#balance-available > span');
    const balanceLockedField = document.querySelector('#balance-locked > span');
    const maxSendFormHelp = document.getElementById('sendFormHelp');
    const sendMaxAmount = document.getElementById('sendMaxAmount');
    let inputSendAmountField = document.getElementById('input-send-amount');

    if(!data) return;
    let availableBalance = parseFloat(data.availableBalance) || 0;
    if(availableBalance <= 0){
        inputSendAmountField.setAttribute('max','1.00');
        maxSendFormHelp.innerHTML = "You don't have any funds to be sent.";
        sendMaxAmount.dataset.maxsend = 0;
        sendMaxAmount.classList.add('hidden');
        wlsession.set('walletUnlockedBalance', 0);
        wlsession.set('walletLockedBalance', 0);
        if(availableBalance < 0) return;
    }

    let bUnlocked = (availableBalance / 100).toFixed(2);
    let bLocked = (data.lockedAmount / 100).toFixed(2);
    balanceAvailableField.innerHTML = bUnlocked;
    balanceLockedField.innerHTML = bLocked;
    wlsession.set('walletUnlockedBalance', bUnlocked);
    wlsession.set('walletLockedBalance', bLocked);
    let walletFile = require('path').basename(settings.get('recentWallet'));
    let wintitle = `(${walletFile}) - ${bUnlocked} TRTL`;
    setWinTitle(wintitle);
    
    if(availableBalance > 0){
        let maxSend = (bUnlocked - (wlsession.get('nodeFee')+0.10)).toFixed(2);
        inputSendAmountField.setAttribute('max',maxSend);
        maxSendFormHelp.innerHTML = `Max. amount is ${maxSend}`;
        sendMaxAmount.dataset.maxsend = maxSend;
        sendMaxAmount.classList.remove('hidden');
    }
    
}

function updateTransactions(result){
    const blockItems = result.items;
    if(!blockItems.length) return;
    let txlistExisting = wlsession.get('txList');
    let txListNew = [];

    Array.from(blockItems).forEach((block) => {
        block.transactions.map((tx, index) => {
            if(tx.amount !== 0 && !gutils.objInArray(txlistExisting, tx, 'transactionHash')){
                tx.amount = (tx.amount/100).toFixed(2);
                tx.timeStr = tx.timeStr = new Date(tx.timestamp * 1000).toDateString();
                tx.fee = (tx.fee/100).toFixed(2);
                tx.paymentId = tx.paymentId.length ? tx.paymentId : '-';
                tx.txType = (tx.amount > 0 ? 'in' : 'out');
                tx.rawAmount = tx.amount;
                tx.rawFee = tx.fee;
                tx.rawPaymentId = tx.paymentId;
                tx.rawHash = tx.transactionHash;
                txListNew.unshift(tx);
            }
        });
    });

    if(!txListNew.length) return;
    let latestTx = txListNew[0];
    let newLastHash = latestTx.transactionHash;
    let newLastTimestamp = latestTx.timestamp;
    let newTxAmount = latestTx.amount;

    // store it
    wlsession.set('txLastHash',newLastHash);
    wlsession.set('txLastTimestamp', newLastTimestamp);
    let txList = txListNew.concat(txlistExisting);
    wlsession.set('txList', txList);
    wlsession.set('txLen', txList.length);
    wlsession.set('txNew', txListNew);

    // date to compare
    let currentDate = new Date();
    currentDate = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()+1}-${currentDate.getUTCDate()}`
    let lastTxDate = new Date(newLastTimestamp*1000);
    lastTxDate = `${lastTxDate.getUTCFullYear()}-${lastTxDate.getUTCMonth()+1}-${lastTxDate.getUTCDate()}`

    // amount to check
    let rememberedLastHash = settings.get('last_notification', '');
    let notify = true;

    if(lastTxDate !== currentDate){
        notify = false;
    }else if(newTxAmount < 0){
        notify = false;
    }else if(rememberedLastHash === newLastHash){
        notify = false;
    }

    triggerTxRefresh();
    if(notify){
        settings.set('last_notification', newLastHash);
        let notiOptions = {
            'body': `Amount: ${(newTxAmount)} TRTL\nHash: ${newLastHash.substring(24,-0)}...`,
            'icon': '../assets/walletshell_icon.png'
        };
        let itNotification = new Notification('Incoming Transfer', notiOptions);
        itNotification.onclick = (event) => {
            event.preventDefault();
            let  txNotifyFiled = document.getElementById('transaction-notify');
            txNotifyFiled.value = 1;
            txNotifyFiled.dispatchEvent(new Event('change'));
            if(!brwin.isVisible()) brwin.show();
            if(brwin.isMinimized()) brwin.restore();
            if(!brwin.isFocused()) brwin.focus();
        }
    }
}

function showFeeWarning(fee){
    let dialog = document.getElementById('main-dialog');
    if(dialog.hasAttribute('open')) return;

    dialog.classList.add('dialog-warning');
    fee = fee || 0;
    if(fee <=0) return;

    let htmlStr = `
        <h5>Fee Warning (${settings.get('daemon_host')}:${settings.get('daemon_port')})</h5>
        <p>You are connected to a public node that charges a fee to send transactions.<p>
        <p>The fee for sending transactions is: <strong>${fee} TRTL </strong>.<br>
            If you don't want to pay the node fee, please close your wallet, and update your settings to use different public node or your own node.
        </p>
        <p style="text-align:center;margin-top: 1.25rem;"><button  type="button" class="form-bt button-green" id="dialog-end">OK, I Understand</button></p>
    `;

    gutils.innerHTML(dialog, htmlStr);
    let dialogEnd = document.getElementById('dialog-end');
    dialogEnd.addEventListener('click', (event) => {
        try{
            dialog.classList.remove('dialog-warning');
            document.getElementById('main-dialog').close();
        }catch(e){}
    });
    dialog = document.getElementById('main-dialog');
    dialog.showModal();
    dialog.addEventListener('close', function(){
        gutils.clearChild(dialog);
    });
}

function updateQr(address){
    if(!address){
        triggerTxRefresh();
        return;
    }

    let walletHash = gutils.b2sSum(address);
    wlsession.set('walletHash', walletHash);
    
    let oldImg = document.getElementById('qr-gen-img');
    if(oldImg) oldImg.remove();

    let qr_base64 = gutils.genQrDataUrl(address);
    if(qr_base64.length){
        let qrBox = document.getElementById('div-w-qr');
        let qrImg = document.createElement("img");
        qrImg.setAttribute('id', 'qr-gen-img');
        qrImg.setAttribute('src', qr_base64);
        qrBox.prepend(qrImg);
        document.getElementById('scan-qr-help').classList.remove('hidden');
    }else{
        document.getElementById('scan-qr-help').classList.add('hidden');
    }
}

function resetFormState(initiator){
    const allFormInputs = document.querySelectorAll('.section input,.section textarea');
    if(!allFormInputs) return;

    for(var i=0;i<allFormInputs.length;i++){
        let el = allFormInputs[i];
        if(el.dataset.initial){
            if(!el.dataset.noclear){
                el.value = settings.has(el.dataset.initial) ? settings.get(el.dataset.initial) : '';
                if(el.getAttribute('type') === 'checkbox'){
                    el.checked = settings.get(el.dataset.initial);
                }
            }
        }else{
            if(!el.dataset.noclear) el.value = '';
        }
    }

    const connInfo = document.getElementById('conn-info');
    const settingsBackBtn = document.getElementById('button-settings-back');
    if(wlsession.get('serviceReady')){
        connInfo.classList.remove('hidden');
        settingsBackBtn.dataset.section = 'section-welcome';
    }else{
        connInfo.classList.add('hidden');
        settingsBackBtn.dataset.section = 'section-overview';
    }
}

// update ui state, push from svc_main
function updateUiState(msg){
    // do something with msg
    switch (msg.type) {
        case 'blockUpdated':
            updateSyncProgres(msg.data);
            break;
        case 'balanceUpdated':
            updateBalance(msg.data);
            break;
        case 'transactionUpdated':
            updateTransactions(msg.data);
            break;
        case 'nodeFeeUpdated':
            let nodeFee = parseInt(msg.data,10);
            if(nodeFee >= 1){
                showFeeWarning(msg.data);
            }
            break;
        case 'addressUpdated':
            updateQr(msg.data);
            break;
        case 'sectionChanged':
            if(msg.data) resetFormState(msg.data);
            break;
        default:
            console.log('invalid command received by ui', msg);
            break;
    }
}
module.exports = {updateUiState};