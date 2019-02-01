# sequelize-auto-migrations
Migration generator &amp;&amp; runner for sequelize

This package provide two tools:
* `makemigration` - tool for create new migrations
* `runmigration` - tool for apply created by first tool migrations

## Install
`npm install sequelize-auto-migrations`

## Usage
* Init sequelize, with sequelize-cli, using `sequelize init`
* Create your models
* Create initial migration - run:

`makemigration --name <migration name>`
* Change models and run it again, model difference will be saved to the next migration

To preview new migration, without any changes, you can run:

`makemigration --preview`

`makemigration` tool creates `_current.json` file in `migrations` dir, that is used to calculate difference to the next migration. Do not remove it!

## Executing migrations
There is simple tool to perform all created migrations (from selected revision):
`runmigration`

* To select a revision, use `--rev <x>`. You need this only first time, to continue after upgrade to 1.1.0.
* To see pending migrations, use `-l`.

From version 1.1.0 `runmigration` saves current state and execution history in the table `_migrations` in your database.
It will use this table to remember and continue after last executed migration. You can change this, using `migrations-table` key in `.sequelizerc`.
Only migrations created after version 1.1.0 will be logged to `_migrations`.

For more information, use `makemigration --help`, `runmigration --help`

## TODO:
* Migration action sorting procedure need some fixes. When many foreign keys in tables, there is a bug with action order. Now, please check it manually (`--preview` option)
* Need to check (and maybe fix) field types: `BLOB`, `RANGE`, `ARRAY`, `GEOMETRY`, `GEOGRAPHY`
* Downgrade is not supported, add it
