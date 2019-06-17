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

To create and then execute migration, use:
`makemigration --name <name> -x`

## Executing migrations
* There is simple command to perform all created migrations (from selected revision):

`runmigration`
* To select a revision, use `--rev <x>`
* To prevent execution of next migrations, use `--one`
* To rollback/downgrade to the selected revision, use `--rollback`

Each migration runs in a transaction, so it will be rolled back if part of it fails. To disable, use `--no-transaction`. Then, if it fails, you can continue by using `--pos <x>`.


For more information, use `makemigration --help`, `runmigration --help`

## TODO:
* Migration action sorting procedure need some fixes. When many foreign keys in tables, there is a bug with action order. Now, please check it manually (`--preview` option)
* Need to check (and maybe fix) field types: `BLOB`, `RANGE`, `ARRAY`, `GEOMETRY`, `GEOGRAPHY`
* This module tested with postgresql (I use it with my projects). Test with mysql and sqlite.
