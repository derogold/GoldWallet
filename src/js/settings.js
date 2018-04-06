const remote = require('electron').remote
const connection = require('./connection.js')
const dialog = remote.dialog
const settings = require('electron-settings')

// input
const browseButton = document.getElementById('button-settings-browse')
const walletdPath = document.getElementById('input-settings-path')
const rpcPassword = document.getElementById('input-settings-rpcpass')

const sectionButtons = document.querySelectorAll('[data-section=section-settings]')

Array.prototype.forEach.call(sectionButtons, function (button) {
    button.addEventListener('click', function(event) {
        walletdPath.value = settings.get('walletdPath')
        rpcPassword.value = settings.get('rpcPassword')
    })
})

browseButton.addEventListener('click', function(event) {
    dialog.showOpenDialog({properties: ['openFile']}, function (files) {
        if (files) {
            // only one file may be selected
            walletdPath.value = files[0]
        }
    })
})

const saveButton = document.getElementById('button-settings-save')
const successText = document.getElementById('text-settings-success')

saveButton.addEventListener('click', function (event) {
    // clear message
    successText.innerHTML = ''

    settings.set('walletdPath', walletdPath.value)
    settings.set('rpcPassword', rpcPassword.value)

    // to be honest there shouldn't be an error here
    successText.innerHTML = 'Settings saved successfully!'
})