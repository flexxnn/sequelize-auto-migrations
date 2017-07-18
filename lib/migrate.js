const Sequelize         = require("sequelize");
const hash              = require("object-hash");
const _                 = require("lodash");
const diff              = require('deep-diff').diff;
const beautify          = require('js-beautify').js_beautify;

const fs                = require("fs");
const path              = require("path");

let log                 = console.log;

const reverseSequelizeColType = function(col, prefix = 'Sequelize.') 
{
    let attrObj = col['type'];
    let options = (col['type']['options']) ? col['type']['options'] : {};

    // Sequelize.CHAR
    if (attrObj instanceof Sequelize.CHAR)
    {
        if (options.binary)
            return prefix + 'CHAR.BINARY';
            
        return prefix + 'CHAR('+options.length+')';
    }
    
    // Sequelize.STRING
    if (attrObj instanceof Sequelize.STRING)
    {
        return prefix + 'STRING' + ( (options.length) ? '('+options.length+')' : '' ) +
            ((options.binary) ? '.BINARY' : '');
    }
    
    // Sequelize.TEXT
    if (attrObj instanceof Sequelize.TEXT)
    {
        if (!options.length)
            return prefix + 'TEXT';
            
        return prefix + 'TEXT('+options.length.toLowerCase()+')';
    }
    
    // Sequelize.NUMBER:
    // INTEGER, BIGINT, FLOAT, REAL, DOUBLE
    if (attrObj instanceof Sequelize.NUMBER)
    {
        let ret = attrObj.key;
        if (options.length)
        {
            ret += '('+options.length;
            if (options.decimals)
                ret += ', ' + options.decimals;
            ret += ')';
        }
        
        ret = [ ret ];

        if (options.zerofill)
            ret.push('ZEROFILL');
            
        if (options.unsigned)
            ret.push('UNSIGNED');
        
        return prefix + ret.join('.');
    }
    
    // Sequelize.ENUM
    if (attrObj instanceof Sequelize.ENUM)
        return prefix + "ENUM('" +options.values.join("', '")+"')";

    // Simple types
    if (attrObj instanceof Sequelize.BOOLEAN)
        return prefix + 'BOOLEAN';

    if (attrObj instanceof Sequelize.TIME)
        return prefix + 'TIME';
        
    if (attrObj instanceof Sequelize.DATEONLY)
        return prefix + 'DATEONLY';        
        
    if (attrObj instanceof Sequelize.DATE)
        return prefix + 'DATE';

    // Not documented, really?
    if (attrObj instanceof Sequelize.HSTORE)
        return prefix + 'HSTORE';

    if (attrObj instanceof Sequelize.JSONB)
        return prefix + 'JSONB';
    
    if (attrObj instanceof Sequelize.JSON)
        return prefix + 'JSON';    

    if (attrObj instanceof Sequelize.UUID)
        return prefix + 'UUID';

    // Virtual data type, we must to skip it
    if (attrObj instanceof Sequelize.VIRTUAL)
        return prefix + 'VIRTUAL';

    return undefined;

    // other types
    //if(typeof attrObj['options'] !== 'undefined' && typeof attrObj['options'].toString === 'function')
    //    return attrObj['options'].toString(sequelize);    
    
    // @todo
    // BLOB
    // RANGE
    // ARRAY
    // GEOMETRY
    // GEOGRAPHY
};

const reverseSequelizeDefValueType = function(defaultValue, prefix = 'Sequelize.') 
{ 
    if (defaultValue instanceof Sequelize.NOW)
        return { internal: true, value: prefix + 'NOW' };
    
    if (defaultValue instanceof Sequelize.UUIDV1)
        return { internal: true, value: prefix + 'UUIDV1' };

    if (defaultValue instanceof Sequelize.UUIDV4)
        return { internal: true, value: prefix + 'UUIDV4' };
    
    if (typeof defaultValue === 'function')
        return { notSupported: true, value: '' };
        
    return { value: defaultValue };
};

const parseIndex = function(idx) 
{
    delete idx.parser;
    if (idx.type == "")
        delete idx.type;
    
    let options = { };
    
    if (idx.name) 
        options.indexName = idx.name; // The name of the index. Default is __
        
    // @todo: UNIQUE|FULLTEXT|SPATIAL
    if (idx.unique) 
        options.indicesType = 'UNIQUE';
        
    if (idx.method)
        options.indexType = idx.type; // Set a type for the index, e.g. BTREE. See the documentation of the used dialect

    if (idx.parser && idx.parser != "")
        options.parser = idx.parser; // For FULLTEXT columns set your parser
    
    idx.options = options;

    idx.hash = hash(idx);

//    log ('PI:', JSON.stringify(idx, null, 4));
    return idx;
};

