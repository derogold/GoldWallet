const remote = require('electron').remote
const connection = require('./connection.js')
const dialog = remote.dialog

// input
const browseButton = document.getElementById('button-load-browse')
const walletPath = document.getElementById('input-load-path')
const walletPassword = document.getElementById('input-load-password')

browseButton.addEventListener('click', function(event) {
    dialog.showOpenDialog({properties: ['openFile']}, function (files) {
        if (files) {
            // only one file may be selected
            walletPath.value = files[0]
        }
    })
})

const loadButton = document.getElementById('button-load-load')
const errorText = document.getElementById('text-load-error')
const warningText = document.getElementById('text-load-warning')
const successText = document.getElementById('text-load-success')

loadButton.addEventListener('click', function (event) {
    // clear messages
    errorText.innerHTML = ''
    warningText.innerHTML = ''
    successText.innerHTML = ''

    // display error message in case of failure
    function onFailure(errorMessage) {
        warningText.innerHTML = ''
        errorText.innerHTML = errorMessage
    }

    // display success
    function onSuccess(errorMessage) {
        warningText.innerHTML = ''
        successText.innerHTML = 'Wallet successfully loaded! Switch to the overview tab to check your balance.'
        /*const overviewButton = document.getElementById('button-section-overview')
        overviewButton.click()*/
    }

    // terminate walletd in case it's running
    // and after that, spawn the new walletd
    warningText.innerHTML = 'Saving...'
    connection.terminateWallet().then((v) => {
        warningText.innerHTML = 'Loading wallet file...'
        // this timeout fixed an issue that happened when loading
        // a wallet that was already loaded
        setTimeout(function(){
            connection.spawnWallet(walletPath.value, walletPassword.value, onFailure, onSuccess)
        }, 1000)
    })
})
