import { mutate } from '../utils/connector';
import axios from 'axios'

interface UpdateContract {
    iconUrl: String;
  }

export const upload =  async (file)=>{   
    const formData = new FormData()
    const projectId = process.env.IPFS_PROJECT_ID
    const projectSecret = process.env.IPFS_PROJECT_SECRET
    formData.append('file', file)
    try {
      const response = await axios.post(
        'https://ipfs.infura.io:5001/api/v0/add',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Basic ${btoa(`${projectId}:${projectSecret}`)}`,
          },
        }
      )
    return response.data.Hash;
    } catch (error) {
      console.error(error)
    }
}

export const insertTokenHash = async ({
 iconUrl
  }: UpdateContract): Promise<boolean> => {
    const result = await mutate<{saveVerifiedContract: boolean}>(`
      mutation {
        saveVerifiedContract(
          iconUrl: "${iconUrl}"
        )
      }
    `);
    return result?.saveVerifiedContract || false;
};