const connection = require('./connection.js')

// reveal button
const revealButton = document.getElementById('button-show-reveal')
// key fields
const viewKey = document.getElementById('key-show-view')
const spendKey = document.getElementById('key-show-spend')
// the wallet's address, its required by the getSpendKeys method
const walletAddress = document.getElementById('wallet-address')

revealButton.addEventListener('click', function (event) {
    connection.createRequest('getViewKey', {}, function(response) {
        const result = response.result
        viewKey.innerHTML = result['viewSecretKey']
    }, function (error) {
        viewKey.innerHTML = 'No wallet loaded!'
    })

    connection.createRequest('getSpendKeys', {'address': walletAddress.innerHTML}, function(response) {
        const result = response.result
        spendKey.innerHTML = result['spendSecretKey']
    }, function (error) {
        spendKey.innerHTML = 'No wallet loaded!'
    })
})