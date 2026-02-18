import { shareAsync } from 'expo-sharing';
import * as Print from 'expo-print';
// Use legacy API to avoid deprecation errors for copyAsync
import * as FileSystem from 'expo-file-system/legacy';
import { exportPnLData } from './eofyReport';
import { Logger } from '@/lib/logger';

export async function exportReportAsPDF(html: string, fileName: string) {
  Logger.debug('Starting PDF export', { fileName });
  let uri: string;
  try {
    Logger.debug('Calling Print.printToFileAsync', { htmlLength: html.length });
    const result = await Print.printToFileAsync({ html, base64: false });
    uri = result.uri;
    Logger.debug('PDF file created', { uri });
  } catch (error) {
    Logger.error('Error during printToFileAsync', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      context: error,
    });
    throw error;
  }
  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const newUri = FileSystem.cacheDirectory + safeFileName.replace(/\s+/g, '_');
  try {
    Logger.debug('Copying PDF to cache directory', { from: uri, to: newUri });
    await FileSystem.copyAsync({ from: uri, to: newUri });
    Logger.debug('PDF copied to cache directory', { newUri });
    Logger.debug('Invoking shareAsync', { newUri });
    try {
      const shareResult = await shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      Logger.debug('shareAsync completed', { newUri, shareResult });
    } catch (shareError) {
      Logger.error('Error in shareAsync', {
        message: shareError instanceof Error ? shareError.message : 'Unknown error',
        stack: shareError instanceof Error ? shareError.stack : undefined,
        context: shareError,
      });
      throw shareError;
    }
    Logger.debug('Code continued after shareAsync', { newUri });
  } catch (error) {
    Logger.error('Error exporting report as PDF', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      context: error,
    });
    throw error;
  }
}

/**
 * Generate P&L report and export as PDF. Accepts user-supplied real estate and legal costs.
 */
