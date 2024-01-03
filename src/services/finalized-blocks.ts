import { getProvider, mutate } from "../utils/connector";

export const trackFinalizedBlocks = async () => {
    let processing = false;

    getProvider().api.rpc.chain.subscribeFinalizedHeads(async (header) => {
        if (processing) return;
        processing = true;
        console.log('trackFinalizedBlocks - new block:', header.number.toNumber());

        try {
            await mutate(`
                mutation {
                    newFinalizedBlock(
                        height: ${header.number},
                        hash: "${header.hash.toHuman()}"
                    )
                }
            `);
            processing = false;
        } catch (e) {
            console.log('trackFinalizedBlocks - error:', e);
            processing = false;
        }
    });
};