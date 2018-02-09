
module.exports = {
    get today() { return getNdaysAgoDate(0) },
    get yesterday() { return getNdaysAgoDate(1) },
    get year_ago() { return getNdaysAgoDate(365) },
    diff: function(first, second) {
        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
        var firstDate = new Date(first);
        var secondDate = new Date(second);
        return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
    }
}

function getNdaysAgoDate(n) {
    let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    let localISOTime = (new Date(Date.now() - (n * 86400000) - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0]
}
