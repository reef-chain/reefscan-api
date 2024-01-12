import { query, mutate } from "../utils/connector";
import { SquidStatus } from "../utils/types";

export const trackFinalizedBlocks = async () => {
    let processing = false;
    let lastFinalizedBlock = 0;

    setInterval(async () => {
        if (processing) return;
        processing = true;

        try {
            const squidStatus = await query<SquidStatus>(
                'squidStatus',
                `query {
                    squidStatus {
                        height
                    }
                }
            `);
            if (squidStatus && squidStatus.height > lastFinalizedBlock) {
                console.log('trackFinalizedBlocks - finalized block:', squidStatus.height);
                await mutate(`
                    mutation {
                        newFinalizedBlock(
                            height: ${squidStatus.height}
                        )
                    }
                `);
                lastFinalizedBlock = squidStatus.height;
            }
            processing = false;
        } catch (e) {
            console.error('ERROR trackFinalizedBlocks:', e);
            processing = false;
        }
    }
    , 5000);
};