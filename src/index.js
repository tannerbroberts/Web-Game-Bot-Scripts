const helperFunction = require('./helper');

helperFunction().then((helper) => {
  console.log('helper',  helper);
  helper.start('ripteam');
  process.on('exit', helper.stop);
});
