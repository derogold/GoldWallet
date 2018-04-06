const remote = require('electron').remote
const connection = require('./connection.js')

const sendAddress = document.getElementById('input-send-address')
const sendAmount = document.getElementById('input-send-amount')
const sendPayID = document.getElementById('input-send-payid')
const sendFee = document.getElementById('input-send-fee')
const sendMixin = document.getElementById('input-send-mixin')
const textError = document.getElementById('text-send-error')
const textSuccess = document.getElementById('text-send-success')
const sendButton = document.getElementById('button-send-send')

// set default values
sendMixin.value = 3
sendFee.value = 0.1

sendButton.addEventListener('click', function(event) {
    // clear messages
    textError.innerHTML = ''
    textSuccess.innerHTML = ''

    // validate amount
    let amount = parseFloat(sendAmount.value)
    // check if it's an actual float
    if (isNaN(sendAmount.value) || amount <= 0) {
        textError.innerHTML = 'This is not a valid amount number!'
        return
    }
    // check that the decimals are no more than 2
    if (precision(amount) > 2) {
        textError.innerHTML = 'There should not be more than 2 decimal places in the amount!'
        return
    }
    // adjust amount for the rpc transaction
    amount *= 100

    // validate fee
    let fee = parseFloat(sendFee.value)
    // check if it's an actual float
    if (isNaN(sendFee.value) || fee < 0) {
        textError.innerHTML = 'This is not a valid fee number!'
        return
    }
    // check that the decimals are no more than 2
    if (precision(fee) > 2) {
        textError.innerHTML = 'There should not be more than 2 decimal places in the fee!'
        return
    }
    // adjust fee for the rpc transaction
    fee *= 100

    // validate mixin
    let mixin = parseInt(sendMixin.value)
    // check if it's an actual number
    if (isNaN(sendMixin.value) || mixin < 0) {
        textError.innerHTML = 'This is not a valid mixin number!'
        return
    }

    // payment id can be anything
    let payID = sendPayID.value
    // validate address
    let address = sendAddress.value
    // attempt to retrieve the balance of the addresses's wallet
    connection.createRequest('getBalance', { address: address }, (response) => {
        // now we check the response
        if (response.error && response.error.message == 'Bad address') {
            textError.innerHTML = 'This is not a valid TRTL address!'
        } else {
            /* 
            if we reached this part, then either 2 things happened:
            1 - response.error is defined but the message isn't 'Bad Address'
            in this case the user is trying to send TRTL to a valid address that's
            not his own, everything normal here.
            2 - response.error is undefined and getBalance returned an amount
            this means that the user is attempting to send TRTL to a valid address
            that belongs to his own wallet. It might even be that he is sending to the
            same address he's using, which is kind of weird but apparently it's allowed.
            Either way, the receiver's address is valid so we process the transaction.
            */
           /*console.log(response)
           console.log('Amount', amount)
           console.log('Address', address)
           console.log('Fee', fee)
           console.log('Mixin', mixin)
           console.log('Payment Id', payID)*/
           connection.createRequest('sendTransaction', { transfers: [{ amount: amount, address: address }],
            fee: fee, anonymity: mixin, paymentId: payID}, (response) => {
                if (response.result) {
                    textSuccess.innerHTML = 'Transaction sent successfully!'
                } else {
                    console.log(response)
                    textError.innerHTML = 'Failed to send transaction!'
                }
           }, () => { 
               // this error shouldn't really trigger, the only way for this to happen
               // is if the user somehow manages to shut down walletd.exe after the
               // getBalance request but before the sendTransaction request, which 
               // I consider virtually impossible.
                textError.innerHTML = 'Failed to send transaction!'
           })
        }
    }, () => {
        // if we got here then something went wrong
        textError.innerHTML = 'Transaction could not be processed. Make sure you actually loaded a wallet.'
        return
    })
    
})

// found this nice precision function on stack overflow
function precision(a) {
    if (!isFinite(a)) return 0;
    let e = 1, p = 0;

    while (Math.round(a * e) / e !== a) { e *= 10; p++; }
    return p;
}
