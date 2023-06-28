# REEF Subsquid API

## Commands

Install dependencies:
```
yarn
```

Build project:
```
yarn build
```

Start:
```
yarn start
```

Start in development:
```
yarn dev
```

Run tests:
```
yarn test
```

## API

**Find contract** : [`/contract/:address`](api.md/#find-contract)

**Get verification status** : [`/verification/status`](api.md/#get-verification-status)

**Submit verification request** : [`/verification/submit`](api.md/#submit-verification)

**Get verified contract** : [`/verification/contract/:address`](api.md/#get-verified-contract)

**Verify all from backup**: [`/verification/verify-from-backup`](api.md/#verify-all-from-backup)

**Export backup**: [`/verification/export-backup`](api.md/#export-backup)

**Set contract approved**: [`/verification/set-contract-approved`](api.md/#set-contract-approved)

**Get REEF price**: [`/price/reef`](api.md/#get-reef-price)


## DB Migrations

Whenever the DB schema changes, it is required to create a new migration file. To do so:
- Create a new file in the `migrations` folder with the following name format: `YYYYMMDDHHmmss_migration_name.ts`. This can be done manually or by installing the Sequelize CLI (`npm install -g sequelize-cli`) running `sequelize migration:generate --name addNewColumn`.
- Add the migration code to the newly created file. The existing migrations can be used as a reference.

The migrations will be run automatically when the app starts.