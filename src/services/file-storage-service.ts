import {Bucket, Storage} from "@google-cloud/storage";
import fs from 'fs';

export interface FileStorageService {
    fileExists: (filePath: string) => Promise<boolean>;
    writeFile: (filePath: string, content: string)=> Promise<void>;
    readFile: (filePath: string) => Promise<string>;
    deleteFile: (filePath: string) => Promise<void>;
}

export class GCPStorage implements FileStorageService {
    private bucket: Bucket;
    private onBucketInit: ((b: Bucket) => void)[]=[];

    constructor(path) {
        const bucketName = path;
        const storage = new Storage();
        this.initStorageBucket(storage, bucketName).then(b => {
            this.bucket = b;
            this.onBucketInit.forEach(fn => fn(this.bucket));
            this.onBucketInit.length=0;
        });
    }

    async fileExists(filePath: string): Promise<boolean> {
        const bckt = await this.getBucket();
        return (await bckt.file(filePath).exists())[0];
    }

    async readFile(filePath: string): Promise<string> {
        const bckt = await this.getBucket();
        const file = await bckt.file(filePath);
        const readStream = file.createReadStream();
        return new Promise(res => {
            let buf = '';
            readStream.on('data', function (d) {
                buf += d;
            }).on('end', function () {
                res(buf);
            });
        });
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        const bckt = await this.getBucket();
        const file = await bckt.file(filePath);
        await file.save(content);
    }

    async deleteFile(filePath: string): Promise<void> {
        const bckt = await this.getBucket();
        const file = await bckt.file(filePath);
        await file.delete();
    }

    private async initStorageBucket(storage: Storage, bucketName: string) {
        const exists = await storage.bucket(bucketName).exists();
            if (!exists[0]) {
                const created=await storage.bucket(bucketName).create();
            }
        return storage.bucket(bucketName);
    }

    private async getBucket(): Promise<Bucket> {
        if (!this.bucket) {
            return new Promise<Bucket>((resolve) => {
                this.onBucketInit.push(resolve);
            });
        }
        return Promise.resolve(this.bucket);
    }
}

export class LocalStorage implements FileStorageService {
    async fileExists(filePath: string): Promise<boolean> {
        return fs.existsSync(filePath);
    }

    async readFile(filePath: string): Promise<string> {
        return fs.readFileSync(filePath, 'utf8');
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        await fs.promises.writeFile(filePath, content);
    }

    async deleteFile(filePath: string): Promise<void> {
        fs.unlinkSync(filePath);
    }
}