const reverseModels = function(sequelize, models)
{
    let tables = {};
    
    delete models.default;
    
    for (let model in models)
    {
        let attributes = models[model].attributes;
    
        for (let column in attributes)
        {
            delete attributes[column].Model;
            delete attributes[column].fieldName;
            delete attributes[column].field;
            
            for(let property in attributes[column]) 
            {
                if(property.startsWith('_'))
                {
                    delete attributes[column][property];
                    continue;
                }
                
                if (property === 'defaultValue')
                {
                    let _val = reverseSequelizeDefValueType(attributes[column][property]);
                    if (_val.notSupported)
                    {
                        log(`[Not supported] Skip defaultValue column of attribute ${model}:${column}`);
                        delete attributes[column][property];
                        continue;
                    }
                    attributes[column][property] = _val;
                }
                
                // remove getters, setters...
                if (typeof attributes[column][property] == 'function')
                    delete attributes[column][property];
            }
            
            if(typeof attributes[column]['type'] === 'undefined')
            {
                log(`[Not supported] Skip column with undefined type ${model}:${column}`);
                delete attributes[column];
                continue;
            }
            
            let seqType = reverseSequelizeColType(attributes[column]);
            
            // NO virtual types in migration
            if (seqType === 'Sequelize.VIRTUAL')
            {
                log(`[SKIP] Skip Sequelize.VIRTUAL column "${column}"", defined in model "${model}"`);
                delete attributes[column];
                continue;
            }
            
            if (!seqType)
            {
                if(typeof attributes[column]['type']['options'] !== 'undefined' && typeof attributes[column]['type']['options'].toString === 'function')
                    seqType = attributes[column]['type']['options'].toString(sequelize);
                    
                if(typeof attributes[column]['type'].toString === 'function') 
                    seqType = attributes[column]['type'].toString(sequelize);            
            }
            
            attributes[column]['seqType'] = seqType;
            
            delete attributes[column].type;
            delete attributes[column].values; // ENUM
        }
    
        tables[models[model].tableName] = {
            tableName: models[model].tableName,
            schema: attributes
        };
    
        if (models[model].options.indexes.length > 0)
        {
            let idx_out = {};
            for (let _i in models[model].options.indexes)
            {
                let index = parseIndex(models[model].options.indexes[_i]);
                idx_out[index.hash+''] = index;
                delete index.hash;
                
                // make it immutable
                Object.freeze(index);
            }
            models[model].options.indexes = idx_out;
        }
        
        tables[models[model].tableName].indexes = models[model].options.indexes;
    }
    
    return tables;
};

