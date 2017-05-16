#!/bin/node

const commandLineArgs = require('command-line-args');
const beautify          = require('js-beautify').js_beautify;

let migrate = require("../lib/migrate")

const fs                = require("fs");
const path              = require("path");
const _                 = require("lodash");

const optionDefinitions = [
    { name: 'name', alias: 'n', type: String, description: 'Migration name',},
    { name: 'comment', alias: 'c', type: String, description: 'Micgarion comment' },
    { name: 'preview', alias: 'p', type: Boolean, description: 'Show migration preview (does not change any files)' },
//    { name: 'revision', type: Number, description: 'Force set the revision' }
];

const options = commandLineArgs(optionDefinitions);

console.log(options);

let migrationsDir = path.join(process.env.PWD, 'migrations'),
    modelsDir     = path.join(process.env.PWD, 'models');

// current state
const currentState = {
    tables: {}
};
    
// load last state
let previousState = {
    revision: 0,
    version: 1,
    tables: {}
};
    
try {
    previousState = JSON.parse(fs.readFileSync(path.join(migrationsDir, '_current.json') ));
} catch (e) { }

//console.log(path.join(migrationsDir, '_current.json'), JSON.parse(fs.readFileSync(path.join(migrationsDir, '_current.json') )))

let sequelize = require(modelsDir).sequelize;

let models = sequelize.models;

currentState.tables = migrate.reverseModels(sequelize, models);
    
let actions = migrate.parseDifference(previousState.tables, currentState.tables);

// sort for actions    
migrate.sortActions(actions);
// sort again for dependences
migrate.sortActions(actions);
    
let migration = migrate.getMigration(actions);

if (migration.commandsUp.length === 0)
{
    console.log("No changes found");
    process.exit(0);
}

// log migration actions
_.each(migration.consoleOut, (v) => { console.log ("[Actions] "+v)});

if (options.preview)
{
    console.log("Migration result:");
    console.log(beautify( "[ \n" + migration.commandsUp.join(", \n") +' \n];\n') );
    process.exit(0);
}

// backup _current file
if (fs.existsSync(path.join(migrationsDir, '_current.json')))
    fs.writeFileSync(path.join(migrationsDir, '_current_bak.json'),
        fs.readFileSync(path.join(migrationsDir, '_current.json'))
    );


// save current state
currentState.revision = previousState.revision + 1;
fs.writeFileSync(path.join(migrationsDir, '_current.json'), JSON.stringify(currentState, null, 4) );

// write migration to file
migrate.writeMigration(currentState.revision, 
               migration,
               migrationsDir,
               (options.name) ? options.name : 'noname',
               (options.comment) ? options.comment: '');

console.log(`Created new migration to revision ${currentState.revision}`);
