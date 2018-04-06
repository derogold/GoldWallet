const electron = require('electron')
const path = require('path')
const url = require('url')
const connection = require('./connection.js')
const settings = require('electron-settings')

// check if it's the first time the app is launched
if(!settings.get('notFirstime')){
    // we set this flag to true and display the message
    settings.set('notFirstime', true)
    document.getElementById('text-overview-firstime').style.display = ''
}

// requests data to walletd
function request (isRunning) {
    const walletAddress = document.getElementById('wallet-address')
    const availableBalance = document.querySelector('#balance-available span')
    const lockedBalance = document.querySelector('#balance-locked span')

    if (isRunning) {
        // retrieve the balances from walletd
        connection.createRequest('getBalance', {}, function(response) {
            const result = response.result
            availableBalance.innerHTML = (result['availableBalance'] / 100).toFixed(2)
            lockedBalance.innerHTML = (result['lockedAmount'] / 100).toFixed(2)
        })

        // retrieve address
        connection.createRequest('getAddresses', {}, function(response) {
            const result = response.result
            walletAddress.innerHTML = result['addresses'][0]
        }) 
    } else {
        availableBalance.innerHTML = (0).toFixed(2)
        lockedBalance.innerHTML = (0).toFixed(2)
        walletAddress.innerHTML = 'No wallet loaded'
    }
}

connection.addRequest(request)