const electron = require('electron');
const remote = electron.remote;
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});
const abook = new Store({
    name: 'AddressBook', 
    encryptionKey: ['79009fb00ca1b7130832a42d','e45142cf6c4b7f33','3fe6fba5'].join('')
});

const gutils = require('./gutils');
const brwin = remote.getCurrentWindow();

//const genQrcode = require('./svc_main').getQrDataUrl;



/* sync progress ui */
const syncDiv = document.getElementById('navbar-div-sync');
const syncText = document.getElementById('navbar-text-sync');
const syncCountText = document.getElementById('navbar-text-sync-count');
const syncSlash = document.getElementById('navbar-text-sync-slash');
const syncKnownText= document.getElementById('navbar-text-sync-known');
const syncPercent= document.getElementById('navbar-text-sync-percent');

const connInfoDiv = document.getElementById('conn-info');
const connAddrText = document.getElementById('status-node-addr');
const connFeeText = document.getElementById('status-node-fee');
const connWarnText = document.getElementById('status-node-warning');

// const titleWalletFileDiv = document.getElementById('tt-wallet');
// const titleBalanceDiv = document.getElementById('tt-balance');

function setWinTitle(title){
    let defaultTitle = remote.getGlobal('wsession').defaultTitle;
    let newTitle = defaultTitle;
    if(title){
        newTitle = `${defaultTitle} ${title}`;
    }
    brwin.setTitle(newTitle);
}

function updateSyncProgres(data){
    const iconSync = document.getElementById('navbar-icon-sync');
    let blockCount = data['blockCount'];
    let knownBlockCount = data['knownBlockCount'];

    // restore/reset
    if(knownBlockCount === -100){
        syncDiv.className = '';
        syncText.innerHTML = 'IDLE';
        //syncCountText.innerHTML = '';
        gutils.clearChild(syncCountText);
        //syncKnownText.innerHTML = '';
        gutils.clearChild(syncKnownText);
        //syncSlash.innerHTML = '';
        gutils.clearChild(syncSlash);
        //syncPercent.innerHTML = '';
        gutils.clearChild(syncPercent);
        
        iconSync.setAttribute('data-icon', 'pause-circle');
        iconSync.classList.remove('fa-spin');

        connInfoDiv.classList.remove('conn-warning');
        connInfoDiv.classList.add('hidden');
        connAddrText.innerHTML = 'N/A';
        connFeeText.innerHTML = 'N/A';
        //connWarnText.innerHTML = '';
        gutils.clearChild(connWarnText);
        //gutils.clearChild(titleWalletFileDiv);
        //gutils.clearChild(titleBalanceDiv);
        setWinTitle();
    }else if(knownBlockCount <=1){
        // not connected
        syncDiv.className = 'failed';
        syncText.innerHTML = 'NOT CONNECTED';
        //syncCountText.innerHTML = '';
        gutils.clearChild(syncCountText);
        //syncKnownText.innerHTML = '';
        gutils.clearChild(syncKnownText);
        //syncSlash.innerHTML = '';
        gutils.clearChild(syncSlash);
        //syncPercent.innerHTML = '';
        gutils.clearChild(syncPercent);

        iconSync.setAttribute('data-icon', 'times');
        iconSync.classList.remove('fa-spin');
        connInfoDiv.classList.remove('hidden');
        connInfoDiv.classList.add('conn-warning');
        connAddrText.innerHTML = '<span style="color:yellow;">N/A</span>';
        connFeeText.innerHTML = '<span style="color:yellow;">N/A</span>';
        connWarnText.innerHTML = '- Connection failed, try switching to another Node in settings page, close and reopen your wallet';
    }else{
        //document.getElementById('status-node-warning').innerHTML = '';
        gutils.clearChild(connWarnText);
        let dispKnownBlockCount = (knownBlockCount-1);
        let dispBlockCount = (blockCount > dispKnownBlockCount ? dispKnownBlockCount : blockCount);

        syncCountText.innerHTML = dispBlockCount;
        syncSlash.innerHTML = ' / ';
        syncKnownText.innerHTML = dispKnownBlockCount;

        remote.getGlobal('wsession').syncStarted = true;

        if(blockCount+1 >= knownBlockCount && knownBlockCount != 0) {
            syncDiv.classList = 'synced';
            syncText.innerHTML = 'SYNCED ';
            //syncPercent.innerHTML = '';
            gutils.clearChild(syncPercent);
            iconSync.setAttribute('data-icon', 'check');
            iconSync.classList.remove('fa-spin');
            remote.getGlobal('wsession').synchronized = true;
            remote.getGlobal('wsession').syncStarted = true;
            
        } else {
            syncDiv.className = 'syncing';
            syncText.innerHTML = 'SYNCING ';
            let synchedPercent = ((dispBlockCount / dispKnownBlockCount) * 100).toFixed(2);
            syncPercent.innerHTML =  `(${synchedPercent}%)`;
            iconSync.setAttribute('data-icon', 'sync');
            iconSync.classList.add('fa-spin');
            remote.getGlobal('wsession').syncStarted = true;
            remote.getGlobal('wsession').synchronized = false;
        }

        let nFee = remote.getGlobal('wsession').nodeFee;
        document.getElementById('conn-info').classList.remove('conn-warning');
        connAddrText.innerHTML = `${settings.get('daemon_host')}:${settings.get('daemon_port')}`;
        document.getElementById('status-node-fee').innerHTML = (nFee ? "TRTL " + nFee : '-');
    }
}


