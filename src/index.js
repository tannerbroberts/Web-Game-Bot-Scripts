const term = require( 'terminal-kit' ).terminal;
const helper = require('./helper');

function printHelp(info) {
  console.log('');
  for (const each of info) {
    term.green(each[0]+': ');
    
    term.right(2-each[0].length);
    term.cyan(each[1]);
    console.log('');
  }
  console.log('');
}

async function cli() {
  console.log('argument:', process.argv[2])
  const helperInstance = await helper();

  const cmds = {
    'c': async () => {
      term.clear();
    },
    'q': async () => {
      if (helperInstance.isRunning) {
        await helperInstance.stop();
      }
      process.exit();
    },
    '?': async () => {
      printHelp([
        ['c', 'clear screen'],
        ['q', 'quit application'],
        ['s', 'start game with helper at generals.io/games/ripteam'],
        ['x', 'stop/halt game with helper'],
        ['?', 'show help']
      ]);
    },
    's': async () => {
      let gameID = 'ripteam';
      if (helperInstance.isRunning) {
        await helperInstance.stop();
      }

      await helperInstance.start(gameID);
    },
    'x': async () => {
      if (helperInstance.isRunning) {
        await helperInstance.stop();
      }
    },
  };  

  while (true) {
    term.yellow( "generals helper> " ) ;
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