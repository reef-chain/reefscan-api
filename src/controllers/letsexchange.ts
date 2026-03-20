import { Request, Response } from 'express';
import axios, { AxiosRequestConfig, Method } from 'axios';
import { AppRequest } from '../utils/types';
import config from '../utils/config';
import { StatusError, ensure } from '../utils/utils';

const letsexchangeBaseUrl = (config.letsexchangeBaseUrl || 'https://api.letsexchange.io/api').replace(/\/+$/, '');
const reefSymbol = 'REEF';
const reefNetwork = 'REEF';
const popularSymbols = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'MATIC'];

interface LetsExchangeNetwork {
  code: string;
  name: string;
  is_active: number;
  has_extra: number;
  extra_name: string | null;
  explorer: string | null;
  contract_address: string | null;
  validation_address_regex: string | null;
  validation_address_extra_regex: string | null;
  chain_id: string | null;
  is_wallet_connect?: number;
}

interface LetsExchangeCoin {
  code: string;
  name: string;
  icon: string;
  is_active: number;
  disabled: number;
  default_network_code: string;
  default_network_name: string;
  additional_info_get: string;
  additional_info_send: string;
  networks: LetsExchangeNetwork[];
}

interface LetsExchangeCurrency {
  symbol: string;
  name: string;
  icon: string;
  network: string;
  networkName: string;
  hasExtra: boolean;
  extraName: string | null;
  explorer: string | null;
  contractAddress: string | null;
  validationAddressRegex: string | null;
  validationAddressExtraRegex: string | null;
  chainId: string | null;
  isWalletConnect: boolean;
  isDefaultNetwork: boolean;
  defaultNetwork: string;
  defaultNetworkName: string;
  additionalInfoGet: string;
  additionalInfoSend: string;
}

const assertLetsExchangeConfigured = () => {
  ensure(Boolean(config.letsexchangeApiKey), 'LETSEXCHANGE_API_TOKEN required', 500);
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

const toRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = toOptionalString(value);
  ensure(Boolean(normalized), `${fieldName} is required`, 400);
  return normalized as string;
};

const toPositiveNumber = (value: unknown, fieldName: string): number => {
  if (typeof value === 'number') {
    ensure(Number.isFinite(value) && value > 0, `${fieldName} must be a positive number`, 400);
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    ensure(Number.isFinite(parsed) && parsed > 0, `${fieldName} must be a positive number`, 400);
    return parsed;
  }

  throw new StatusError(`${fieldName} is required`, 400);
};

const toOptionalPositiveNumber = (value: unknown, fieldName: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return toPositiveNumber(value, fieldName);
};

const toOptionalBoolean = (value: unknown, defaultValue = true): boolean => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  throw new StatusError('isFloat must be a boolean', 400);
};

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  if (typeof value === 'number') {
    ensure(Number.isInteger(value) && value > 0, `${fieldName} must be a positive integer`, 400);
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    ensure(Number.isInteger(parsed) && parsed > 0, `${fieldName} must be a positive integer`, 400);
    return parsed;
  }

  throw new StatusError(`${fieldName} must be a positive integer`, 400);
};

const normalizeCode = (value: string) => value.trim().toUpperCase();

const buildPartnerUserIp = (req: Request, explicitValue?: unknown): string | undefined => {
  const explicitIp = toOptionalString(explicitValue);
  if (explicitIp) {
    return explicitIp;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }

  return toOptionalString(req.ip);
};

