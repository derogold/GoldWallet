
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
    // addEvent(context || document, event, function(e) {
    //     var found, el = e.target || e.srcElement;
    //     while (el && el.matches && el !== context && !(found = el.matches(selector))) el = el.parentElement;
    //     if (found) callback.call(el, e);
    // });
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
}

exports.clearChild = (parentEl) => {
    while (parentEl.firstChild) {
        parentEl.removeChild(parentEl.firstChild);
    }
}

exports.innerHTML = (parentEl, html) => {
    var newEl = parentEl.cloneNode(false);
    newEl.innerHTML = html;
    parentEl.parentNode.replaceChild(newEl, parentEl);
};

/*****  MISC util ****/
exports.arrShuffle = (arr) => {
    return arr.map((a) => ({sort: Math.random(), value: a}))
        .sort((a, b) => a.sort - b.sort)
        .map((a) => a.value)
        // shuffle(a,b,c,d){//array,placeholder,placeholder,placeholder
        //     c=a.length;while(c)b=Math.random()*c--|0,d=a[c],a[c]=a[b],a[b]=d
        //    }
};

exports.mergeObj = (obj, src) => {
    Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
    return obj;
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
    let walletRe = new RegExp(/^TRTL(?=\w*$)(?:.{95}|.{182})$/g);
    return walletRe.test(address);
};

exports.validatePaymentId = (paymentId) => {
    if(!paymentId) return true; // true allow empty
    let payIdRe = new RegExp(/^(\w{64})$/g);
    return payIdRe.test(paymentId);
};