export async function generatePLReport({
  userId,
  property,
  realEstateCostInput,
  legalCosts
}: {
  userId: string;
  property: any;
  realEstateCostInput: { type: 'percent' | 'absolute'; value: number };
  legalCosts: number;
}): Promise<void> {
  const report = await exportPnLData({ userId, property, realEstateCostInput, legalCosts });
  const totalIncoming = (property.currentvalue || 0) + (report.totalRent || 0);
  const totalOutgoing = (report.totalOutOfPocket || 0) + (report.totalInterest || 0) + (report.totalTaxDeductible || 0) + (report.totalLiabilities || 0) + (report.realEstateCosts || 0) + (report.legalCosts || 0);


  let html = `
    <html>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            margin: 0;
            background: #f6faff;
            color: #222;
          }
          .report-header {
            background: #fff;
            border-bottom: 2px solid #1976d2;
            padding: 32px 0 16px 0;
            text-align: center;
          }
          .report-title {
            font-size: 36px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          .report-meta {
            font-size: 18px;
            color: #444;
            margin-bottom: 4px;
          }
          .watermark {
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 80px;
            color: #e3eafc;
            opacity: 0.15;
            z-index: 0;
            pointer-events: none;
          }
          .container {
            background: #fff;
            max-width: 900px;
            margin: 32px auto 32px auto;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(30, 64, 175, 0.10);
            padding: 32px 32px 24px 32px;
            position: relative;
            z-index: 1;
          }
          h1, h2, h3, h4 {
            color: #1976d2;
            margin-top: 32px;
            margin-bottom: 12px;
            font-weight: 600;
          }
          h1 {
            font-size: 28px;
            text-align: left;
            margin-bottom: 16px;
            margin-top: 0;
          }
          h2 {
            font-size: 22px;
            margin-bottom: 10px;
          }
          h3 {
            font-size: 18px;
            margin-bottom: 6px;
          }
          h4 {
            font-size: 16px;
            margin-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
            background: #fafdff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(25, 118, 210, 0.04);
          }
          th, td {
            border: 1px solid #e3eafc;
            padding: 10px 12px;
            text-align: left;
          }
          th {
            background: #e3eafc;
            color: #1976d2;
            font-weight: 600;
            font-size: 16px;
          }
          tr:nth-child(even) td {
            background: #f3f7fd;
          }
          tr:hover td {
            background: #e3f2fd;
          }
          .footer {
            text-align: center;
            margin-top: 48px;
            font-size: 15px;
            color: #789;
          }
          .signature {
            margin-top: 48px;
            font-size: 16px;
            color: #444;
            text-align: left;
          }
          .section-divider {
            border: none;
            border-top: 2px solid #e3eafc;
            margin: 32px 0 24px 0;
          }
        </style>
      </head>
      <body>
        <div class="watermark">BrickLedger</div>
        <div class="container">
          <div class="report-header">
            <div class="report-title">Profit & Loss Statement</div>
            <div class="report-meta">Property: <strong>${property.address}</strong></div>
            <div class="report-meta">Report Date: <strong>${new Date().toLocaleDateString()}</strong></div>
          </div>
          <hr/>
          <h1>Executive Summary</h1>
          <p>This Profit & Loss Statement has been prepared for the above property for the client, summarizing all relevant financial activity for the reporting period. All figures are presented in Australian Dollars (AUD) and have been reviewed for accuracy and completeness.</p>
          <ul>
            <li><strong>Purchase Price:</strong> $${property.purchaseprice?.toLocaleString() || '0'} (${property.purchasedate ? new Date(property.purchasedate).toLocaleDateString() : 'N/A'})</li>`
          ;
          if(property.status !== 'sold') {
            html+= `<li><strong>Current Market Value:</strong> $${property.currentvalue?.toLocaleString() || '0'}</li>`;
            html+= `<li><strong>Suggested Sale Price to Achieve min $35,000 Profit:</strong> $${report.suggestedSalePrice?.toLocaleString() || '0'}</li>`;
          } else {
            html+= `<li><strong>Sold Price:</strong> $${property.currentvalue?.toLocaleString() || '0'} (${property.saledate ? new Date(property.saledate).toLocaleDateString() : 'N/A'})</li>`;
          }
            html+= `<li><strong>Total Rental Income:</strong> $${report.totalRent?.toLocaleString() || '0'}</li>`;
            html+= `<li><strong>Total Outgoings:</strong> $${totalOutgoing.toLocaleString() || '0'}</li>`;
            html+= `<li><strong>Net Profit/Loss:</strong> $${report.totalPL?.toLocaleString() || '0'}</li>`;
          html+= `  
          </ul>
          <hr/>
          <h2>Detailed Financials</h2>
          <table>
            <tr>
              <th>Category</th>
              <th>Amount (AUD)</th>
            </tr>
            <tr>
              <td>Current Value</td>
              <td>$${property.currentvalue?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Total Rental Income</td>
              <td>$${report.totalRent?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Total Out of Pocket</td>
              <td>$${report.totalOutOfPocket?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Interest / Holding Costs</td>
              <td>$${report.totalInterest?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Principal Paid</td>
              <td>$${report.totalMortgage?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Other Expenses</td>
              <td>$${report.totalTaxDeductible?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Remaining Mortgage</td>
              <td>$${report.totalLiabilities?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Real Estate Commission</td>
              <td>$${report.realEstateCosts?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <td>Legal & Conveyancing</td>
              <td>$${report.legalCosts?.toLocaleString() || '0'}</td>
            </tr>
            <tr>
              <th>Total Incoming(s)</th>
              <th>$${totalIncoming.toLocaleString() || '0'}</th>
            </tr>
            <tr>
              <th>Total Outgoing(s)</th>
              <th>$${totalOutgoing.toLocaleString() || '0'}</th>
            </tr>
            <tr>
              <th>Net Profit & Loss</th>
              <th>$${report.totalPL?.toLocaleString() || '0'}</th>
            </tr>
          </table>
          <hr/>
          <h2>Supporting Schedules</h2>
          `;
          if(report.remainingMortgage && report.remainingMortgage.length > 0) {
            html += `
          <h3>Remaining Mortgage(s)</h3>
          <table>
            <tr><th>Description</th><th>Balance</th></tr>
            ${report.remainingMortgage?.map(t => `<tr><td>${t.institution || '-'}</td><td>$${t.balance?.toLocaleString() || '0'}</td></tr>`).join('') || ''}
          </table>
          `;
          }
          if(report.rentalTransactions && report.rentalTransactions.length > 0) {
            html += `
          <h3>Rental Income</h3>
          <table>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            ${report.rentalTransactions?.map(t => `<tr><td>${t.date || '-'}</td><td>${t.description || '-'}</td><td>$${t.amount?.toLocaleString() || '0'}</td></tr>`).join('') || ''}
          </table>
          `;
          }
          html += `
          <h3>Interest / Holding Costs</h3>
          <table>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            ${report.interestTransactions?.map(t => `<tr><td>${t.date || '-'}</td><td>${t.description || '-'}</td><td>$${t.amount?.toLocaleString() || '0'}</td></tr>`).join('') || ''}
          </table>
          <h3>Out of Pocket Expenses</h3>
          <table>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            ${report.outOfPocketTransactions?.map(t => `<tr><td>${t.date || '-'}</td><td>${t.description || '-'}</td><td>$${t.amount?.toLocaleString() || '0'}</td></tr>`).join('') || ''}
          </table>
          <h3>Other Expenses</h3>
          <table>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            ${report.otherTransactions?.map(t => `<tr><td>${t.date || '-'}</td><td>${t.description || '-'}</td><td>$${t.amount?.toLocaleString() || '0'}</td></tr>`).join('') || ''}
          </table>

          <h3>Capital Expenses</h3>
          <table>
            <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            ${report.capitalTransactions?.map(t => `<tr><td>${t.date || '-'}</td><td>${t.description || '-'}</td><td>$${t.amount?.toLocaleString() || '0'}</td></tr>`).join('') || ''}
          </table>
          <hr/>
          <div class="signature">
            <p>Prepared by: <strong>Brick Ledger</strong></p>
            <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
            <br/><br/>
            <p>Signature: ____________________________</p>
          </div>
          <div class="footer">
            <p>Report generated by BrickLedger. This statement is intended for professional use and may be subject to further review.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await exportReportAsPDF(html, `PnL_Report_${property.address}_${new Date().toISOString().split('T')[0]}`);
    Logger.debug('Profit & Loss report exported as PDF successfully', { fileName: `PnL_Report_${property.address.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}` });
  } catch (error) {
    if (error instanceof Error) {
      Logger.error('Error during Profit & Loss report export', {
        message: error.message,
        stack: error.stack,
        context: error,
      });
    } else {
      Logger.error('Unknown error during Profit & Loss report export', { context: error });
    }
    throw error;
  }
}

