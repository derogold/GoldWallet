const {app, BrowserWindow, dialog, Tray, Menu} = require('electron');
const path = require('path');
const url = require('url');
//const ipc = require('electron').ipcMain;
const https = require('https');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});

const platform = os.platform;
const defaultFallbackNodes = [
    '127.0.0.1:11898',
    'public.turtlenode.io:11898',
    'public.turtlenode.net:11898',
];
const defaultTitle = 'TurtleCoin Wallet';
const isDebug = (process.argv[1] === 'debug' || process.argv[2] === 'debug');
const publicNodesUrl = 'https://raw.githubusercontent.com/turtlecoin/turtlecoin-nodes-json/master/turtlecoin-nodes.json';

const binFilename =  (platform === 'win32' ? 'turtle-service.exe' : 'turtle-service' );
const defaultServiceBin = path.join(process.resourcesPath, binFilename);
console.log(`default turtle-service bin: ${defaultServiceBin}`);

// default settings
var DEFAULT_SETTINGS = {
    service_bin: defaultServiceBin,
    service_host: '127.0.0.1',
    service_port: 8070,
    service_password: crypto.randomBytes(32).toString('hex'),
    daemon_host: '127.0.0.1',
    daemon_port: 11898,
    pubnodes_date: null,
    pubnodes_data: defaultFallbackNodes,
    pubnodes_custom: [],
    tray_minimize: false,
    tray_close: false
}

let win;
app.prompExit = true;
app.needToExit = false;

function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({
        title: defaultTitle,
        icon: path.join(__dirname,'src/assets/walletshell_icon.png'),
        frame: true,//frame: false,
        width: 800,
        height: 680,
        minWidth: 800,
        minHeight: 680,
        show: false,
        backgroundColor: '#02853e',
    });

    const tray = new Tray(path.join(__dirname,'src/assets/trtl_tray.png'));
    tray.setTitle(defaultTitle);
    tray.setToolTip('Slow and steady wins the race!');
    let contextMenu = Menu.buildFromTemplate([
        { label: 'Minimize to tray', click: () => { win.hide(); }},
        { label: 'Quit', click: ()=> {
                // if(!win.isVisible()) win.show();
                // if(win.isMinimized()) win.restore();
                // win.focus();
                app.needToExit = true;
                win.close();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show();
    });

    win.on('show', () => {
        tray.setHighlightMode('always');
        contextMenu = Menu.buildFromTemplate([
            { label: 'Minimize to tray', click: () => { win.hide();} },
            { label: 'Quit', click: ()=> {
                    // if(!win.isVisible()) win.show();
                    // if(win.isMinimized()) win.restore();
                    // win.focus();
                    app.needToExit = true;
                    win.close();
                }
            }
        ]);
        tray.setContextMenu(contextMenu);
    });

    win.on('hide', () => {
        tray.setHighlightMode('never');
        contextMenu = Menu.buildFromTemplate([
                { label: 'Restore', click: () => { win.show();} },
                { label: 'Quit', click: ()=> {
                    // if(!win.isVisible()) win.show();
                    // if(win.isMinimized()) win.restore();
                    // win.focus();
                    app.needToExit = true;
                    win.close();
                }
            }
        ]);
        tray.setContextMenu(contextMenu);
    });

    win.on('minimize', (event) => {
        if(settings.get('tray_minimize')){
            event.preventDefault();
            win.hide();
        }
    });

    //load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/html/index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // open devtools
    if(isDebug ) win.webContents.openDevTools();

    // show windosw
    win.once('ready-to-show', () => {
        win.show();
        win.setTitle(defaultTitle);
    })

    win.on('close', (e) => {
        if(settings.get('tray_close') && !app.needToExit){
            e.preventDefault();
            win.hide();
        }else if(app.prompExit){
            e.preventDefault();
            let msg = 'Are you sure?';
            if(wsession.loadedWalletAddress !== ''){
                msg = 'Close your wallet and exit?';
            }
            dialog.showMessageBox({
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Confirm',
                message: msg
            }, function (response) {
                if (response === 0) {
                    app.prompExit = false;
                    win.webContents.send('cleanup','Clean it up, Dad!');
                }else{
                    app.prompExit = true;
                    app.needToExit = false;
                }
            });
        }
    });
    
    win.on('closed', () => {
        win = null;
    });
    win.setMenu(null);

    // misc handler
    win.webContents.on('crashed', (event, killed) => { 
        if(isDebug) console.log('webcontent was crashed', event, killed);
    });

    win.on('unresponsive', (even) => {
        if(isDebug) console.log('unresponsive!');
    });
}

function storeNodeList(pnodes){
    pnodes = pnodes || settings.get('pubnodes_data');
    if( pnodes.hasOwnProperty('nodes')){
        global.wsession.nodeChoices = ['127.0.0.1:11898'];
        pnodes.nodes.forEach(element => {
            let item = `${element.url}:${element.port}`;
            global.wsession.nodeChoices.push(item);
        });
    }
    settings.set('pubnodes_data', global.wsession.nodeChoices);
}

function doNodeListUpdate(){
    https.get(publicNodesUrl, (res) => {
        var result = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
            result += chunk;
        });

        res.on('end', () => {
            try{
                var pnodes = JSON.parse(result);
                let today = new Date();
                storeNodeList(pnodes);
                if(isDebug) console.log('nodelist has been updated');
                let mo = (today.getMonth()+1);
                settings.set('pubnodes_date', `${today.getFullYear()}-${mo}-${today.getDate()}`);
            }catch(e){
                if(isDebug) console.log('failed to parse json data', e);
                if(isDebug) console.log('type of input', typeof d);
                if(isDebug) console.log(JSON.stringify(d));
                storeNodeList();
            }
        });
    }).on('error', (e) => { 
        console.error(e);
    });
}

