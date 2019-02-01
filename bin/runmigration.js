#!/usr/bin/env node

const path              = require("path");
const commandLineArgs   = require('command-line-args');
const fs                = require("fs");
const Async             = require("async");

const migrate           = require("../lib/migrate");
const pathConfig        = require('../lib/pathconfig');

const optionDefinitions = [
    { name: 'rev', alias: 'r', type: Number, description: 'Force set migration revision', defaultValue: 0 },
    { name: 'list', alias: 'l', type: Boolean, description: 'Show migration file list (without execution)', defaultValue: false },
    { name: 'migrations-path', type: String, description: 'The path to the migrations folder' },
    { name: 'models-path', type: String, description: 'The path to the models folder' },
    { name: 'help', type: Boolean, description: 'Show this message' }
];

const options = commandLineArgs(optionDefinitions);

// Windows support
if(!process.env.PWD){
    process.env.PWD = process.cwd();
}

const {
    modelsDir,
    migrationsDir
} = pathConfig(options);

if (!fs.existsSync(modelsDir)) {
    console.log("Can't find models directory. Use `sequelize init` to create it")
    process.exit(1)
}

if (!fs.existsSync(migrationsDir)) {
    console.log("Can't find migrations directory. Use `sequelize init` to create it")
    process.exit(1)
}

if (options.help)
{
    console.log("Simple sequelize migration execution tool\n\nUsage:");
    optionDefinitions.forEach((option) => {
        let alias = (option.alias) ? ` (-${option.alias})` : '\t';
        console.log(`\t --${option.name}${alias} \t${option.description}`);
    });
    process.exit(0);
}

const sequelize = require(modelsDir).sequelize;
const queryInterface = sequelize.getQueryInterface();

const MigrationsModel = sequelize['import'](path.join(__dirname, '../lib/migrations-model.js'))
if (!MigrationsModel) {
    console.log("Can't import migration model")
    process.exit(1)
}

let migrationFiles = fs.readdirSync(migrationsDir)
// filter JS files
  .filter((file) => {
    return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
  })
// sort by revision
  .sort((a, b) => {
      const revA = parseInt( path.basename(a).split('-',2)[0]),
            revB = parseInt( path.basename(b).split('-',2)[0]);
      if (revA < revB) return -1;
      if (revA > revB) return 1;
      return 0;
  })

MigrationsModel.sync().then(() => {
    MigrationsModel.findOne({
        order: [ [ 'createdAt', 'DESC' ] ],
    }).then((lm) => {
        const lastMigration = lm
            ? {
                id: lm.id,
                pos: lm.pos,
                rev: lm.revision,
                name: lm.name
            } : {
                pos: 0,
                rev: 0
            };

        console.log(`Last known migration rev: ${lastMigration.rev}, pos: ${lastMigration.pos}`);
        if (lastMigration.name)
            console.log(`name: ${lastMigration.name}`)

        if (options.rev) {
            console.log(`Force set revision to ${options.rev}, pos: 0`)
            lastMigration.rev = options.rev ? parseInt(options.rev) : initialState.revision;
            lastMigration.pos = 0
        }

        // remove all migrations before fromRevision
        const toExecute = migrationFiles.filter((file) => {
            const rev = parseInt(path.basename(file).split('-',2)[0]);
            return (rev >= lastMigration.rev);
        });

        console.log("Migrations to execute:");
        toExecute.forEach((file) => {
            console.log("\t"+file);
        });

        if (options.list)
            process.exit(0);

        let fromPos = lastMigration.pos ? lastMigration.pos + 1 : 0
        let currentRevision = 0

        queryInterface.logMigration = function(error, command, index, info) {
            const migrationName = `${info.name}`
            return new Promise((resolve) => {
                if (error) {
                    console.log('==================================================');
                    console.log(`Migration (${migrationName}) step #${index} failed`);
                    console.log('Command: '+ JSON.stringify(command, false, 2));
                    console.log('Error', error);
                    console.log('==================================================');
                } else {
                    console.log(`Migration (${migrationName}) step #${index} success`);
                    MigrationsModel.create({ revision: currentRevision, pos: index, name: info.name }).then(() => {
                        resolve();
                    })
                }
            })
        }

        Async.eachSeries(toExecute,
            function (file, cb) {
                console.log("Execute migration from file: "+file);
                currentRevision = parseInt(path.basename(file).split('-',2)[0]);
                migrate.executeMigration(queryInterface, path.join(migrationsDir, file), fromPos, cb);

                // set pos to 0 for next migration
                fromPos = 0;
            },
            function(err) {
                if (err) {
                    process.exit(1)
                }
                process.exit(0);
            }
        );
    }, (err) => {
        console.log("Error", err)
        process.exit(1)
    })
}, () => {
    console.log("Can't sync _migrations model")
    process.exit(1)
})
