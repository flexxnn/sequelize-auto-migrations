# sequelize-auto-migrations
Migration generator &amp;&amp; runner for sequelize

## Usage
* Init sequelize, with sequelize-cli, using `sequelize init`
* Create your models
* To create initial migration - run `node ./node_modules/sequelize-auto-migrations/bin/makemigration --name <migration name>`
* After changing models run it again, new migration file difference will be created

To see new migration, without any changes, you can run 
`node ./node_modules/sequelize-auto-migrations/bin/makemigration --preview`