function initSettings(){
    Object.keys(DEFAULT_SETTINGS).forEach((k) => {
        if(!settings.has(k) || settings.get(k) === null){
            settings.set(k, DEFAULT_SETTINGS[k]);
        }
    });
}


const silock = app.requestSingleInstanceLock()
app.on('second-instance', (commandLine, workingDirectory) => {
    if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
    }
});
if (!silock) app.quit();

app.on('ready', () => {
    initSettings();    

    global.wsession = {
        loadedWalletAddress: '',
        walletHash: '',
        synchronized: false,
        syncStarted: false,
        serviceReady: false,
        txList: [],
        txLen: 0,
        txLastHash: '',
        txLastTimestamp: '',
        tmpPath: app.getPath('temp'),
        dataPath: app.getPath('userData'),
        nodeFee: null,
        nodeChoices: settings.get('pubnodes_data'),
        servicePath: settings.get('service_bin'),
        configUpdated: false,
        uiStateChanged: false,
        defaultTitle: defaultTitle,
        debug: isDebug
    };

    if(isDebug) console.log('Running in debug mode');

    let today = new Date();
    let last_checked = new Date(settings.get('pubnodes_date'));
    diff_d = parseInt((today-last_checked)/(1000*60*60*24),10);
    if(diff_d >= 1){
        console.log('Performing daily node list update.');
        doNodeListUpdate();
    }else{
        console.log('Node list is up to date.');
        storeNodeList(false); // from local cache
    }

    createWindow();
});

// app.on('before-quit', () => {
//   connection.terminateWallet();
// })

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) createWindow();
});

process.on('uncaughtException', function (err) { 
    if(isDebug) console.log(err);
    process.exit(1);
});

process.on('beforeExit', (code) => {
    if(isDebug) console.log(`beforeExit code: ${code}`);
});

process.on('exit', (code) => {
    if(isDebug) console.log(`exit with code: ${code}`);
});

process.on('warning', (warning) => {
    if(isDebug){
        console.warn(warning.name);
        console.warn(warning.message);
        console.warn(warning.code);
        console.warn(warning.stack);
        console.warn(warning.detail);
    }
});

