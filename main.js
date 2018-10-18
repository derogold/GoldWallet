const {app, dialog, Tray, Menu} = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const https = require('https');
const platform = require('os').platform();
const crypto = require('crypto');
const Store = require('electron-store');
const settings = new Store({name: 'Settings'});
const log = require('electron-log');
const splash = require('@trodi/electron-splashscreen');

const IS_DEV  = (process.argv[1] === 'dev' || process.argv[2] === 'dev');
const IS_DEBUG = IS_DEV || process.argv[1] === 'debug' || process.argv[2] === 'debug';
const LOG_LEVEL = IS_DEBUG ? 'debug' : 'warn';

log.transports.console.level = LOG_LEVEL;
log.transports.file.level = LOG_LEVEL;
log.transports.file.maxSize = 5 * 1024 * 1024;

const WALLETSHELL_VERSION = app.getVersion() || '0.3.4';
const SERVICE_FILENAME =  (platform === 'win32' ? 'turtle-service.exe' : 'turtle-service' );
const SERVICE_OSDIR = (platform === 'win32' ? 'win' : (platform === 'darwin' ? 'osx' : 'lin'));
const DEFAULT_SERVICE_BIN = path.join(process.resourcesPath,'bin', SERVICE_OSDIR, SERVICE_FILENAME);
const DEFAULT_TITLE = 'WalletShell TurtleCoin Wallet';
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
    tray_close: false,
    darkmode: true
};
const DEFAULT_SIZE = {
    width: 840,
    height: 680
};

app.prompExit = true;
app.prompShown = false;
app.needToExit = false;
app.setAppUserModelId('lol.turtlecoin.walletshell');

log.info(`Starting WalletShell ${WALLETSHELL_VERSION}`);

let trayIcon = path.join(__dirname,'src/assets/tray.png');
let trayIconHide = path.join(__dirname,'src/assets/trayon.png');

let win;
let tray;

function createWindow () {
    // Create the browser window.
    let darkmode = settings.get('darkmode', true);
    let bgColor = darkmode ? '#000000' : '#02853E';

    const winOpts = {
        title: DEFAULT_TITLE,
        icon: path.join(__dirname,'src/assets/walletshell_icon.png'),
        frame: true,
        width: DEFAULT_SIZE.width,
        height: DEFAULT_SIZE.height,
        minWidth: DEFAULT_SIZE.width,
        minHeight: DEFAULT_SIZE.height,
        show: false,
        backgroundColor: bgColor,
        center: true,
    };

    win = splash.initSplashScreen({
        windowOpts: winOpts,
        templateUrl: path.join(__dirname, "src/html/splash.html"),
        delay: 0, 
        minVisible: 3000,
        splashScreenOpts: {
            width: 425,
            height: 325,
            transparent: true
        },
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
        if(settings.get('tray_minimize', false)){
            if(win.isVisible()){
                win.hide();
            }else{
                win.show();
            }
        }else{
            if(win.isMinimized()){
                win.restore();
                win.focus();
            }else{
                win.minimize();
            }
        }
        
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
    if(IS_DEV ) win.webContents.openDevTools();

    // show windosw
    win.once('ready-to-show', () => {
        //win.show();
        win.setTitle(DEFAULT_TITLE);
        tray.setToolTip(DEFAULT_TRAY_TIP);
    });

    win.on('close', (e) => {
        if(settings.get('tray_close') && !app.needToExit){
            e.preventDefault();
            win.hide();
        }else if(app.prompExit ){
            e.preventDefault();
            if(app.prompShown) return;
            let msg = 'Are you sure want to exit?';
            app.prompShown = true;
            dialog.showMessageBox({
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Exit Confirmation',
                message: msg
            }, function (response) {
                app.prompShown = false;
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
    win.webContents.on('crashed', () => { 
        // todo: prompt to restart
        log.debug('webcontent was crashed');
    });

    win.on('unresponsive', () => {
        // todo: prompt to restart
        log.debug('webcontent is unresponsive');
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
    try{
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
            log.debug(`Failed to update public-node list: ${e.message}`);
        });
    }catch(e){
        log.error(`Failed to update public-node list: ${e.code} - ${e.message}`);
    }
}

function serviceBinCheck(){
    //if(settings.has('firstRun')) return;
    if(!DEFAULT_SERVICE_BIN.startsWith('/tmp')) return;

    log.warn(`AppImage env, copying service bin file`);
    let targetPath = path.join(app.getPath('userData'), SERVICE_FILENAME);
    //log.debug('target Path: ' + targetPath);

    fs.copyFile(DEFAULT_SERVICE_BIN, targetPath, (err) => {
        if (err){
            log.error(err);
        }else{
            settings.set('service_bin', targetPath);
            log.debug(`turtle-service copied to ${targetPath}`);
        }
        //log.warn(`TurtleService copied to ${targetPath}`);
        //settings.set('service_bin', targetPath);
    });
}

function initSettings(){
    Object.keys(DEFAULT_SETTINGS).forEach((k) => {
        if(!settings.has(k) || settings.get(k) === null){
            settings.set(k, DEFAULT_SETTINGS[k]);
        }
    });
    settings.set('version', WALLETSHELL_VERSION);
    serviceBinCheck();
}

const silock = app.requestSingleInstanceLock();
app.on('second-instance', () => {
    if (win) {
        if (!win.isVisible()) win.show();
        if (win.isMinimized()) win.restore();
        win.focus();
    }
});
if (!silock) app.quit();

app.on('ready', () => {
    initSettings();

    if(IS_DEV || IS_DEBUG) log.warn(`Running in ${IS_DEV ? 'dev' : 'debug'} mode`);

    global.wsession = {
        debug: IS_DEBUG
    };

    let today = new Date();
    let last_checked = new Date(settings.get('pubnodes_date'));
    let diff_d = parseInt((today-last_checked)/(1000*60*60*24),10);
    if(diff_d >= 1){
        log.info('Performing daily public-node list update.');
        doNodeListUpdate();
    }else{
        log.info('Public node list up to date, skipping update');
        storeNodeList(false); // from local cache
    }
    
    createWindow();

    // target center pos of primary display
    let eScreen = require('electron').screen;
    let primaryDisp = eScreen.getPrimaryDisplay();
    let tx = Math.ceil((primaryDisp.workAreaSize.width - DEFAULT_SIZE.width)/2);
    let ty = Math.ceil((primaryDisp.workAreaSize.height - (DEFAULT_SIZE.height))/2);
    if(tx > 0 && ty > 0) win.setPosition(tx, ty);

    
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

process.on('uncaughtException', function (e) {
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