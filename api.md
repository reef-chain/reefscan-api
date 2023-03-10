# API

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


## Verify all from backup
Triggers verification for contracts stored in backup database.
This end point is protected by admin password.

**URL** : `/verification/verify-from-backup`

**Method** : `POST`

**Request body**
| Name           |  Type  |
| -------------- | :----: |
| password       | string |


## Export backup
Saves backup database verified contracts into local files. This files can be used to populate the database on startup if env variable `IMPORT_BACKUP_ON_START` is set to true.
This end point is protected by admin password.

**URL** : `/verification/export-backup`

**Method** : `POST`

**Request body**
| Name           |  Type  |
| -------------- | :----: |
| password       | string |


## Get REEF price

**URL** : `/price/reef`

**Method** : `GET`

**Return data** :

| Name           |   Type    |
|----------------|:---------:|
| usd            |  number   |
| usd_24h_change |  number   |
| timestamp      | timestamp |
