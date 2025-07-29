import { AppRequest } from "../utils/types";
import { Response } from 'express';
import * as crypto from "crypto"
import config from '../utils/config';

const { alchemyPayAppId, alchemyPaySecret, alchemyPayBaseUrl } = config;

function generateSignature(timestamp: any, httpMethod: any, requestPath: any) {
    if (alchemyPaySecret) {
        const signatureString = timestamp + httpMethod + requestPath;
        const hmac = crypto.createHmac('sha256', alchemyPaySecret);
        hmac.update(signatureString);
        const signature = hmac.digest('base64');
        return encodeURIComponent(signature);
    } else {
        throw Error("ALCHEMY_PAY_SECRET required");
    }
}

function getStringToSign(params: any) {
    const sortedKeys = Object.keys(params).sort();
    const s2s = sortedKeys
        .map(key => {
            const value = params[key];
            if (Array.isArray(value) || value === '') {
                return null;
            }
            return `${key}=${value}`;
        })
        .filter(Boolean)
        .join('&');

    return s2s;
}


export const generateAlchemyPayUrl = async (
    req: AppRequest<any>,
    apiResponse: Response,
) => {
    try {
        const {
            crypto,
            fiat,
            fiatAmount,
            merchantOrderNo,
            network
        } = req.query;

        if (!crypto || !fiat || !fiatAmount || !merchantOrderNo || !network) {
            return apiResponse.status(400).json({
                error: "Missing required query parameters. Required: crypto, fiat, fiatAmount, merchantOrderNo, network"
            });
        }

        const onRampHttpMethod = 'GET';
        const onRampRequestPath = '/index/rampPageBuy';
        const timestamp = String(Date.now());

        const paramsToSign = {
            crypto,
            fiat,
            fiatAmount,
            merchantOrderNo,
            network,
            timestamp,
            appId: alchemyPayAppId
        };

        const rawDataToSign = getStringToSign(paramsToSign);
        const requestPathWithParams = onRampRequestPath + '?' + rawDataToSign;
        const onRampSignature = generateSignature(timestamp, onRampHttpMethod, requestPathWithParams);

        const finalUrl = alchemyPayBaseUrl + '?' + rawDataToSign + "&sign=" + onRampSignature;

        apiResponse.json({
            data: finalUrl,
            error: undefined
        });
    } catch (error) {
        apiResponse.json({
            data: undefined,
            error: error
        });;
    }
};