const getAxiosConfig = (
  method: Method,
  path: string,
  data?: Record<string, unknown>,
  params?: Record<string, unknown>,
) => {
  return {
    method,
    url: `${letsexchangeBaseUrl}${path}`,
    headers: {
      Authorization: `Bearer ${config.letsexchangeApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data,
    params,
    timeout: 20000,
  } as AxiosRequestConfig;
};

const letsExchangeRequest = async <ResponseType>(
  method: Method,
  path: string,
  data?: Record<string, unknown>,
  params?: Record<string, unknown>,
) => {
  assertLetsExchangeConfigured();
  const response = await axios.request<ResponseType>(getAxiosConfig(method, path, data, params));
  return response.data;
};

const buildAffiliatePayload = () => {
  const affiliateId = toOptionalString(config.letsexchangeAffiliateId);
  return affiliateId ? { affiliate_id: affiliateId } : {};
};

const flattenCurrencies = (coins: LetsExchangeCoin[]): LetsExchangeCurrency[] => {
  const flattened: LetsExchangeCurrency[] = [];

  coins.forEach((coin) => {
    if (coin.is_active !== 1 || coin.code === reefSymbol) {
      return;
    }

    coin.networks.forEach((network) => {
      if (network.is_active !== 1) {
        return;
      }

      flattened.push({
        symbol: coin.code,
        name: coin.name,
        icon: coin.icon,
        network: network.code,
        networkName: network.name,
        hasExtra: network.has_extra === 1,
        extraName: network.extra_name,
        explorer: network.explorer,
        contractAddress: network.contract_address,
        validationAddressRegex: network.validation_address_regex,
        validationAddressExtraRegex: network.validation_address_extra_regex,
        chainId: network.chain_id,
        isWalletConnect: network.is_wallet_connect === 1,
        isDefaultNetwork: coin.default_network_code === network.code,
        defaultNetwork: coin.default_network_code,
        defaultNetworkName: coin.default_network_name,
        additionalInfoGet: coin.additional_info_get,
        additionalInfoSend: coin.additional_info_send,
      });
    });
  });

  flattened.sort((left, right) => {
    const leftPriority = popularSymbols.indexOf(left.symbol);
    const rightPriority = popularSymbols.indexOf(right.symbol);

    if (leftPriority !== rightPriority) {
      if (leftPriority === -1) {
        return 1;
      }
      if (rightPriority === -1) {
        return -1;
      }
      return leftPriority - rightPriority;
    }

    if (left.symbol !== right.symbol) {
      return left.symbol.localeCompare(right.symbol);
    }

    if (left.isDefaultNetwork !== right.isDefaultNetwork) {
      return left.isDefaultNetwork ? -1 : 1;
    }

    return left.network.localeCompare(right.network);
  });

  return flattened;
};

const buildQuotePayload = (
  req: Request,
  body: Record<string, unknown>,
  amountField: 'amount' | 'withdrawalAmount',
) => {
  const fromSymbol = normalizeCode(toRequiredString(body.fromSymbol, 'fromSymbol'));
  const fromNetwork = normalizeCode(toRequiredString(body.fromNetwork, 'fromNetwork'));
  const amount = amountField === 'amount'
    ? toPositiveNumber(body.amount, 'amount')
    : toPositiveNumber(body.withdrawalAmount, 'withdrawalAmount');
  const isFloat = toOptionalBoolean(body.isFloat, true);
  const partnerUserIp = buildPartnerUserIp(req, body.partnerUserIp);
  const promocode = toOptionalString(body.promocode);

  return {
    from: fromSymbol,
    to: reefSymbol,
    network_from: fromNetwork,
    network_to: reefNetwork,
    amount,
    float: isFloat,
    promocode,
    partner_user_ip: partnerUserIp,
    ...buildAffiliatePayload(),
  };
};

const buildCreateTransactionPayload = (req: Request, body: Record<string, unknown>) => {
  const fromSymbol = normalizeCode(toRequiredString(body.fromSymbol, 'fromSymbol'));
  const fromNetwork = normalizeCode(toRequiredString(body.fromNetwork, 'fromNetwork'));
  const withdrawalAddress = toRequiredString(body.withdrawalAddress, 'withdrawalAddress');
  const withdrawalExtraId = toOptionalString(body.withdrawalExtraId) || '';
  const refundAddress = toOptionalString(body.refundAddress);
  const refundExtraId = toOptionalString(body.refundExtraId);
  const rateId = toOptionalString(body.rateId);
  const email = toOptionalString(body.email);
  const promocode = toOptionalString(body.promocode);
  const partnerUserIp = buildPartnerUserIp(req, body.partnerUserIp);
  const isFloat = toOptionalBoolean(body.isFloat, true);
  const depositAmount = toOptionalPositiveNumber(body.depositAmount, 'depositAmount');
  const withdrawalAmount = toOptionalPositiveNumber(body.withdrawalAmount, 'withdrawalAmount');

  ensure(
    Number(Boolean(depositAmount)) + Number(Boolean(withdrawalAmount)) === 1,
    'Provide exactly one of depositAmount or withdrawalAmount',
    400,
  );

  if (!isFloat) {
    ensure(Boolean(rateId), 'rateId is required when isFloat is false', 400);
  }

  const payload: Record<string, unknown> = {
    float: isFloat,
    coin_from: fromSymbol,
    coin_to: reefSymbol,
    network_from: fromNetwork,
    network_to: reefNetwork,
    withdrawal: withdrawalAddress,
    withdrawal_extra_id: withdrawalExtraId,
    partner_user_ip: partnerUserIp,
    ...buildAffiliatePayload(),
  };

  if (depositAmount) {
    payload.deposit_amount = depositAmount;
  }

  if (withdrawalAmount) {
    payload.withdrawal_amount = withdrawalAmount;
  }

  if (refundAddress) {
    payload.return = refundAddress;
    payload.return_extra_id = refundExtraId || '';
  }

  if (rateId) {
    payload.rate_id = rateId;
  }

  if (email) {
    payload.email = email;
  }

  if (promocode) {
    payload.promocode = promocode;
  }

  const path = depositAmount ? '/v1/transaction' : '/v1/transaction-revert';

  return { path, payload };
};

const sendLetsExchangeError = (apiResponse: Response, error: unknown) => {
  if (error instanceof StatusError) {
    return apiResponse.status(error.status).json({
      data: undefined,
      error: error.message,
    });
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 502;
    const providerError = error.response?.data;
    let message = error.message || 'LetsExchange request failed';

    if (typeof providerError === 'string' && providerError.trim()) {
      message = providerError;
    } else if (
      providerError
      && typeof providerError === 'object'
      && 'message' in providerError
      && typeof (providerError as { message?: unknown }).message === 'string'
      && (providerError as { message: string }).message.trim()
    ) {
      message = (providerError as { message: string }).message;
    }

    return apiResponse.status(status).json({
      data: undefined,
      error: message,
      details: providerError,
    });
  }

  return apiResponse.status(500).json({
    data: undefined,
    error: error instanceof Error ? error.message : 'Unexpected LetsExchange error',
  });
};

export const listCurrencies = async (
  req: Request,
  apiResponse: Response,
) => {
  try {
    const search = toOptionalString(req.query.search);
    const limitValue = req.query.limit;
    const limit = limitValue ? Math.min(toPositiveInteger(limitValue, 'limit'), 500) : undefined;
    const partnerUserIp = buildPartnerUserIp(req, req.query.partnerUserIp);

    const params = partnerUserIp ? { partner_user_ip: partnerUserIp } : undefined;
    const coins = await letsExchangeRequest<LetsExchangeCoin[]>('GET', '/v2/coins', undefined, params);
    let currencies = flattenCurrencies(coins);

    if (search) {
      const normalizedSearch = search.toLowerCase();
      currencies = currencies.filter((currency) => {
        const searchFields = [
          currency.symbol,
          currency.name,
          currency.network,
          currency.networkName,
        ].filter((value): value is string => Boolean(value));

        return searchFields.some((value) => value.toLowerCase().includes(normalizedSearch));
      });
    }

    if (limit) {
      currencies = currencies.slice(0, limit);
    }

    apiResponse.json({
      data: currencies,
      error: undefined,
    });
  } catch (error) {
    return sendLetsExchangeError(apiResponse, error);
  }
};

export const getQuote = async (
  req: AppRequest<Record<string, unknown>>,
  apiResponse: Response,
) => {
  try {
    const payload = buildQuotePayload(req, req.body, 'amount');
    const data = await letsExchangeRequest<Record<string, unknown>>('POST', '/v1/info', payload);

    apiResponse.json({
      data,
      error: undefined,
    });
  } catch (error) {
    return sendLetsExchangeError(apiResponse, error);
  }
};

export const getQuoteRevert = async (
  req: AppRequest<Record<string, unknown>>,
  apiResponse: Response,
) => {
  try {
    const payload = buildQuotePayload(req, req.body, 'withdrawalAmount');
    const data = await letsExchangeRequest<Record<string, unknown>>('POST', '/v1/info-revert', payload);

    apiResponse.json({
      data,
      error: undefined,
    });
  } catch (error) {
    return sendLetsExchangeError(apiResponse, error);
  }
};

export const createExchange = async (
  req: AppRequest<Record<string, unknown>>,
  apiResponse: Response,
) => {
  try {
    const { path, payload } = buildCreateTransactionPayload(req, req.body);
    const data = await letsExchangeRequest<Record<string, unknown>>('POST', path, payload);

    apiResponse.json({
      data,
      error: undefined,
    });
  } catch (error) {
    return sendLetsExchangeError(apiResponse, error);
  }
};

export const getTransaction = async (
  req: Request,
  apiResponse: Response,
) => {
  try {
    const id = toRequiredString(req.params.id, 'id');
    const data = await letsExchangeRequest<Record<string, unknown>>('GET', `/v1/transaction/${id}`);

    apiResponse.json({
      data,
      error: undefined,
    });
  } catch (error) {
    return sendLetsExchangeError(apiResponse, error);
  }
};

export const getTransactionStatus = async (
  req: Request,
  apiResponse: Response,
) => {
  try {
    const id = toRequiredString(req.params.id, 'id');
    const data = await letsExchangeRequest<string>('GET', `/v1/transaction/${id}/status`);

    apiResponse.json({
      data,
      error: undefined,
    });
  } catch (error) {
    return sendLetsExchangeError(apiResponse, error);
  }
};
