#!/bin/node

const path              = require("path");
const commandLineArgs   = require('command-line-args');
const fs                = require("fs");
const Async             = require("async");

const migrate           = require("../lib/migrate");

let migrationsDir = path.join(process.env.PWD, 'migrations'),
    modelsDir     = path.join(process.env.PWD, 'models');

const optionDefinitions = [
    { name: 'rev', alias: 'r', type: Number, description: 'Set migration revision (default: 0)', defaultValue: 0 },
    { name: 'pos', alias: 'p', type: Number, description: 'Run first migration at pos (default: 0)', defaultValue: 0 },
    { name: 'one', type: Boolean, description: 'Do not run next migrations', defaultValue: false },
    { name: 'list', alias: 'l', type: Boolean, description: 'Show migration file list (without execution)', defaultValue: false },
    { name: 'help', type: Boolean, description: 'Show this message' }
];

const options = commandLineArgs(optionDefinitions);


if (options.help)
{
    console.log("Simple sequelize migration execution tool\n\nUsage:");
    optionDefinitions.forEach((option) => {
        let alias = (option.alias) ? ` (-${option.alias})` : '\t';
        console.log(`\t --${option.name}${alias} \t${option.description}`);
    });
    process.exit(0);
}

const Sequelize = require("sequelize");
const sequelize = require(modelsDir).sequelize;
const queryInterface = sequelize.getQueryInterface();

// execute all migration from
let fromRevision = options.rev;
let fromPos = parseInt(options.pos);
let stop = options.one;

let migrationFiles = fs.readdirSync(migrationsDir)
// filter JS files
  .filter((file) => {
    return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
  })
// sort by revision
  .sort( (a, b) => {
      let revA = parseInt( path.basename(a).split('-',2)[0]),
          revB = parseInt( path.basename(b).split('-',2)[0]);
      if (revA < revB) return -1;
      if (revA > revB) return 1;
      return 0;
  })
// remove all migrations before fromRevision
  .filter((file) => {
      let rev = parseInt( path.basename(file).split('-',2)[0]);
      return (rev >= fromRevision);
  });
  
console.log("Migrations to execute:");  
migrationFiles.forEach((file) => {
    console.log("\t"+file);
});

if (options.list)
    process.exit(0);


Async.eachSeries(migrationFiles, 
    function (file, cb) {
        console.log("Execute migration from file: "+file);
        migrate.executeMigration(queryInterface, path.join(migrationsDir, file), fromPos, (err) => {
            if (stop)
                return cb("Stopped");
                
            cb(err);
        });
        // set pos to 0 for next migration
        fromPos = 0;
    },
    function(err) {
        console.log(err);
        process.exit(0);
    }
);
