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

### Public endpoints

**Find contract** : [`/contract/:address`](api.md/#find-contract)

**Get verification status** : [`/verification/status`](api.md/#get-verification-status)

**Submit verification request** : [`/verification/submit`](api.md/#submit-verification)

**Get verified contract** : [`/verification/contract/:address`](api.md/#get-verified-contract)

**Get verified contracts count** : [`/verification/verified-contracts-count`](api.md/#get-verified-contracts-count)

**Get REEF price**: [`/price/reef`](api.md/#get-reef-price)

**LetsExchange source currencies for REEF swaps**: [`/letsexchange/listcurrencies`](api.md/#get-letsexchange-source-currencies)

**LetsExchange REEF quote**: [`/letsexchange/quote`](api.md/#get-letsexchange-reef-quote)

**LetsExchange REEF quote by target amount**: [`/letsexchange/quote-revert`](api.md/#get-letsexchange-reef-quote-by-target-amount)

**Create LetsExchange REEF swap**: [`/letsexchange/create-exchange`](api.md/#create-letsexchange-reef-swap)

**Get LetsExchange transaction**: [`/letsexchange/transaction/:id`](api.md/#get-letsexchange-transaction)

**Get LetsExchange transaction status**: [`/letsexchange/transaction/:id/status`](api.md/#get-letsexchange-transaction-status)


### Admin endpoints

**Verify from backup** _(DB => Squid)_: [`/verification/verify-from-backup`](api.md/#verify-from-backup)

**Backup from Squid** _(Squid => DB)_: [`/verification/backup-from-squid`](api.md/#create-backup-from-squid)

**Export backup** _(DB => JSON files)_: [`/verification/export-backup`](api.md/#export-backup)

**Import backup** _(JSON files => DB)_: [`/verification/import-backup`](api.md/#import-backup)

**Set contract approved**: [`/verification/set-contract-approved`](api.md/#set-contract-approved)


## DB Migrations

Whenever the DB schema changes, it is required to create a new migration file. To do so:
- Create a new file in the `migrations` folder with the following name format: `YYYYMMDDHHmmss_migration_name.ts`. This can be done manually or by installing the Sequelize CLI (`npm install -g sequelize-cli`) running `sequelize migration:generate --name addNewColumn`.
- Add the migration code to the newly created file. The existing migrations can be used as a reference.

The migrations will be run automatically when the app starts.

## Changelog

### March 20, 2026

- Added a new LetsExchange integration under `/letsexchange` to support swapping external currencies into REEF.
- Added public routes for source-currency discovery, quotes, reverse quotes, transaction creation, transaction lookup, and transaction status.
- Added LetsExchange route documentation in [`api.md`](api.md).
- Added configuration support for `LETSEXCHANGE_API_TOKEN`, optional `LETSEXCHANGE_API_URL`, and optional `LETSEXCHANGE_AFFILIATE_ID`.
