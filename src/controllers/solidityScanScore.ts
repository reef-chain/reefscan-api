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
    const contractScoreUrl = `${config.solidityScanEndpoint}${getChainId()}/${address}`;
    try {
        const response = await axios.get(contractScoreUrl, {headers});
        response.data.scan_report.scan_summary['scanner_reference_url'] = response.data.scan_report.scanner_reference_url;
        return response.data.scan_report.scan_summary;
    }catch (e) {
        console.log('solidityScan GET ',contractScoreUrl, ' ERR=',e.message);
        throw new Error(e.message);
    }
}

export const getSolidityScanData =async (
    req: AppRequest<any>,
    res: Response,
)=>{
    const contractAddress = req.params.address;
    const scanSummary = await fetchScanSummary(contractAddress)
    return res.json({
        'data':{
            'solidityScanThreatScore':scanSummary.threat_score,
            'critical':scanSummary.issue_severity_distribution.critical,
            'high':scanSummary.issue_severity_distribution.high,
            'low':scanSummary.issue_severity_distribution.low,
            'medium':scanSummary.issue_severity_distribution.medium,
            'informational':scanSummary.issue_severity_distribution.informational,
            'scanner_reference_url':scanSummary.scanner_reference_url
        }});
}
