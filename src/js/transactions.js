const remote = require('electron').remote
const connection = require('./connection.js')
const BrowserWindow = remote.BrowserWindow
const path = require('path')
const url = require('url')

const pageText = document.getElementById('text-transactions-page')
const table = document.getElementById('transactions-table-body')
const refreshButton = document.getElementById('button-transactions-refresh')
const nextButton = document.getElementById('button-transactions->')
const lastButton = document.getElementById('button-transactions->>')
const previousButton = document.getElementById('button-transactions-<')
const firstButton = document.getElementById('button-transactions-<<')

let blockNumber = document.getElementById('navbar-text-sync-count')
const transactionsPerPage = 12
let currentPage = 1
let transactionsList = []

function fillTransactionsList() {
    let currentBlockCount = parseInt(blockNumber.textContent)
    
    return new Promise((resolve, reject) => {
        // resolve to false if currentBlockCount is 0 or some weird shit
        if (!currentBlockCount)
            resolve(false)

        connection.createRequest('getTransactions', {blockCount: currentBlockCount, firstBlockIndex: 1}, function(response) {
            const result = response.result
            const blocks = result.items
            // clear transaction list
            transactionsList = []
    
            // retrieve transactions from the blocks
            Array.prototype.forEach.call(blocks, block => {
                Array.prototype.forEach.call(block.transactions, transaction => {
                    // insert at beggining of the array
                    transactionsList.unshift(transaction)
                }) 
            })
            resolve(true)
        })
    })
}

function showPage(pageNumber) {
    let totalPages = Math.ceil(transactionsList.length / transactionsPerPage)
    // check if page number is valid
    if (pageNumber < 1 || pageNumber > totalPages)
        return
    // clear the table
    while(table.childElementCount > 1) {
        table.removeChild(table.lastChild)
    }
    // set current page
    currentPage = pageNumber
    // fill table with the transactions of the page
    let i = transactionsPerPage * (currentPage - 1)
    // loop until there are transactionsPerPage transactions in the page or until there are no more
    while(i - transactionsPerPage * (currentPage - 1) < transactionsPerPage && i < transactionsList.length) {
        //console.log(i)
        let transaction = transactionsList[i]
        let row = table.insertRow(-1)
        let amount = row.insertCell(0)
        let address = row.insertCell(1)
        let date = row.insertCell(2)

        amount.innerHTML = (transaction.amount / 100).toFixed(2)
        amount.classList.add('text-transactions-amount')

        addressString = transaction.transfers[0].address
        /*address.innerHTML = addressString.slice(0, 15) + ' ... '  + addressString.
                            slice(addressString.length - 15, addressString.length)*/
        address.innerHTML = addressString
        address.classList.add('text-transactions-address')

        date.innerHTML = new Date(transaction.timestamp * 1000).toDateString()
        date.classList.add('text-transactions-date')

        // upon clicking on the row, a panel will pop up
        // showing the transaction's details
        row.style
        row.addEventListener('click', function(event) {
            let panelUrl = url.format({
                pathname: path.join(__dirname, '../html/transactions-panel.html'),
                protocol: 'file:',
                slashes: true
            })
            let win = new BrowserWindow({ 
                frame: false, 
                width: 640, 
                height: 480,
                parent: remote.getCurrentWindow(),
            })
            win.on('close', function () { win = null })
            win.loadURL(panelUrl)

            // send the transaction to the newly created window
            win.webContents.on('did-finish-load', function() {
                win.webContents.send('transaction', transaction);
              });
            win.show()
        })
        i++
    }

    // show the current page and the total number of pages
    pageText.innerHTML = 'Page ' + currentPage + ' of ' + totalPages
}

// refresh transaction table
refreshButton.addEventListener('click', function(event) {
    fillTransactionsList().then((v) => {
        if(v) showPage(1) 
    })
})

nextButton.addEventListener('click', function(event) {
    showPage(currentPage + 1)
})

previousButton.addEventListener('click', function(event) {
    showPage(currentPage - 1)
})

firstButton.addEventListener('click', function(event) {
    showPage(1)
})

lastButton.addEventListener('click', function(event) {
    showPage(Math.ceil(transactionsList.length / transactionsPerPage))
})

// table headers
const amountHeader = document.getElementById('header-transactions-amount')
const addressHeader = document.getElementById('header-transactions-address')
const dateHeader = document.getElementById('header-transactions-date')

// compare functions used for sorting
function compareTxDate (a, b) {
    if (a.timestamp > b.timestamp)  return 1
    if (a.timestamp < b.timestamp)  return -1
                                    return 0
}

function compareTxAmount (a, b) {
    if (a.amount > b.amount)        return 1
    if (a.amount < b.amount)        return -1
                                    return 0
}

function compareTxAddress (a, b) {
    // not sure whats the point of this but oh well
    let str1 = a.transfers[0].address
    let str2 = b.transfers[0].address
    return str1.localeCompare(str2)
}

amountHeader.addEventListener('click', function(event) {
    let order = amountHeader.getAttribute('data-order')
    // the order attribute is either 1 or -1
    // if its 1 it will sort the array in ascending order, 
    // the opposite happens if its -1
    transactionsList.sort((a, b) => order * compareTxAmount(a, b))
    amountHeader.setAttribute('data-order', order * -1) 
    showPage(currentPage)
})

addressHeader.addEventListener('click', function(event) {
    let order = addressHeader.getAttribute('data-order')
    transactionsList.sort((a, b) => order * compareTxAddress(a, b))
    addressHeader.setAttribute('data-order', order * -1)
    showPage(currentPage)
})

dateHeader.addEventListener('click', function(event) {
    let order = dateHeader.getAttribute('data-order')
    transactionsList.sort((a, b) => order * compareTxDate(a, b))
    dateHeader.setAttribute('data-order', order * -1)
    showPage(currentPage)
})
