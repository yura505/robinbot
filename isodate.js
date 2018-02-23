// date helper functions
module.exports = {
  _today_date: getNdaysAgoDate(0),
  get today() {
    return this._today_date;
  },
  get yesterday() {
    return getNdaysAgoDate(1);
  },
  get year_ago() {
    return getNdaysAgoDate(365);
  },
  get two_years_ago() {
    return getNdaysAgoDate(365 * 2);
  },
  diff(first, second) {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const firstDate = new Date(first);
    const secondDate = new Date(second);
    return Math.round(
      Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay)
    );
  }
};

function getNdaysAgoDate(n) {
  let tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
  let localISOTime = new Date(Date.now() - n * 86400000 - tzoffset)
    .toISOString()
    .slice(0, -1);
  return localISOTime.split("T")[0];
}
