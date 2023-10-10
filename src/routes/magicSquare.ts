// TODO @anukulpandey: remove after campaign is over
import { Router } from 'express';
import { sequelize } from '../db/sequelize.db';
import { MagicSquare } from '../db/MagicSquare.db';
import axios from 'axios';
MagicSquare

const router = Router();

const baseUrl = "https://magic.lol/4bbad3f1/"

interface MagicSquareParams {
    vid:string;
    eventId:string;
    address:string;
}

router.post('/', async (req, res) => {
    try {
        const { vid, eventId, address }:MagicSquareParams = req.body;
        
        let magicSquareRecord = await sequelize.getRepository(MagicSquare).findOne({
            where: {
                vid: vid,
                eventId: eventId
            }
        });
        if (magicSquareRecord) {
            magicSquareRecord.eventsCount +=1;
            await magicSquareRecord.save();
        } else {
            await sequelize.getRepository(MagicSquare).create({
                vid: vid,
                eventId: eventId,
                address: address,
                eventsCount: 0
            } as any);
        }

        await axios.get(`${baseUrl}/brokers/pixel`, {
            params: {
             //todo: @anukulpandey - add enum for actions and pass here 
              vid: vid
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
