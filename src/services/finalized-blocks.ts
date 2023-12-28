import { getProvider, mutate } from "../utils/connector";

export const trackFinalizedBlocks = async () => {
    let processing = false;
    getProvider().api.rpc.chain.subscribeFinalizedHeads(async (header) => {
        if (processing) return;
        processing = true;

        await mutate(`
            mutation {
                newFinalizedBlock(
                    height: ${header.number},
                    hash: "${header.hash.toHuman()}"
                )
            }
        `);
        processing = false;
    });
};