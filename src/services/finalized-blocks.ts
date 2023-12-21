import { getProvider, mutate } from "../utils/connector";

export const trackFinalizedBlocks = async () => {
    getProvider().api.rpc.chain.subscribeFinalizedHeads(async (header) => {
        mutate(`
            mutation {
                newFinalizedBlock(
                    height: ${header.number},
                    hash: "${header.hash.toHuman()}"
                )
            }
        `);
    });
};