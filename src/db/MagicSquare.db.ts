// TODO: @anukulpandey remove after campaign is over
import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
} from "sequelize-typescript";

export class MagicSquareEntity extends Model<MagicSquareEntity> {
  @PrimaryKey
  @Column(DataType.STRING)
  msUserId!: string;

  @PrimaryKey
  @Column(DataType.STRING)
  eventType!: string;

  @PrimaryKey
  @Column(DataType.STRING)
  network!: string;

  @Column(DataType.STRING)
  address!: string;

  @Column(DataType.INTEGER)
  eventCount!: number;
}

@Table({ tableName: "magicsquare", modelName: "MagicSquare" })
export class MagicSquare extends MagicSquareEntity {}
