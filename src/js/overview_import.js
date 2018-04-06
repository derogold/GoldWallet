const remote = require('electron').remote
const dialog = remote.dialog
const connection = require('./connection.js')

const browseButton = document.getElementById('button-import-browse')
const importButton = document.getElementById('button-import-import')
const textSuccess = document.getElementById('text-import-success')
const textError = document.getElementById('text-import-error')

const folderPath = document.getElementById('input-import-path')
const walletName = document.getElementById('input-import-name')
const walletPassword = document.getElementById('input-import-password')
const viewKey = document.getElementById('key-import-view')
const spendKey = document.getElementById('key-import-spend')

browseButton.addEventListener('click', function(event) {
    dialog.showOpenDialog({properties: ['openDirectory']}, function (files) {
        if (files) {
            folderPath.value = files[0]
        }
    })
})

importButton.addEventListener('click', function (event) {
    // clear messages
    textSuccess.innerHTML = ''
    textError.innerHTML = ''
    
    function onSuccess() {
        textSuccess.innerHTML = 'File generated successfully!'
    }

    function onFailure(message) {
        textError.innerHTML = message
    }

    connection.importWallet(folderPath.value, walletName.value, walletPassword.value, viewKey.value, spendKey.value,
                            onFailure, onSuccess)
})