const parseDifference = function(previousState, currentState)
{
//    log(JSON.stringify(currentState, null, 4));
    let actions = [];
    let difference = diff(previousState, currentState);
    
    for(let _d in difference) 
    {
        let df = difference[_d];
    //    log (JSON.stringify(df, null, 4));
        switch (df.kind) 
        {
            // add new
            case 'N':
            {
                // new table created
                if (df.path.length === 1)
                {
                    let depends = [];
                    let tableName = df.rhs.tableName;
                    _.each(df.rhs.schema, (v) => { if ( v.references ) depends.push(v.references.model)});
                    
                    actions.push({
                        actionType: 'createTable',
                        tableName: tableName,
                        attributes: df.rhs.schema,
                        options: {},
                        depends: depends
                    });
                    
                    // create indexes
                    if (df.rhs.indexes)
                        for(let _i in df.rhs.indexes)
                        {
                            actions.push(_.extend({
                                actionType: 'addIndex', 
                                tableName: tableName,
                                depends: [ tableName ]
                            }, _.clone(df.rhs.indexes[_i])));
                        }
                    break;
                }
                
                let tableName = df.path[0];
                let depends = [tableName];
                        
                if (df.path[1] === 'schema')
                {
                    // if (df.path.length === 3) - new field
                    if (df.path.length === 3)
                    {
                        // new field
                        if (df.rhs && df.rhs.references)
                            depends.push(df.rhs.references.model);
                        
                        actions.push({
                            actionType: 'addColumn',
                            tableName: tableName,
                            attributeName: df.path[2],
                            options: df.rhs,
                            depends: depends
                        });
                        break;
                    }
                    
                    // if (df.path.length > 3) - add new attribute to column (change col)            
                    if (df.path.length > 3)
                    {
                        if (df.path[1] === 'schema')
                        {                
                            // new field attributes
                            let options = currentState[tableName].schema[df.path[2]];
                            if (options.references)
                                depends.push(options.references.nodel);
                            
                            actions.push({
                                actionType: 'changeColumn',
                                tableName: tableName,
                                attributeName: df.path[2],
                                options: options,
                                depends: depends
                            });
                            break;
                        }
                    }                
                }
    
                // new index
                if (df.path[1] === 'indexes')
                {
                    let tableName = df.path[0];
                    let index = _.clone(df.rhs);
                    index.actionType = 'addIndex';
                    index.tableName = tableName;
                    index.depends = [ tableName ];
                    actions.push(index);
                    break;
                }
            }
            break;
            
            // drop
            case 'D':
            {
                let tableName = df.path[0];
                let depends = [tableName];
                
                if (df.path.length === 1)
                {
                    // drop table
                    actions.push({
                        actionType: 'dropTable',
                        tableName: tableName,
                        depends: []
                    });
                    break;
                }
                
                if (df.path[1] === 'schema')
                {
                    // if (df.path.length === 3) - drop field
                    if (df.path.length === 3)
                    {
                        // drop column
                        actions.push({
                            actionType: 'removeColumn',
                            tableName: tableName,
                            columnName: df.path[2],
                            depends: [ tableName ]
                        });
                        break;
                    }
                    
                    // if (df.path.length > 3) - drop attribute from column (change col)            
                    if (df.path.length > 3)
                    {
                        // new field attributes
                        let options = currentState[tableName].schema[df.path[2]];
                        if (options.references)
                            depends.push(options.references.nodel);
                        
                        actions.push({
                            actionType: 'changeColumn',
                            tableName: tableName,
                            attributeName: df.path[2],
                            options: options,
                            depends: depends
                        });
                        break;
                    }                  
                }
                
                if (df.path[1] === 'indexes')
                {
//                    log(df)
                     actions.push({
                         actionType: 'removeIndex',
                         tableName: tableName,
                         fields: df.lhs.fields,
                         options: df.lhs.options,
                         depends: [ tableName ]
                     });
                     break;
                }
            }
            break;
                
            // edit
            case 'E':
            {
                let tableName = df.path[0];
                let depends = [tableName];
                
                if (df.path[1] === 'schema')
                {
                    // new field attributes
                    let options = currentState[tableName].schema[df.path[2]];
                    if (options.references)
                        depends.push(options.references.nodel);
                    
                    actions.push({
                        actionType: 'changeColumn',
                        tableName: tableName,
                        attributeName: df.path[2],
                        options: options,
                        depends: depends
                    });
                }
            }
            break;
    
            // array change indexes
            case 'A':
            {
                log("[Not supported] Array model changes! Problems are possible. Please, check result more carefully!");
                log("[Not supported] Difference: ");
                log(JSON.stringify(df, null, 4));
            }
            break;
            
            default:
                // code
                break;
        }
    }
    return actions;
};


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

const sortActions = function(actions)
{
    const orderedActionTypes = [
        'removeIndex',
        'removeColumn',       
        'dropTable',
        'createTable',
        'addColumn',
        'changeColumn',
        'addIndex'
    ];
    
    //test
    //actions = shuffleArray(actions);
    
    actions.sort((a, b) => {
        if (orderedActionTypes.indexOf(a.actionType) < orderedActionTypes.indexOf(b.actionType))
            return -1;
        if (orderedActionTypes.indexOf(a.actionType) > orderedActionTypes.indexOf(b.actionType))
            return 1;  
            
        if (a.depends.length === 0 && b.depends.length > 0)
            return -1; // a < b
        if (b.depends.length === 0 && a.depends.length > 0)
            return 1; // b < a
            
        return 0;    
    });    
    
    for (let k = 0; k <= actions.length ; k++)
        for (let i = 0; i < actions.length ; i++)
        {
            if (!actions[i].depends)
                continue;
            if (actions[i].depends.length === 0)
                continue;
                
            let a = actions[i];
            
            for (let j = 0; j < actions.length; j++)
            {
                if (!actions[j].depends)
                    continue;
                if (actions[j].depends.length === 0)
                    continue;            
                    
                let b = actions[j];
                
                if (a.actionType != b.actionType)
                    continue;
                
                if (b.depends.indexOf(a.tableName) !== -1 && i > j)
                {
                    let c = actions[i];
                    actions[i] = actions[j];
                    actions[j] = c;
                }
    
            }
        }
};


