const term = require( 'terminal-kit' ).terminal;
const puppet = require('./puppet');

function printHelp(info) {
  for (const each of info) {
    term.green(each[0]+': ');
    
    term.right(30-each[0].length);
    term.cyan(each[1]);
    console.log('');
  }
}

async function cli() {
  console.log('argument:', process.argv[2])
  const helper = await puppet.helper();
  let smartBots = [];

  const cmds = {
    'c': async () => {
      term.clear();
    },
    'q': async () => {
      if (helper.isRunning) {
        await helper.stop();
      }
      process.exit();
    },
    '?': async () => {
      printHelp([
        ['c', 'clear screen'],
        ['q', 'quit application'],
        ['s', 'start game with helper (optional: gameID)'],
        ['x', 'stop/halt game with helper'],
        ['l', 'launch smart bots (args: gameID, optional: number)'],
        ['b', 'start all created smart bots'],
        ['k', 'kill all smart bots'],
        ['?', 'show help']
      ]);
    },
    's': async (args) => {
      let gameID = 'ripteam';
      if (args && args[0]) {
        gameID = args[0];
      }

      if (helper.isRunning) {
        await helper.stop();
      }

      await helper.start(gameID);
    },
    'x': async () => {
      if (helper.isRunning) {
        await helper.stop();
      }
    },
    'l': async (args) => {
      if (!args || !args[0]) {
        term.red('need gameID!\n');
        return;
      }

      let num = 1;
      if (args[1] && !isNaN(parseInt(args[1]))) {
        num = parseInt(args[1]);
      }

      let gameID = args[0];
      for (let i = 0; i < num; i++) {
        let smartBot = await puppet.smartBot();
        smartBots.push(smartBot);
        smartBot.launch(gameID);
      }
    },
    'b': async (args) => {
      for (const each of smartBots) {
        each.start();
      }
    },
    'k': async () => {
      for (const each of smartBots) {
        if (each.isRunning) {
          await each.stop();
        }          
      }
      smartBots = [];
    }
  };  

  while (true) {
    term.yellow( "generals bot> " ) ;
    let input = await new Promise((resolve, reject) => {
      term.inputField((err, input) => {
        if (err) {
          reject(err);
        } else {
          resolve(input);
        }
      });
    }).catch(err => {
      console.log(err);
      cmds['q']();
    });
    console.log('');

    if (!input) {
      continue;
    }

    const command = input.charAt(0);
    const args = input.length > 1 ? [input.substring(1).trim()] : [];
    
    if (args[0]) {
      // Further split the first argument if it contains spaces
      const splitArgs = args[0].split(/\s+/);
      args.splice(0, 1, ...splitArgs);
    }

    const func = cmds[command];

    if (func && typeof func === 'function') {
      func(args);
    } else {
      term.red('unknown command! try ? for help\n');
    }
  }
}

cli();