import { AppRequest } from "../utils/types";
import { Response } from 'express';
import { ensure, toChecksumAddress } from "../utils/utils";
import { query } from '../utils/connector';
import axios, { AxiosRequestConfig } from 'axios';
import config from '../utils/config';
import { updateVerifiedContractData } from "../services/verification";

const findVerifiedContract = async (
    id: string,
  ): Promise<any | null> => {
    const verifiedContractById = await query<any | null>(
      'verifiedContractById',
      `query {
        verifiedContractById(id: "${id}") {
          id
          contractData
          contract {
            signer {
              id
            }
          }
        }
      }`
    );
    return verifiedContractById;
  };
  
const getVerifiedContract = async (
    contractId
  ) => {
    const contract = await findVerifiedContract(
      toChecksumAddress(contractId),
    );
    ensure(!!contract, 'Contract does not exist');
    return contract;
  };

// fetches scan summary from api
const fetchScanSummary = async(
    address:string
):Promise<any>=>{
    const headers = {
        'Authorization': `Token ${config.solidityScanToken}`
      };
    const response = await axios.get(`${config.solidityScanEndpoint}${address}`,{headers});
    return response.data.scan_report.scan_summary
}  

export const getSolidityScanData =async (
    req: AppRequest<any>,
    res: Response,
)=>{
    //check if contract exists or not
    const contractAddress = req.params.address;
    const contract = await getVerifiedContract(contractAddress);

    // check if solidity scan data exists
    if(contract.contractData['solidityScan']){
        return res.json({
            'solidityScan':contract.contractData['solidityScan'],
        });
    }

    // if data doesn't exist update in contract data
    const scanSummary = await fetchScanSummary(contractAddress)
    updateVerifiedContractData(contractAddress,{'solidityScan':
    {
        'scanScore':scanSummary.score_v2,
        'threatScore':scanSummary.threat_score,
        'critical':scanSummary.issue_severity_distribution.critical,
        'high':scanSummary.issue_severity_distribution.high
    }});

    return res.json({
        'solidityScan':{
            'soldityScanScoreV2':scanSummary.score_v2,
            'solidityScanThreatScore':scanSummary.threat_score,
            'criticalVulnerabilities':scanSummary.issue_severity_distribution.critical,
            'highVulnerabilities':scanSummary.issue_severity_distribution.high,
        }});
}