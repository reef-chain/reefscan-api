// TODO @anukulpandey: remove after campaign is over
import { Router } from 'express';
import { sequelize } from '../db/sequelize.db';
import { MagicSquare } from '../db/MagicSquare.db';
MagicSquare

const router = Router();

interface MagicSquareParams {
    vid:string;
    eventId:string;
    address:string;
    eventsCount:number;
}

router.post('/', async (req, res) => {
    try {
        const { vid, eventId, address, eventsCount }:MagicSquareParams = req.body;
        let magicSquareRecord = await sequelize.getRepository(MagicSquare).findOne({
            where: {
                vid: vid,
                eventId: eventId
            }
        });
        if (magicSquareRecord) {
            magicSquareRecord.eventsCount = eventsCount;
            await magicSquareRecord.save();
        } else {
            await sequelize.getRepository(MagicSquare).create({
                vid: vid,
                eventId: eventId,
                address: address,
                eventsCount: eventsCount
            } as any);
        }

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
