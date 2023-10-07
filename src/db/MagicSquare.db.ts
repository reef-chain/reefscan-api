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
  vid!: string;

  @PrimaryKey
  @Column(DataType.STRING)
  eventId!: string;

  @Column(DataType.STRING)
  address!: string;

  @Column(DataType.INTEGER)
  eventsCount!: number;
}

@Table({ tableName: "magicsquare", modelName: "MagicSquare" })
export class MagicSquare extends MagicSquareEntity {}