const {app, BrowserWindow, dialog, Tray, Menu, NativeImage} = require('electron');
const path = require('path');
const url = require('url');
const https = require('https');
const platform = require('os').platform();
const crypto = require('crypto');
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});

const IS_DEBUG = (process.argv[1] === 'debug' || process.argv[2] === 'debug');
const SERVICE_FILENAME =  (platform === 'win32' ? 'turtle-service.exe' : 'turtle-service' );
const DEFAULT_SERVICE_BIN = path.join(process.resourcesPath, SERVICE_FILENAME);
const DEFAULT_TITLE = 'TurtleCoin Wallet';
const PUBLIC_NODES_URL = 'https://raw.githubusercontent.com/turtlecoin/turtlecoin-nodes-json/master/turtlecoin-nodes.json';
const FALLBACK_NODES = [
    'public.turtlenode.io:11898',
    'public.turtlenode.net:11898',
];
const DEFAULT_SETTINGS = {
    service_bin: DEFAULT_SERVICE_BIN,
    service_host: '127.0.0.1',
    service_port: 8070,
    service_password: crypto.randomBytes(32).toString('hex'),
    daemon_host: '127.0.0.1',
    daemon_port: 11898,
    pubnodes_date: null,
    pubnodes_data: FALLBACK_NODES,
    pubnodes_custom: ['127.0.0.1:11898'],
    tray_minimize: false,
    tray_close: false
}

let win;
app.prompExit = true;
app.needToExit = false;

let trayIcon = path.join(__dirname,'src/assets/tray_24x24.png');
if(platform === 'darwin'){
    trayIcon = path.join(__dirname,'src/assets/tray.icns');
}else if(platform === 'win32'){
    trayIcon = path.join(__dirname,'src/assets/tray.ico');
}

let trayIconHide = path.join(__dirname,'src/assets/trayon_24x24.png');
if(platform === 'darwin'){
    trayIconHide = path.join(__dirname,'src/assets/trayon.icns');
}else if(platform === 'win32'){
    trayIconHide = path.join(__dirname,'src/assets/trayon.ico');
}

function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({
        title: DEFAULT_TITLE,
        icon: path.join(__dirname,'src/assets/walletshell_icon.png'),
        frame: true,//frame: false,
        width: 800,
        height: 680,
        minWidth: 800,
        minHeight: 680,
        show: false,
        backgroundColor: '#02853e',
    });

    let contextMenu = Menu.buildFromTemplate([
        { label: 'Minimize to tray', click: () => { win.hide(); }},
        { label: 'Quit', click: ()=> {
                app.needToExit = true;
                win.close();
            }
        }
    ]);
    // linux default;
    const tray = new Tray(trayIcon);
    tray.setPressedImage(trayIconHide);
    tray.setTitle(DEFAULT_TITLE);
    tray.setToolTip('Slow and steady wins the race!');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show();
    });

    win.on('show', () => {
        tray.setHighlightMode('always');
        tray.setImage(trayIcon);
        contextMenu = Menu.buildFromTemplate([
            { label: 'Minimize to tray', click: () => { win.hide();} },
            { label: 'Quit', click: ()=> {
                    app.needToExit = true;
                    win.close();
                }
            }
        ]);
        tray.setContextMenu(contextMenu);
    });

    win.on('hide', () => {
        tray.setHighlightMode('never');
        tray.setImage(trayIconHide);

        contextMenu = Menu.buildFromTemplate([
                { label: 'Restore', click: () => { win.show();} },
                { label: 'Quit', click: ()=> {
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
    if(IS_DEBUG ) win.webContents.openDevTools();

    // show windosw
    win.once('ready-to-show', () => {
        win.show();
        win.setTitle(DEFAULT_TITLE);
    })

    win.on('close', (e) => {
        if(settings.get('tray_close') && !app.needToExit){
            e.preventDefault();
            win.hide();
        }else if(app.prompExit){
            e.preventDefault();

            let msg = 'Are you sure?';
            if(wsession.loadedWalletAddress !== '') msg = 'Close your wallet and exit?';

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
        // todo: prompt to restart
        if(IS_DEBUG) console.log('webcontent was crashed', event, killed);
    });

    win.on('unresponsive', (even) => {
        // todo: prompt to restart
        if(IS_DEBUG) console.log('unresponsive!');
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
    https.get(PUBLIC_NODES_URL, (res) => {
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
                if(IS_DEBUG) console.log('nodelist has been updated');
                let mo = (today.getMonth()+1);
                settings.set('pubnodes_date', `${today.getFullYear()}-${mo}-${today.getDate()}`);
            }catch(e){
                if(IS_DEBUG) console.log('failed to parse json data', e);
                if(IS_DEBUG) console.log('type of input', typeof d);
                if(IS_DEBUG) console.log(JSON.stringify(d));
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
        if (!win.isVisible()) win.show();
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
        defaultTitle: DEFAULT_TITLE,
        debug: IS_DEBUG
    };

    if(IS_DEBUG) console.log('Running in debug mode');

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
    if(IS_DEBUG) console.log(err);
    process.exit(1);
});

process.on('beforeExit', (code) => {
    if(IS_DEBUG) console.log(`beforeExit code: ${code}`);
});

process.on('exit', (code) => {
    if(IS_DEBUG) console.log(`exit with code: ${code}`);
});

process.on('warning', (warning) => {
    if(IS_DEBUG){
        console.warn(warning.name);
        console.warn(warning.message);
        console.warn(warning.code);
        console.warn(warning.stack);
        console.warn(warning.detail);
    }
});

