const schedule = require('node-schedule');
const findChannels = require('./scraper.js');

schedule.scheduleJob('30 * * * *', () => {
  findChannels();
});
