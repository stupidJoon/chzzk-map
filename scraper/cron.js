const schedule = require('node-schedule');
const findChannels = require('./scraper.js');

schedule.scheduleJob('0 * * * *', () => {
  findChannels();
});
