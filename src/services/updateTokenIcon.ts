import axios from 'axios';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import { Readable } from 'stream';
import config from '../utils/config';

export const upload = async (base64String) => {
  const projectId = config.ipfsGatewayId;
  const projectSecret = config.ipfsGatewayKey;
  const buffer = Buffer.from(base64String, 'base64');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  const formData = new FormData();
  formData.append('file', stream);

  try {
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