function updateBalance(data){
    const balanceAvailableField = document.querySelector('#balance-available > span');
    const balanceLockedField = document.querySelector('#balance-locked > span');
    if(!data || !data.availableBalance) return;
    if(data.availableBalance <= 0) return;

    let bUnlocked = (data.availableBalance / 100).toFixed(2);
    let bLocked = (data.lockedAmount / 100).toFixed(2);
    balanceAvailableField.innerHTML = bUnlocked;
    balanceLockedField.innerHTML = bLocked;
    let walletFile = require('path').basename(settings.get('recentWallet'));
    let wintitle = `(${walletFile}) - ${bUnlocked} TRTL`;
    setWinTitle(wintitle);
    //document.getElementById('tt-balance').innerHTML = "- TRTL " + bUnlocked;
}

var FIRST_TX_CHECK = true;
function updateTransactions(data){
    //const result = data.result;
    const blocks = data.items;
    const newTxLen = blocks.length;
    const currentTxLen = remote.getGlobal('wsession').txLen;

    if(!newTxLen || newTxLen <= currentTxLen) return;

    let txlist = [];
    Array.prototype.forEach.call(blocks, block => {
        Array.prototype.forEach.call(block.transactions, transaction => {
            if(transaction.amount !== 0){
                txlist.unshift(transaction);
            }
        });
    });

    if(!txlist.length) return;
    
    let oldLastHash = remote.getGlobal('wsession').txLastHash;
    let oldLastTimestamp = remote.getGlobal('wsession').txLastTimestamp;
    let latestTx = txlist[0];
    let newLastHash = latestTx.transactionHash;
    let newLastTimestamp = latestTx.timestamp;
    let newTxAmount = latestTx.amount;

    // store it
    remote.getGlobal('wsession').txLastHash = newLastHash;
    remote.getGlobal('wsession').txLastTimestamp = newLastTimestamp;
    remote.getGlobal('wsession').txList = txlist;
    remote.getGlobal('wsession').txLen = newTxLen;
    // date to compare
    let currentDate = new Date();
    currentDate = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()+1}-${currentDate.getUTCDate()}`
    let lastTxDate = new Date(newLastTimestamp*1000);
    lastTxDate = `${lastTxDate.getUTCFullYear()}-${lastTxDate.getUTCMonth()+1}-${lastTxDate.getUTCDate()}`
    // amount to check
    let theAmount = (newTxAmount/100);

    let notify = true;
    if(lastTxDate !== currentDate){
        notify = false;
    }else if(theAmount < 0){
        notify = false;
    }else if(oldLastHash === newLastHash){
        notify = false;
    }

    if(notify){
        let notiOptions = {
            'body': `Amount: ${(theAmount).toFixed(2)} TRTL<br>Hash: ${newLastHash.substring(24,-0)}...`,
            'icon': '../assets/walletshell_icon.png'
        };
        new Notification('Incoming Transfer', notiOptions);
    }
    document.getElementById('button-transactions-refresh').click();
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
    
    //dialog.innerHTML = htmlStr;
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
        //dialog.innerHTML = '';
        gutils.clearChild(dialog);
        const overviewBtn = document.getElementById('button-section-overview');
        const connectedNodeAddr = settings.get('daemon_host');
        const connectedNodePort = settings.get('daemon_port');
        document.getElementById('status-node-addr').innerHTML = `${connectedNodeAddr}:${connectedNodePort}`;
        document.getElementById('status-node-fee').innerHTML = `TRTL ${fee}`;
        overviewBtn.click();
        //dialog.removeEventListener('close');
    });
}

function updateQr(address){
    if(!address){
        document.getElementById('button-transactions-refresh').click();
        return;
    }

    let walletHash = gutils.b2sSum(address);
    remote.getGlobal('wsession').walletHash = walletHash;

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

function displayAddressBookEntry(event){
   let dialog = document.getElementById('ab-dialog');
   if(dialog.hasAttribute('open')) dialog.close();
   let tpl = `
        <div class="div-transactions-panel">
            <h4>Address Detail</h4>
            <div class="addressBookDetail">
                <div class="addressBookDetail-qr">
                    <img src="${this.dataset.qrcodeval}" />
                </div>
                <div class="addressBookDetail-data">
                    <dl>
                        <dt>Name:</dt>
                        <dd class="ctcl" title="click to copy">${this.dataset.nameval}</dd>
                        <dt>Wallet Address:</dt>
                        <dd class="ctcl" title="click to copy">${this.dataset.walletval}</dd>
                        <dt>Payment Id:</dt>
                        <dd class="ctcl" title="click to copy">${this.dataset.paymentidval ? this.dataset.paymentidval : '-'}</dd>
                    </dl>
                </div>
            </div>
        </div>
        <div class="div-panel-buttons">
                <button type="button" class="form-bt button-red" id="button-addressbook-panel-delete">Delete</button>
                <button data-addressid="${this.dataset.hash}" type="button" class="form-bt button-green" id="button-addressbook-panel-close">Close</button>
        </div>
   `;
   //dialog.innerHTML = tpl;
   gutils.innerHTML(dialog, tpl);
   // get new dialog
   dialog = document.getElementById('ab-dialog');
   dialog.showModal();
   document.getElementById('button-addressbook-panel-close').addEventListener('click', (event) => {
        let abdialog = document.getElementById('ab-dialog');
        abdialog.close();
        //abdialog.innerHTML = '';
        gutils.clearChild(abdialog);
    });

    let deleteBtn = document.getElementById('button-addressbook-panel-delete');
    deleteBtn.addEventListener('click', (event) => {
        let tardel = this.dataset.nameval;
        let tarhash = this.dataset.hash;
        if(!confirm(`Are you sure wan to delete ${tardel} from addres book?`)){
            return;
        }else{
            abook.delete(tarhash);
            let abdialog = document.getElementById('ab-dialog');
            abdialog.close();
            gutils.clearChild(abdialog);
            listAddressBook(true);
            if(!document.getElementById('datoaste')){
                iqwerty.toast.Toast("Address book entry was deleted.", {settings: {duration:1800}});
            }
        }
    });
}

gutils.liveEvent('.addressbook-item','click',displayAddressBookEntry);
function listAddressBook(force){
    force = force || false;
    //let currentLength = document.querySelectorAll('.addressbook-item').length;
    let currentLength = document.querySelectorAll('.addressbook-item:not([data-hash="fake-hash"])').length
    let abookLength =abook.size;
    let perPage = 9;

    if(currentLength >= abookLength  && !force)  return;

    let listOpts = {
        valueNames: [
            {data: ['hash', 'nameval','walletval','paymentidval','qrcodeval']},
            'addressName','addressWallet','addressPaymentId'
        ],
        indexAsync: true
    };

    if(abookLength > perPage){
        listOpts.page = perPage;
        listOpts.pagination = true; 
    }

    const addressList = new List('addressbooks', listOpts);
    addressList.clear();
    Object.keys(abook.get()).forEach((key) => {
        let et = abook.get(key);
        addressList.add({
            hash: key,
            addressName: et.name,
            addressWallet: et.address,
            addressPaymentId: et.paymentId || '-',
            nameval: et.name,
            walletval: et.address,
            paymentidval: et.paymentId || '-',
            qrcodeval: et.qrCode || ''
        });
    });

    addressList.remove('hash', 'fake-hash');
}

function resetFormState(initiator){
    const allFormInputs = document.querySelectorAll('.section input,.section textarea');   
    Array.from(allFormInputs).forEach((el) => {
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
    });

    const connInfo = document.getElementById('conn-info');
    const settingsBackBtn = document.getElementById('button-settings-back');
    if(remote.getGlobal('wsession').serviceReady){
        connInfo.classList.remove('hidden');
        settingsBackBtn.dataset.section = 'section-welcome';
    }else{
        connInfo.classList.add('hidden');
        settingsBackBtn.dataset.section = 'section-overview';
    }

    // address book
    if(initiator.trim() === 'button-addressbook-back' || initiator.trim() === 'button-section-addressbook'){
        listAddressBook();
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
            if(parseInt(msg.data,10) >= 1) showFeeWarning(msg.data);
            break;
        case 'addressUpdated':
            updateQr(msg.data);
            break;
        case 'sectionChanged':
            resetFormState(msg.data);
            break;
        default:
            console.log('invalid command received by ui', msg);
            break;
    }
}

module.exports = {updateUiState};