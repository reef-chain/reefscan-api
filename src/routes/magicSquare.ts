// TODO @anukulpandey: remove after campaign is over
import { Router } from 'express';
import { sequelize } from '../db/sequelize.db';
import { MagicSquare } from '../db/MagicSquare.db';
import axios from 'axios';


const router = Router();

const baseUrl = "https://magic.lol/4bbad3f1"
type Network = 'mainnet' | 'testnet';
enum EventType {
    'swap' = 7,
};

interface MagicSquareParams {
    msUserId:string;
    eventType:EventType;
    network:Network;
    address:string;
}

router.post('/', async (req, res) => {
    try {
        const { msUserId, eventType, network, address }:MagicSquareParams = req.body;

        let magicSquareRecord: MagicSquare | null = await sequelize.getRepository(MagicSquare).findOne({
            where: {
                msUserId,
                eventType,
                network
            }
        });
        if (magicSquareRecord) {
            magicSquareRecord.eventCount +=1;
            await magicSquareRecord.save();
        } else {
            await sequelize.getRepository(MagicSquare).create({
                msUserId,
                eventType,
                network,
                address,
                eventCount: 0
            } as any);
        }
        await axios.get(`${baseUrl}/v`, {
            params: {
              vid: msUserId,
                action: EventType[eventType],
                lp:353,
                affid:7540086315
            }
          });
        res.status(200).send({
            data: "updated data successfully"
        });
        return;
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            error: "Internal Server Error"
        });
    }
});

export default router;
