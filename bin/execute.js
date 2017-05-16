const path              = require("path");

const commandLineArgs = require('command-line-args');

const optionDefinitions = [
    { name: 'file', alias: 'f', type: String, description: 'Migration file name',},
    { name: 'pos', alias: 'p', type: Number, description: 'Run migration at pos', defaultOption: 0 }
//    { name: 'revision', type: Number, description: 'Force set the revision' }
];

const options = commandLineArgs(optionDefinitions);

let migrationsDir = path.join(process.env.PWD, 'migrations'),
    modelsDir     = path.join(process.env.PWD, 'models');

const Sequelize = require("sequelize");
const sequelize = require(modelsDir).sequelize;
const queryInterface = sequelize.getQueryInterface();

const mig = require(path.join(migrationsDir, options.file));
if (options.pos && options.pos > 0)
{
    console.log("Set position to "+options.pos);
    mig.pos = options.pos;
}   
mig.up(queryInterface, Sequelize);
