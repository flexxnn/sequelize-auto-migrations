const fs                = require("fs");
const path              = require("path");
const _                 = require("lodash");

const Async             = require("async");

const commandLineArgs = require('command-line-args');

const optionDefinitions = [
    { name: 'file', alias: 'f', type: String, description: 'Migration file name',},
//    { name: 'revision', type: Number, description: 'Force set the revision' }
];

const options = commandLineArgs(optionDefinitions);

let migrationsDir = path.join(process.env.PWD, 'migrations'),
    modelsDir     = path.join(process.env.PWD, 'models');

const Sequelize = require("sequelize");
const sequelize = require(modelsDir).sequelize;
const queryInterface = sequelize.getQueryInterface();

require(path.join(migrationsDir, options.file)).up(queryInterface, Sequelize);







