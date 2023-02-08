import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
} from "sequelize-typescript";

export class VerifiedContractEntity extends Model<Partial<VerifiedContractEntity>> {
  @PrimaryKey
  @Column(DataType.STRING)
  address!: string;

  @Column(DataType.JSON)
  args!: any;

  @Column(DataType.STRING)
  compilerVersion!: string;

  @Column(DataType.STRING)
  filename!: string;

  @Column(DataType.STRING)
  name!: string;

  @Column(DataType.BOOLEAN)
  optimization!: boolean;

  @Column(DataType.INTEGER)
  runs!: number;

  @Column(DataType.JSON)
  source!: any;

  @Column(DataType.STRING)
  target!: string;

  @Column(DataType.STRING)
  license!: string;

  @Column(DataType.DOUBLE)
  timestamp!: number;
}

@Table({ tableName: "verified_contract_mainnet", modelName: "VerifiedContractMainnet" })
export class VerifiedContractMainnet extends VerifiedContractEntity {}

@Table({ tableName: "verified_contract_testnet", modelName: "VerifiedContractTestnet" })
export class VerifiedContractTestnet extends VerifiedContractEntity {}