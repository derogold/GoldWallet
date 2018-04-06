const childProcess = require('child_process')
const exec = childProcess.exec
const execFile = childProcess.execFile
const spawn = childProcess.spawn
const path = require('path')
const jayson = require('jayson')
const settings = require('electron-settings')
const util = require('util')
const fs = require('fs')

const ERROR_WALLETLAUNCH = 'Failed to start walletd. Set the path to walletd properly in the settings tab.'
const ERROR_WALLETSYNC = 'Failed to sync walletd. Make sure you selected a valid wallet file and that the password is correct.'
const ERROR_IMPORTDIR = 'Failed to import file. You must specify a directory!'
const ERROR_IMPORTFILE = 'Failed to generate wallet file. Make sure the file does not already exist and the folder is accessible.'
const ERROR_IMPORTKEYS = 'Unable to create wallet file. Check if both the spend and view keys are correct.'
const ERROR_CREATEDIR = 'Failed to create wallet file. You must specify a directory!'
const ERROR_CREATEFILE = 'Failed to create wallet file. Make sure the file does not already exist and the folder is accessible.'

// variable that will reference the child process
let walletdChild

// create a client
let client = jayson.client.http('http://127.0.0.1:8070/json_rpc')

// this will only happen the first time the user launches the app
if (!settings.has('rpcPassword')) {
    // if there is no password set, we will generate a random string for the first time
    // and it will be saved in the settings
    let password = "";
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (i = 0; i < 15; i++)
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    
    settings.set('rpcPassword', password)
}
// now we recover the password from the settings
const rpcPassword = settings.get('rpcPassword')
// function that returns the path to walletd
function getWalletdPath() {
    let walletdPath = settings.get('walletdPath')
    // if he did not set the path, the gui wallet will look for it into the same directory
    if (!walletdPath)
        walletdPath = 'walletd.exe'

    return path.normalize(walletdPath)
}

/* is walletd running
checks if there is a wallet already loaded */
function isWalletdRunning() {
    return !util.isNullOrUndefined(walletdChild)
}

/* spawn wallet
This function starts an instance of walletd to load a wallet */
function spawnWallet(filePath, password, onError, onSuccess) {
    let file = path.basename(filePath)
    let directory = path.dirname(filePath)
    walletdChild = spawn(getWalletdPath(), ['-w', file, '-p', password, '--local',
     '--server-root', directory, '--rpc-password', rpcPassword])  

    // listen to the close event, so the var walletdChild goes null
    // when it happens
    walletdChild.on('close', function(code) {
        //console.log('exited', code)
        walletdChild = null;
    })

    /* The process has been spawned, now we check if its running */
    if(isWalletdRunning()) {
        /* If we get to this stage then it's because walletd did launch.
        Now we attempt to do a request, if it fails it's because walletd
        didn't start synchronizing, probably because of an invalid wallet
        file or wrong password. */
        function testConnection () {
            client.request('getBalance', {}, function(err) {
                if(err) {
                    onError(ERROR_WALLETSYNC)
                    throw err
                } else onSuccess()
            })
        }
        setTimeout(testConnection, 3000)
    } else onError(ERROR_WALLETLAUNCH)
}

/* terminate wallet
terminates the walletd child process */
function terminateWallet() {
    return new Promise(function(resolve, reject) {
        if(isWalletdRunning()) {
            client.request('save', {}, function(err, response) {
                if(err) {
                    resolve(false)
                    throw err
                } else {
                    walletdChild.kill('SIGTERM')
                    //console.log('killed')
                    resolve(true)
                }
            })
        } else resolve(false)
    })
}

/* create wallet
Creates a wallet file, given a name and a password. */
function createWallet (dir, name, password, onError, onSuccess) {
    let filename = name + ".wallet"

    if(dir == '') {
        onError(ERROR_CREATEDIR)
        throw ERROR_CREATEDIR
    }
    
    let child = execFile(getWalletdPath(), ['-w', filename, '-p', password, '--local', 
    '--server-root', dir, '-g', '--rpc-password', rpcPassword],
     (error, stdout, stderr) => {
        if (error) {
            onError(ERROR_CREATEFILE)
            throw error
        } else {
            onSuccess()
            console.log(stdout)
        }
     })
}

/* import wallet
Creates a wallet file, given a name, password and the corresponding
private spend and view keys */
function importWallet (dir, name, password, viewKey, spendKey, onError, onSuccess) {
    let filename = name + ".wallet"
    // validate path
    if(dir == '') {
        onError(ERROR_IMPORTDIR)
        throw ERROR_IMPORTDIR
    }
    // exec walletd with the generate container command
    let child = execFile(getWalletdPath(), ['-w', filename, '-p', password, '--local', '--server-root', dir,
     '-g', '--view-key', viewKey, '--spend-key', spendKey, '--rpc-password', rpcPassword], 
     (error, stdout, stderr) => {
        if (error) {
            // if it shoots up an error it's because of a filesystem issue, probably the file
            // already exists or walletd can't access the folder
            onError(ERROR_IMPORTFILE)
            throw error
        } else {
            // now we have to check if they file was actually created
            fs.access(path.join(dir, filename), (err) => {
                if (err) {
                    // the file doesn't exists, this means walletd didn't make it
                    // because of wrong keys
                    onError(ERROR_IMPORTKEYS)
                    // this error may also trigger if the generated file can't be accessed though
                } 
                else {
                    onSuccess()
                }
            })
            console.log(stdout)
        }
    })
}

/* requests list
Stores all the functions used in the gui wallet that need to do periodic RPC requests to 
walletd each of these functions take a boolean as a parameter, that parameter will be 
true if walletd is running and false otherwise. This will allow them to assign a default 
value in case no wallet file has been loaded. */
let requestsList = []

/* add request
Adds a request function to the requests list */
function addRequest(func) {
    requestsList.push(func)
}

/* execute requests
Every 3 seconds, this function will evaluate if walletd is running or not, then it will
loop through the requestsList executing each function with the boolean value mentioned above
as a parameter */
function refresh() {
    function executeRequests(walletdRunning) {
        Array.prototype.forEach.call(requestsList, function (request) {
            request(walletdRunning)
            //request(true)
        })
    }
    executeRequests(isWalletdRunning())
}
// now execute function every certain amount of seconds
setInterval(refresh, 3000)

/* request
Makes a particular request to walletd, given the method name, the parameters and
a callback function which is called once the response is returns.
An additional onError function can be added to the call, which will execute in case
of an error ocurring (probably because walletd was not launched first) */
function createRequest(method, params, callback, onError) {
    try {
        const options = {
            jsonrpc : '2.0',
            method: method,
            params: params,
            password: rpcPassword
        }
        //console.log(JSON.stringify(client.request(options, () => {})))
        client.request(options, function(err, response) {
            //console.log(JSON.stringify(response))
            if(err) {
                if(onError) 
                    onError(err)

                throw err
            } 
            else 
                callback(response) 
        })
    } catch(err) {
        return err;
    }
}

module.exports = {terminateWallet, spawnWallet, createWallet, importWallet, createRequest, addRequest}