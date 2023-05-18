import {
    Table,
    Column,
    Model,
    PrimaryKey,
    DataType,
  } from "sequelize-typescript";
  
  export class UploadIconEntity extends Model<Partial<UploadIconEntity>> {
    @PrimaryKey
    @Column(DataType.STRING)
    address!: string;
  
    @Column(DataType.BOOLEAN)
    pending!: boolean;
  
    @Column(DataType.INTEGER)
    filesize!: number;
  }
  
  @Table({ tableName: "upload_icon_mainnet", modelName: "UploadIconMainnet" })
  export class uploadIconMainnet extends UploadIconEntity {}
  
  @Table({ tableName: "upload_icon_testnet", modelName: "UploadIconTestnet" })
  export class uploadIconTestnet extends UploadIconEntity {}