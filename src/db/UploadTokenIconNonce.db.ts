import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
} from "sequelize-typescript";

export class UploadIconTokenEntity extends Model<Partial<UploadIconTokenEntity>> {
  @PrimaryKey
  @Column(DataType.STRING)
  address!: string;

  @Column(DataType.INTEGER)
  nonce!: number;
}

@Table({ tableName: "upload_token_icon_mainnet", modelName: "UploadTokenIconMainnet" })
export class UploadTokenIconMainnet extends UploadIconTokenEntity {}

@Table({ tableName: "upload_token_icon_testnet", modelName: "UploadTokenIconTestnet" })
export class UploadTokenIconTestnet extends UploadIconTokenEntity {}
