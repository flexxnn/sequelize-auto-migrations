#!/bin/node

const path = require('path');
const commandLineArgs = require('command-line-args');
const fs = require('fs');
const Async = require('async');
const Sequelize = require('sequelize');
const migrate = require('../lib/migrate');

const migrationsDir = path.join(process.env.PWD, 'migrations');
const modelsDir = path.join(process.env.PWD, 'models');

const optionDefinitions = [
  {
    name: 'rev', alias: 'r', type: Number, description: 'Set migration revision (default: 0)', defaultValue: 0,
  },
  {
    name: 'pos', alias: 'p', type: Number, description: 'Run first migration at pos (default: 0)', defaultValue: 0,
  },
  {
    name: 'one', type: Boolean, description: 'Do not run next migrations', defaultValue: false,
  },
  {
    name: 'list', alias: 'l', type: Boolean, description: 'Show migration file list (without execution)', defaultValue: false,
  },
  { name: 'help', type: Boolean, description: 'Show this message' },
];

const options = commandLineArgs(optionDefinitions);


if (options.help) {
  console.log('Simple sequelize migration execution tool\n\nUsage:');
  optionDefinitions.forEach((option) => {
    const alias = (option.alias) ? ` (-${option.alias})` : '\t';
    console.log(`\t --${option.name}${alias} \t${option.description}`);
  });
  process.exit(0);
}

const { sequelize } = require(modelsDir);
const queryInterface = sequelize.getQueryInterface();

// execute all migration from
const fromRevision = options.rev;
let fromPos = parseInt(options.pos, 10);
const stop = options.one;

queryInterface.createTable('SequelizeMeta', {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
}).then(() => {
  const alreadyExecuted = [];
  try {
    sequelize.query('SELECT * FROM "SequelizeMeta"', { type: sequelize.QueryTypes.SELECT })
      .then((scripts) => {
        (scripts || []).forEach((script) => {
          alreadyExecuted[script.name] = true;
        });
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => (file.indexOf('.') !== 0) && (file.slice(-3) === '.js'))
          .sort((a, b) => {
            const revA = parseInt(path.basename(a).split('-', 2)[0], 10);
            const revB = parseInt(path.basename(b).split('-', 2)[0], 10);
            if (revA < revB) return -1;
            if (revA > revB) return 1;
            return 0;
          })
          .filter((file) => {
            const rev = parseInt(path.basename(file).split('-', 2)[0], 10);
            return (rev >= fromRevision);
          })
          .filter(file => alreadyExecuted[file] !== true);
        console.log('Migrations to execute:');
        migrationFiles.forEach((file) => {
          console.log(`\t${file}`);
        });

        if (options.list) { process.exit(0); }
        Async.eachSeries(
          migrationFiles, (file, cb) => {
            console.log(`Execute migration from file: ${file}`);
            migrate.executeMigration(
              queryInterface, path.join(migrationsDir, file), fromPos,
              (err) => {
                if (stop) { return cb('Stopped'); }
                if (!err) {
                  return queryInterface.bulkInsert('SequelizeMeta', [{
                    name: file,
                  }]).then(() => cb()).catch(error => cb(error));
                }
                return cb(err);
              },
            );
            // set pos to 0 for next migration
            fromPos = 0;
          },
          (err) => {
            if (err) {
              console.log(err);
            }
            process.exit(0);
          },
        );
      }).catch(error => console.log(error));
  } catch (e) {
    console.log(e);
  }
}).catch((error) => {
  console.log(error);
});