const getMigration = function(actions) 
{
    let propertyToStr = (obj) => {
        let vals = [];
        for (let k in obj)
        {
            if (k === 'seqType')
            {
                vals.push('"type": '+obj[k]);
                continue;
            }
            
            if (k === 'defaultValue')
            {
                if (obj[k].internal)
                {
                    vals.push('"defaultValue": '+obj[k].value);
                    continue;
                }
                if (obj[k].notSupported)
                    continue;

                let x = {};
                x[k] = obj[k].value;
                vals.push(JSON.stringify(x).slice(1, -1));
                continue;
            }
            
            let x = {};
            x[k] = obj[k];
            vals.push(JSON.stringify(x).slice(1, -1));
        }
        
        return '{ ' + vals.reverse().join(', ') + ' }';
    };
    
    let getAttributes = (attrs) => {
        let ret = [];
        for (let attrName in attrs)
        {
            ret.push(`      "${attrName}": ${propertyToStr(attrs[attrName])}`);
        }
        return " { \n" + ret.join(", \n") + "\n     }";
    };

    let commandsUp = [];
    let consoleOut = [];
    
    for (let _i in actions)
    {
        let action = actions[_i];
        switch (action.actionType) 
        {
            case 'createTable':
            {
let resUp =`{ fn: "createTable", params: [
    "${action.tableName}",
    ${getAttributes(action.attributes)},
    ${JSON.stringify(action.options)}
] }`;
                commandsUp.push(resUp);
                
                consoleOut.push(`createTable "${action.tableName}", deps: [${action.depends.join(', ')}]`);
            }
            break;

            case 'dropTable':
            {
                let res = `{ fn: "dropTable", params: ["${action.tableName}"] }`;
                commandsUp.push(res);
                
                consoleOut.push(`dropTable "${action.tableName}"`);
            }
            break;
            
            case 'addColumn':
            {
let resUp = `{ fn: "addColumn", params: [
    "${action.tableName}",
    "${action.attributeName}",
    ${propertyToStr(action.options)}
] }`;

                commandsUp.push(resUp);

                consoleOut.push(`addColumn "${action.attributeName}" to table "${action.tableName}"`);
            }
            break;

            case 'removeColumn':
            {
                let res = `{ fn: "removeColumn", params: ["${action.tableName}", "${action.columnName}"] }`;
                commandsUp.push(res);
                
                consoleOut.push(`removeColumn "${action.columnName}" from table "${action.tableName}"`);
            }
            break;
            
            case 'changeColumn':
            {
let res = `{ fn: "changeColumn", params: [
    "${action.tableName}",
    "${action.attributeName}",
    ${propertyToStr(action.options)}
] }`;
                commandsUp.push(res);
                
                consoleOut.push(`changeColumn "${action.attributeName}" on table "${action.tableName}"`);
            }
            break;
            
            case 'addIndex':
            {
let res = `{ fn: "addIndex", params: [
    "${action.tableName}",
    ${JSON.stringify(action.fields)},
    ${JSON.stringify(action.options)}
] }`;
                commandsUp.push(res);
                
                let nameOrAttrs = (action.options && action.options.indexName && action.options.indexName != '') ? `"${action.options.indexName}"` : JSON.stringify(action.fields);
                consoleOut.push(`addIndex ${nameOrAttrs} to table "${action.tableName}"`);
            }
            break;
            
            case 'removeIndex':
            {
//                log(action)
                let nameOrAttrs = (action.options && action.options.indexName && action.options.indexName != '') ? `"${action.options.indexName}"` : JSON.stringify(action.fields);
                
let res = `{ fn: "removeIndex", params: [
    "${action.tableName}",
    ${nameOrAttrs}
] }`;
                commandsUp.push(res);
                
                consoleOut.push(`removeIndex ${nameOrAttrs} from table "${action.tableName}"`);
            }
            
            default:
                // code
        }
    }

    return { commandsUp, consoleOut };
};


const writeMigration = function(revision, migration, migrationsDir, name = '', comment = '')
{
    let _commands = "var migrationCommands = [ \n" + migration.commandsUp.join(", \n") +' \n];\n';
    let _actions = ' * ' + migration.consoleOut.join("\n * ");
    
    _commands = beautify(_commands);
    let info = {
        revision,
        name,
        created: new Date(),
        comment
    };
    
    let template = `'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
${_actions}
 *
 **/

var info = ${JSON.stringify(info, null, 4)};

${_commands}

module.exports = {
    pos: 0,
    up: function(queryInterface, Sequelize)
    {
        var index = this.pos;
        return new Promise(function(resolve, reject) {
            function next() {
                if (index < migrationCommands.length)
                {
                    let command = migrationCommands[index];
                    console.log("[#"+index+"] execute: " + command.fn);
                    index++;
                    queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                }
                else
                    resolve();
            }
            next();
        });
    },
    info: info
};
`;

    name = name.replace(' ', '_');
    let filename = path.join(migrationsDir, revision + ((name != '') ? `-${name}` : '') + '.js');

    fs.writeFileSync(filename, template);
    
    return {filename, info};
};

const executeMigration = function(queryInterface, filename, pos, cb)
{
    let mig = require(filename);
    
    if (!mig)
        return cb("Can't require file "+filename);
    
    if (pos > 0)
    {
        console.log("Set position to "+pos);
        mig.pos = pos;
    }
    
    mig.up(queryInterface, Sequelize).then(
        () => {
            cb();
        }, 
        (err) => {
            cb(err);
        }
    );
};

module.exports = { writeMigration, getMigration, sortActions, parseDifference, reverseModels, executeMigration };

