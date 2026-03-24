# Public endpoints

## Find contract

**URL** : `/contract/:address`

**Method** : `GET`

**Return data** :

| Name           |  Type  |
| -------------- | :----: |
| address        | string |
| bytecode       | string |
| compiledData   | JSON |
| source         | JSON |
| args           | any[] |
| name           | string |
| filename       | string |


## Get verification status

**URL** : `/verification/status`

**Method** : `POST`

**Request body**
| Name           |  Type  |
| -------------- | :----: |
| id        | string |

**Return data**:

boolean


## Submit verification

**URL** : `/verification/submit`

**Method** : `POST`

**Request body**
| Name           |  Type  |
| -------------- | :----: |
| name        | string |
| runs        | number |
| source        | string |
| target        | string |
| address        | string |
| filename        | string |
| license        | string |
| arguments        | string |
| optimization        | string |
| compilerVersion        | string |
| blockHeight | number |

> `blockHeight` is an optional parameter. If set, the verification service will wait until block height is reached in the explorer. This is useful in case the verification is triggered programmatically on contract deployment, as it is possible that the contract creation has yet not been processed by the explorer application at the time the verification service is run.

**Return data**:

string


## Get verified contract

**URL** : `/verification/contract/:address`

**Method** : `GET`

**Return data**
| Name           |  Type  |
| -------------- | :----: |
| id        | string |
| name        | string |
| filename        | string |
| source        | string |
| runs        | number |
| optimization        | string |
| compilerVersion        | string |
| compiledData        | JSON |
| args        | any[] |
| target        | string |
| type        | string |
| contractData        | JSON |
| timestamp        | Date |


## Get verified contract

**URL** : `/verification/verified-contracts-count`

**Method** : `GET`

**Return data**
| Name         |  Type  |
| ------------ | :----: |
| count        | number |


## Get REEF price

**URL** : `/price/reef`

**Method** : `GET`

**Return data** :

| Name           |   Type    |
|----------------|:---------:|
| usd            |  number   |
| usd_24h_change |  number   |
| timestamp      | timestamp |


## Get LetsExchange source currencies

Returns active LetsExchange source currencies and networks that can be used as starting points for swaps into REEF. The quote endpoints remain the source of truth for pair availability at request time.

**URL** : `/letsexchange/listcurrencies`

**Method** : `GET`

**Query params**

| Name          |   Type   |            |
| ------------- | :------: | ---------- |
| search        |  string  | (optional) |
| limit         |  number  | (optional) |
| partnerUserIp |  string  | (optional) |

**Return data** :

An array of currency-network entries with fields such as `symbol`, `name`, `network`, `networkName`, `icon`, `hasExtra`, `extraName`, `explorer`, `contractAddress`, `validationAddressRegex`, `validationAddressExtraRegex`, `defaultNetwork`, and `defaultNetworkName`.


## Get LetsExchange REEF quote

Gets a quote for swapping a source currency into REEF using a deposit amount.

**URL** : `/letsexchange/quote`

**Method** : `POST`

**Request body**

| Name          |   Type   |            |
| ------------- | :------: | ---------- |
| fromSymbol    |  string  |            |
| fromNetwork   |  string  |            |
| amount        |  number  |            |
| isFloat       | boolean  | (optional) |
| promocode     |  string  | (optional) |
| partnerUserIp |  string  | (optional) |

**Return data** :

LetsExchange quote payload for a REEF destination, including fields such as `amount`, `rate`, `min_amount`, `max_amount`, `withdrawal_fee`, `rate_id`, and `rate_id_expired_at`.


## Get LetsExchange REEF quote by target amount

Gets a quote for swapping a source currency into REEF using the desired REEF amount.

**URL** : `/letsexchange/quote-revert`

**Method** : `POST`

**Request body**

| Name            |   Type   |            |
| --------------- | :------: | ---------- |
| fromSymbol      |  string  |            |
| fromNetwork     |  string  |            |
| withdrawalAmount|  number  |            |
| isFloat         | boolean  | (optional) |
| promocode       |  string  | (optional) |
| partnerUserIp   |  string  | (optional) |

**Return data** :

LetsExchange reverse-quote payload for a REEF destination, including the required source amount, rate information, and limits.


## Create LetsExchange REEF swap

Creates a LetsExchange transaction that sends REEF to the provided withdrawal address. Provide exactly one of `depositAmount` or `withdrawalAmount`.

**URL** : `/letsexchange/create-exchange`

**Method** : `POST`

**Request body**

| Name             |   Type   |            |
| ---------------- | :------: | ---------- |
| fromSymbol       |  string  |            |
| fromNetwork      |  string  |            |
| withdrawalAddress|  string  |            |
| depositAmount    |  number  | (optional) |
| withdrawalAmount |  number  | (optional) |
| isFloat          | boolean  | (optional) |
| withdrawalExtraId|  string  | (optional) |
| refundAddress    |  string  | (optional) |
| refundExtraId    |  string  | (optional) |
| rateId           |  string  | (optional) |
| promocode        |  string  | (optional) |
| email            |  string  | (optional) |
| partnerUserIp    |  string  | (optional) |

> `rateId` is required when `isFloat` is `false`.

**Return data** :

LetsExchange transaction payload, including fields such as `transaction_id`, `status`, `deposit`, `deposit_amount`, `withdrawal_amount`, `rate`, `expired_at`, and explorer URLs.


## Get LetsExchange transaction

**URL** : `/letsexchange/transaction/:id`

**Method** : `GET`

**Return data** :

LetsExchange transaction details for the provided transaction ID.


## Get LetsExchange transaction status

**URL** : `/letsexchange/transaction/:id/status`

**Method** : `GET`

**Return data** :

LetsExchange transaction status as a string such as `wait`, `confirming`, or `success`.


# Admin endpoints

## Verify from backup
Triggers verification for contracts `verified_contract` table.
This end point is protected by admin password.

**URL** : `/verification/verify-from-backup`

**Method** : `POST`

**Request body**
| Name           |  Type  |            |
| -------------- | :----: | ---------- |
| password       | string |            | 
| limit          | number | (optional) |
| squidVersion   | number | (optional) |


## Backup from Squid
Clears `verified_contract` table and populates it with data from Explorer Squid endpoint.
This end point is protected by admin password.

**URL** : `/verification/backup-from-squid`

**Method** : `POST`

**Request body**
| Name           |  Type  |            |
| -------------- | :----: | ---------- |
| password       | string |            |
| squidVersion   | number | (optional) |


## Export backup
Saves `verified_contract` table data into JSON files. This files can be used to populate the database via `import-backup` endpoint.
This end point is protected by admin password.

**URL** : `/verification/export-backup`

**Method** : `POST`

**Request body**
| Name           |  Type  |
| -------------- | :----: |
| password       | string |


## Import backup
Clears `verified_contract` table and populates it with data from JSON files.
This end point is protected by admin password.

**URL** : `/verification/import-backup`

**Method** : `POST`

**Request body**
| Name           |  Type  |
| -------------- | :----: |
| password       | string |


## Set contract approved
Whitelists a verified contract in explorer API.
This end point is protected by admin password.

**URL** : `/verification/set-contract-approved`

**Method** : `POST`

**Request body**
| Name           |  Type   |            |
| -------------- | :-----: | ---------- |
| address        | string  |            |
| approved       | boolean |            |
| password       | string  |            |
| squidVersion   | number  | (optional) |
