import { AppRequest } from "../utils/types";
import { Response } from 'express';
import axios from 'axios';
import config from '../utils/config';

const getChainId=()=>{
  if(config.network=="mainnet"){
    return 1;
  }
  return 2;
}

// fetches scan summary from api
const fetchScanSummary = async(
    address:string
):Promise<any>=>{
    const headers = {
        'Authorization': `Token ${config.solidityScanToken}`
      };
    const response = await axios.get(`${config.solidityScanEndpoint}${getChainId()}/${address}`,{headers});
    response.data.scan_report.scan_summary['scanner_reference_url'] = response.data.scan_report.scanner_reference_url;
    return response.data.scan_report.scan_summary
}  

export const getSolidityScanData =async (
    req: AppRequest<any>,
    res: Response,
)=>{
    const contractAddress = req.params.address;
    const scanSummary = await fetchScanSummary(contractAddress)

    return res.json({
        'data':{
            'soldityScanScoreV2':scanSummary.score_v2,
            'solidityScanThreatScore':scanSummary.threat_score,
            'critical':scanSummary.issue_severity_distribution.critical,
            'high':scanSummary.issue_severity_distribution.high,
            'scanner_reference_url':scanSummary.scanner_reference_url
        }});
}