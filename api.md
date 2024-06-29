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
