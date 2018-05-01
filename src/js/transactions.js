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
const sortDateOption = document.getElementById('option-transactions-sort-date')
const sortHashOption = document.getElementById('option-transactions-sort-hash')
const sortAmountOption = document.getElementById('option-transactions-sort-amount')
const sortPayidOption = document.getElementById('option-transactions-sort-payid')
const selectSort = document.getElementById('select-transactions-sort')
const sortButton = document.getElementById('button-transactions-sort')
const transactionsPerPage = 7

let sortIcon
let blockNumber = document.getElementById('navbar-text-sync-count')
let currentPage = 1
let transactionsList = []
// by default, the transactions list is ordered by date due to how it's filled
let currentSortBy = 'date'
// sorting order is 1 for ascending, -1 for descending
let currentSortOrder = 1

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
    // if the transactions list is empty, we display a message
    if(transactionsList.length == 0) {
        table.insertRow(-1).insertCell(0).innerHTML = 'You have no transactions! :('
        return
    }
    // set current page
    currentPage = pageNumber
    // fill table with the transactions of the page
    let i = transactionsPerPage * (currentPage - 1)
    // loop until there are transactionsPerPage transactions in the page or until there are no more
    while(i - transactionsPerPage * (currentPage - 1) < transactionsPerPage && i < transactionsList.length) {
        let transaction = transactionsList[i]
        let row = table.insertRow(-1)
        let cell = row.insertCell(0)

        // Amount
        let divAmount = document.createElement('div')
        if (transaction.amount > 0)
            divAmount.innerHTML = '+' + (transaction.amount / 100).toFixed(2) + ' TRTL'
        else
            divAmount.innerHTML = (transaction.amount / 100).toFixed(2) + ' TRTL'
        
        divAmount.classList.add('div-transactions-row-txamount')
        cell.appendChild(divAmount)

        // Hash
        let divHash = document.createElement('div')
        divHash.innerHTML = 'Hash: ' + transaction.transactionHash
        divHash.classList.add('div-transactions-row-txhash')
        cell.appendChild(divHash)

        // Date
        let divDate = document.createElement('div')
        divDate.innerHTML = new Date(transaction.timestamp * 1000).toDateString()
        divDate.classList.add('div-transactions-row-txdate')
        cell.appendChild(divDate)

        // Payment Id
        let divPayId = document.createElement('div')
        divPayId.innerHTML = 'Payment Id: ' + transaction.paymentId
        divPayId.classList.add('div-transactions-row-txpayid')
        cell.appendChild(divPayId)

        // upon clicking on the row, a panel will pop up
        // showing the transaction's details
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
        else {
            // clear the table
            while(table.childElementCount > 1) {
                table.removeChild(table.lastChild)
            }
            // show some message
            table.insertRow(-1).insertCell(0).innerHTML = 'Unable to show transactions!'
        }
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

// function that sorts the transactions list and refreshes the page
function sortTransactionsList (sortBy) {
    let sortFunction
    switch (sortBy) {
        case 'date':
            sortFunction = function (a, b) {
                if (a.timestamp > b.timestamp)  return 1
                if (a.timestamp < b.timestamp)  return -1
                                                return 0
            }
            break;
        case 'hash':
            sortFunction = function (a, b) {
                let str1 = a.transactionHash
                let str2 = b.transactionHash
                return str1.localeCompare(str2)
            }
            break;
        case 'amount':
            sortFunction = function  (a, b) {
                if (a.amount > b.amount)    return 1
                if (a.amount < b.amount)    return -1
                                            return 0
            }
            break;
        case 'payid':
            sortFunction = function (a, b) {
                let str1 = a.paymentId
                let str2 = b.paymentId
                return str1.localeCompare(str2)
            }
    }

    transactionsList.sort((a, b) => currentSortOrder * sortFunction(a, b))
    showPage(currentPage)
}

// assing to each option the ability to call the sort function
// passing a specific compare function
selectSort.addEventListener('change', function(event) {
    currentSortBy = event.target.value
    sortTransactionsList(currentSortBy)
})

// sort button
// allows the user to sort in descending or ascending order
sortButton.addEventListener('click', function(event) {
    sortIcon = document.getElementById('icon-transactions-sort')
    // change the icon everytime the user clicks
    if (currentSortOrder == 1) {
        sortIcon.classList.toggle('fa-chevron-up')
        sortIcon.classList.toggle('fa-chevron-down')
    } else {
        sortIcon.classList.toggle('fa-chevron-down')
        sortIcon.classList.toggle('fa-chevron-up')
    }
    currentSortOrder *= -1
    sortTransactionsList(currentSortBy)
})
