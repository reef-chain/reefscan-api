import axios from 'axios';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import { Readable } from 'stream';

export const upload = async (base64String: string) => {
  const projectId = process.env.IPFS_PROJECT_ID;
  const projectSecret = process.env.IPFS_PROJECT_SECRET;

  try {
    const buffer = Buffer.from(base64String, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    const formData = new FormData();
    formData.append('file', stream);

    const response = await axios.post('https://ipfs.infura.io:5001/api/v0/add', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`,
        ...formData.getHeaders(),
      },
    });

    return response.data.Hash;
  } catch (error) {
    console.error(error);
  }
};

