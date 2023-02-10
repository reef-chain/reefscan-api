import { mutate } from '../utils/connector';
import axios from 'axios'

interface UpdateContract {
    iconUrl: String;
  }

export const uploadAndInsert =  async (file)=>{   
    const formData = new FormData()
    const projectId = '2LVJclw3MbzDMPhL08X7C8Tgpp2'
    const projectSecret = 'b4abfdc6b75a4e522cd6524e17cf2a3a'
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
    insertTokenHash(response.data.Hash);
    } catch (error) {
      console.error(error)
    }
}

const insertTokenHash = async ({
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