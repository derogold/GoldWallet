const {app, BrowserWindow, dialog, Tray, Menu} = require('electron');
const path = require('path');
const url = require('url');
const https = require('https');
const platform = require('os').platform();
const crypto = require('crypto');
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});
const log = require('electron-log');

const IS_DEBUG = (process.argv[1] === 'debug' || process.argv[2] === 'debug');
const LOG_LEVEL = IS_DEBUG ? 'debug' : 'warn';

log.transports.file.appName = 'WalletShell';
log.transports.console.level = LOG_LEVEL;
log.transports.file.level = LOG_LEVEL;
log.transports.file.maxSize = 5 * 1024 * 1024;


const SERVICE_FILENAME =  (platform === 'win32' ? 'turtle-service.exe' : 'turtle-service' );
const DEFAULT_SERVICE_BIN = path.join(process.resourcesPath, SERVICE_FILENAME);
const DEFAULT_TITLE = 'TurtleCoin Wallet';
const DEFAULT_TRAY_TIP = 'Slow and steady wins the race!';
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
    daemon_host: 'public.turtlenode.io',
    daemon_port: 11898,
    pubnodes_date: null,
    pubnodes_data: FALLBACK_NODES,
    pubnodes_custom: ['127.0.0.1:11898'],
    tray_minimize: false,
    tray_close: false
}

app.prompExit = true;
app.needToExit = false;

let trayIcon = path.join(__dirname,'src/assets/tray.png');
let trayIconHide = path.join(__dirname,'src/assets/trayon.png');

let win;
let tray;

function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({
        title: DEFAULT_TITLE,
        icon: path.join(__dirname,'src/assets/walletshell_icon.png'),
        frame: true,
        width: 800,
        height: 680,
        minWidth: 800,
        minHeight: 680,
        // maxWidth: 1280,
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
    
    tray = new Tray(trayIcon);
    tray.setPressedImage(trayIconHide);
    tray.setTitle(DEFAULT_TITLE);
    tray.setToolTip(DEFAULT_TRAY_TIP);
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
        tray.setToolTip(DEFAULT_TRAY_TIP);
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
        tray.setToolTip(DEFAULT_TRAY_TIP);
    })

    win.on('close', (e) => {
        if(settings.get('tray_close') && !app.needToExit){
            e.preventDefault();
            win.hide();
        }else if(app.prompExit){
            e.preventDefault();
            let msg = 'Are you sure want to exit?';
            dialog.showMessageBox({
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Exit Confirmation',
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
        log.debug('webcontent was crashed');
    });

    win.on('unresponsive', (even) => {
        // todo: prompt to restart
        log.debug('webcontent is unresponsive')
    });
}

function storeNodeList(pnodes){
    pnodes = pnodes || settings.get('pubnodes_data');
    let validNodes = [];
    if( pnodes.hasOwnProperty('nodes')){
        pnodes.nodes.forEach(element => {
            let item = `${element.url}:${element.port}`;
            validNodes.push(item);
        });
    }
    if(validNodes.length) settings.set('pubnodes_data', validNodes);
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
                log.debug('Public node list has been updated');
                let mo = (today.getMonth()+1);
                settings.set('pubnodes_date', `${today.getFullYear()}-${mo}-${today.getDate()}`);
            }catch(e){
                log.debug(`Failed to update public node list: ${e.message}`);
                storeNodeList();
            }
        });
    }).on('error', (e) => {
        log.debug(`Failed to update public node list: ${e.message}`);
    });
}

function initSettings(){
    Object.keys(DEFAULT_SETTINGS).forEach((k) => {
        if(!settings.has(k) || settings.get(k) === null){
            settings.set(k, DEFAULT_SETTINGS[k]);
        }
    });
}


const silock = app.requestSingleInstanceLock();
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
    log.warn('Running in debug mode');

    global.wsession = {
        debug: IS_DEBUG,
        //loadedWalletAddress: ''
    };

    let today = new Date();
    let last_checked = new Date(settings.get('pubnodes_date'));
    diff_d = parseInt((today-last_checked)/(1000*60*60*24),10);
    if(diff_d >= 1){
        log.info('Performing daily public-node list update.');
        doNodeListUpdate();
    }else{
        log.info('Public node list up to date, skipping update');
        storeNodeList(false); // from local cache
    }
    createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) createWindow();
});

process.on('uncaughtException', function (err) { 
    log.error(`Uncaught exception: ${e.message}`);
    process.exit(1);
});

process.on('beforeExit', (code) => {
    log.debug(`beforeExit code: ${code}`);
});

process.on('exit', (code) => {
    log.debug(`exit with code: ${code}`);
});

process.on('warning', (warning) => {
    log.warn(`${warning.code}, ${warning.name}`);
});