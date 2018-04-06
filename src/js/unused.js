/* this file contains functions that were used at some point but I ended up removing them.
I'll keep them here so I know where to grab them if I ever need them again. */

/* is running
This function will evaluate to true or false if wether certain exe is running with a given name.
I actually found this thing on the internet, I modified it a little bit. What it does is it 
calls a process which depends of the operative system installed that returns a list of the
programs that are running. I am not sure if this is the best way to do this, however it seems that
node.js has no "built-in" way of telling if a program is running with a given name.
There is a npm package called ps-node which contains functions to manipulate everythign related to
other processes, I tried it but the execution time of the function was way too much. Either I was 
doing something wrong or the package just behaves like that.
A problem I have with this is that I never used Linux nor "darwin" so I lack the means to test this.*/
function isRunning(win, mac, linux) {
    return new Promise(function(resolve, reject) {
        const plat = process.platform
        switch(plat) {
            case 'win32':
                cmd = 'tasklist'
                proc = win
                break;
            case 'darwin':
                cmd = 'ps -ax | grep '
                proc = mac
                break;
            case 'linux':
                cmd = 'ps -A'
                proc = linux
                break;
            default:
                console.log('os not supported heh')
        }

        if(cmd === '' || proc === '') {
            resolve(false)
        } else {
            exec(cmd, function(err, stdout, stderr) {
                resolve(stdout.toLowerCase().indexOf(proc.toLowerCase()) > -1)
            })
        }
        /*
        a modification I did to this function to return the PID of the process
        I removed it because it ended up being unnecesary but I keep it here
        just in case. Keep in mind that this commented code segment only works
        for windows...
        exec(cmd, function(err, stdout, stderr) {
            // now we split the output into lines and see
            // if we find our process
            let lines = stdout.toLowerCase().split('\n')
            lines.forEach(function(line) {
                if(line.indexOf(proc.toLowerCase()) > -1) {
                    // now that we found it, we search for the pid
                    // it should be the first number that pops up
                    let lines2 = line.split(' ')
                    lines2.forEach(function(part) {
                        if(part != '' && !isNaN(part)) {
                            resolve(part)
                        }
                    })
                }
            })
            // if the process wasnt found, resolve to -1
            resolve(-1)
        })*/
    })
}

/* terminate process
Works similar to isRunning, but this time it runs a command to kill a process */
function terminateProcess (win, mac, linux) {
    return new Promise(function(resolve, reject) {
        const plat = process.platform
        let proc
        let cmd
        switch(plat) {
            case 'win32':
                cmd = 'taskkill /T /IM '
                proc = win
                break;
            case 'darwin':
                cmd = 'killall '
                proc = mac
                break;
            case 'linux':
                cmd = 'pkill '
                proc = linux
                break;
            default:
                console.log('os not supported heh')
        }
        if(cmd === '' || proc === '') {
            resolve(false)
        } else {
            // attach the process name to the command
            cmd += proc
            // attempt to terminate it
            exec(cmd, function(err, stdout, stderr) {
                // will resolve to false if nothing happened, most of the time this isn't
                // bad since walletd probably wasn't running when the user loaded a wallet.
                if (err) {
                    console.log(stderr)
                    resolve(false)
                } else {
                    console.log('killed')
                    resolve(true)
                }
            })
        }
    })
}
