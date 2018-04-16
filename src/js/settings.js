const remote = require('electron').remote
const connection = require('./connection.js')
const dialog = remote.dialog
const settings = require('electron-settings')

// input
const browseButton = document.getElementById('button-settings-browse')
const walletdPath = document.getElementById('input-settings-path')
const rpcPassword = document.getElementById('input-settings-rpcpass')
const nodeCheckbox = document.getElementById('checkbox-settings-node')
const nodeAddress = document.getElementById('input-settings-daemon-address')
const nodePort = document.getElementById('input-settings-daemon-port')

const sectionButtons = document.querySelectorAll('[data-section=section-settings]')
const saveButton = document.getElementById('button-settings-save')
const successText = document.getElementById('text-settings-success')

// this is here so everytime the settings tab is shown the values reset to the ones stored
Array.prototype.forEach.call(sectionButtons, function (button) {
    button.addEventListener('click', function(event) {
        walletdPath.value = settings.get('walletdPath') ? settings.get('walletdPath') : ''
        rpcPassword.value = settings.get('rpcPassword') ? settings.get('rpcPassword') : ''
        nodeAddress.value = settings.get('nodeAddress') ? settings.get('nodeAddress') : ''
        nodePort.value = settings.get('nodePort') ? settings.get('nodePort') : ''

        if(settings.get('usePublicNode')) {
            nodeCheckbox.checked = true
            nodeAddress.disabled = false
            nodePort.disabled = false
        } else {
            nodeCheckbox.checked = false
            nodeAddress.disabled = true
            nodePort.disabled = true
        }
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

nodeCheckbox.addEventListener('click', function(event) {
    if(nodeCheckbox.checked == true) {
        nodeAddress.disabled = false
        nodePort.disabled = false
    } else {
        nodeAddress.disabled = true
        nodePort.disabled = true
    }
})

saveButton.addEventListener('click', function (event) {
    // clear message
    successText.innerHTML = ''

    settings.set('walletdPath', walletdPath.value)
    settings.set('rpcPassword', rpcPassword.value)
    settings.set('usePublicNode', nodeCheckbox.checked)
    settings.set('nodeAddress', nodeAddress.value)
    settings.set('nodePort', nodePort.value)

    // to be honest there shouldn't be an error here
    successText.innerHTML = 'Settings saved successfully!'
})