const remote = require('electron').remote
const dialog = remote.dialog
const connection = require('./connection.js')

const browseButton = document.getElementById('button-create-browse')
const createButton = document.getElementById('button-create-create')
const textSuccess = document.getElementById('text-create-success')
const textError = document.getElementById('text-create-error')

const folderPath = document.getElementById('input-create-path')
const walletName = document.getElementById('input-create-name')
const walletPassword = document.getElementById('input-create-password')

browseButton.addEventListener('click', function(event) {
    dialog.showOpenDialog({properties: ['openDirectory']}, function (files) {
        if (files) {
            folderPath.value = files[0]
        }
    })
})

createButton.addEventListener('click', function (event) {
    function onSuccess() {
        textError.innerHTML = ''
        textSuccess.innerHTML = 'File generated successfully! Load it in order to start using it.'
    }

    function onFailure(message) {
        textError.innerHTML = message
        textSuccess.innerHTML = ''
    }

    connection.createWallet(folderPath.value, walletName.value, walletPassword.value, onFailure, onSuccess)
})