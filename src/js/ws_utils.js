const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {nativeImage} = require('electron');
const qr = require('qr-image');

/***** * DOM util *****/
exports.triggerEvent = (el, type) => {
    var e = document.createEvent('HTMLEvents');
    e.initEvent(type, false, true);
    el.dispatchEvent(e);     
 };

function addEvent(el, type, handler) {
     el.addEventListener(type, handler);
}

exports.liveEvent = (selector, event, callback, context) => {
    addEvent(context || document, event, function(e) {
        var qs = (context || document).querySelectorAll(selector);
        if (qs) {
            var el = e.target || e.srcElement, index = -1;
            while (el && ((index = Array.prototype.indexOf.call(qs, el)) === -1)) el = el.parentElement;
            if (index > -1) callback.call(el, e);
        }
    });
};

exports.selectText= (el, win) => {
    win = win || window;
    var doc = win.document, sel, range;
    if (win.getSelection && doc.createRange) {
        sel = win.getSelection();
        range = doc.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (doc.body.createTextRange) {
        range = doc.body.createTextRange();
        range.moveToElementText(el);
        range.select();
    }
};

exports.clearChild = (parentEl) => {
    while (parentEl.firstChild) {
        parentEl.removeChild(parentEl.firstChild);
    }
};

exports.innerHTML = (parentEl, html) => {
    var newEl = parentEl.cloneNode(false);
    newEl.innerHTML = html;
    parentEl.parentNode.replaceChild(newEl, parentEl);
};

/*****  MISC util ****/
exports.arrShuffle = (arr) => {
    return arr.map((a) => ({sort: Math.random(), value: a}))
        .sort((a, b) => a.sort - b.sort)
        .map((a) => a.value);
};

exports.mergeObj = (obj, src) => {
    Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
    return obj;
};

exports.uniqueObjArr = (objArr, key) => {
    key = key || 'id';
    return [...new Set( objArr.map(item => item[key]) )];
};

exports.diffObjArr = (objArr1, ObjArr2, key) => {
    let objArrKeys = objArr1.map((item) => { return item[key]; });
    let diff = ObjArr2.filter((item) => {
        return objArrKeys.indexOf(item[key]) === -1;
    });
    return diff;
};

exports.objInArray = (targetObjArr, objToSearch, objKey) => {
    let pos = targetObjArr.map((e) => {return e[objKey]; }).indexOf(objToSearch[objKey]);
    return pos !== -1;
};

exports.b2sSum = (inputStr) =>  {
    if(!inputStr) return false;
    return crypto.createHash('blake2s256')
        .update(inputStr)
        .digest('hex');
};

exports.genQrDataUrl = (inputStr) => {
    if(!inputStr) return '';

    let qrtmp = qr.imageSync(
        inputStr, {type: 'png'}
    );
    let nImg = nativeImage.createFromBuffer(qrtmp);
    if(nImg.isEmpty()) return '';
    return nImg.toDataURL();
};

exports.validateTRTLAddress = (address) => {
    if(!address) return false;
    let re = new RegExp(/^TRTL(?=[aA-zZ0-9]*$)(?:.{95}|.{183})$/g);
    return re.test(address);
};

exports.validatePaymentId = (paymentId) => {
    if(!paymentId) return true; // true allow empty
    let re = new RegExp(/^([aA-zZ0-9]{64})$/g);
    return re.test(paymentId);
};

exports.validateSecretKey = (key) => {
    if(!key){
        console.log('emmpty key');
        return false;
    }
    let re = new RegExp(/^[aA-zZ0-9]{64}$/g);
    return re.test(key);
};

exports.validateMnemonic = (seed) => {
    if(!seed) return false;
    let re = new RegExp(/^[aA-zZ]+(?!.*  )[a-zA-Z0-9 ]*$/g);
    if(!re.test(seed)) return false;
    if(seed.split(' ').length !== 25) return false;
    return true;
};

exports.isFileExist = (filePath) => {
    if(!filePath) return false;
    return fs.existsSync(filePath);
};

exports.isWritableDirectory = (filePath) => {
    if(!filePath) return false;
    try{
        fs.accessSync(filePath, fs.constants.W_OK);
    }catch(e){
        return false;
    }
    let stats = fs.statSync(filePath);
    return stats.isDirectory();

};

exports.isPathWriteable = (filePath) => {
    if(!filePath){
        return;
    }
    try{
        fs.accessSync(filePath, fs.constants.W_OK);
        return true;
    }catch(e){
        console.log(e);
        return false;
    }
};

exports.isRegularFileAndWritable = (filePath) => {
    if(!filePath) return;
    try{
        fs.accessSync(filePath, fs.constants.W_OK);
    }catch(e){
        return false;
    }

    let stats = fs.statSync(filePath);
    return stats.isFile();
};


exports.normalizeWalletFilename = (rawFilename) => {
    if(!rawFilename) return '';
    const walletExt = 'twl';
    let ext = path.extname(rawFilename.trim());
    if(ext.endsWith('.twl')) return rawFilename;
    if(ext.endsWith('.')) return `${rawFilename}${walletExt}`;
    return `${rawFilename}.${walletExt}`;
};


exports.validateWalletPath = (fullpath, defaultDir, isExisting) => {
    return new Promise((resolve, reject) => {
        fullpath = fullpath || '';
        isExisting = isExisting || false;
        defaultDir = defaultDir ? path.resolve(defaultDir) : path.resolve('.');
        if(!fullpath.length) return reject(new Error('Wallet file path can not be left blank'));
        const ERROR_DEFAULT = 'Please specify a full path to the wallet file and make sure you have a proper write permission to the file';
        fullpath = path.resolve(fullpath);

        fullpath = this.normalizeWalletFilename(fullpath);

        try{
            let stats = fs.statSync(fullpath);
            if(stats.isDirectory()){
                return reject(new Error('2' + ERROR_DEFAULT));
            }
        }catch(e){
            console.log(e.message);
        }

        if(isExisting){
            try{
                fs.accessSync(fullpath);
            }catch(e){
                return reject(new Error(ERROR_DEFAULT));
            }
        }
        let finalPath = path.normalize(fullpath);
        return resolve(finalPath);
    });
};