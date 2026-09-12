import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export class PdfReportService {
  /**
   * Generates a formal compliance PDF report for an inspection
   */
  public async generateComplianceReport(inspectionData: any, outputPath: string): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let y = height - 50;

    // Header Banner
    page.drawRectangle({
      x: 0,
      y: height - 70,
      width,
      height: 70,
      color: rgb(0.04, 0.16, 0.26),
    });

    page.drawText('LEGAL LENS - COMPLIANCE INSPECTION REPORT', {
      x: 30,
      y: height - 40,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('The Legal Metrology (Packaged Commodities) Rules, 2011 Audit', {
      x: 30,
      y: height - 58,
      size: 10,
      font,
      color: rgb(0.8, 0.88, 0.95),
    });

    y = height - 90;

    // Meta Details Box
    page.drawRectangle({
      x: 30,
      y: y - 75,
      width: width - 60,
      height: 75,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
    });

    page.drawText(`Inspection Number: ${inspectionData.inspectionNumber}`, { x: 45, y: y - 20, size: 10, font: fontBold });
    page.drawText(`Date & Time: ${new Date(inspectionData.createdAt).toLocaleString()}`, { x: 300, y: y - 20, size: 10, font });
    
    page.drawText(`Inspector: ${inspectionData.inspector?.name || 'Authorized Officer'} (${inspectionData.inspector?.email || 'N/A'})`, { x: 45, y: y - 40, size: 10, font });
    page.drawText(`Product Category: ${inspectionData.product?.category || 'General Package'}`, { x: 300, y: y - 40, size: 10, font });

    page.drawText(`Overall Compliance Score: ${inspectionData.complianceScore.toFixed(1)}% (${inspectionData.overallResult})`, { x: 45, y: y - 60, size: 10, font: fontBold, color: inspectionData.overallResult === 'PASS' ? rgb(0.1, 0.6, 0.2) : rgb(0.8, 0.1, 0.1) });

    y -= 105;

    // Section Title
    page.drawText('RULE-BY-RULE COMPLIANCE EVALUATION', { x: 30, y, size: 12, font: fontBold, color: rgb(0.04, 0.16, 0.26) });
    y -= 15;

    // Table Header
    page.drawRectangle({ x: 30, y: y - 20, width: width - 60, height: 20, color: rgb(0.9, 0.93, 0.96) });
    page.drawText('Rule No.', { x: 35, y: y - 14, size: 9, font: fontBold });
    page.drawText('Requirement / Check', { x: 110, y: y - 14, size: 9, font: fontBold });
    page.drawText('Status', { x: 330, y: y - 14, size: 9, font: fontBold });
    page.drawText('Extracted Evidence / Reason', { x: 400, y: y - 14, size: 9, font: fontBold });

    y -= 25;

    // Table Rows
    const ruleResults = inspectionData.ruleResults || [];
    for (const r of ruleResults) {
      if (y < 120) {
        // Add footer & page break if needed
        break;
      }

      let statusColor = rgb(0.2, 0.6, 0.2); // PASS green
      if (r.result === 'FAIL') statusColor = rgb(0.8, 0.1, 0.1);
      if (r.result === 'REVIEW') statusColor = rgb(0.8, 0.4, 0.0);
      if (r.result === 'NOT_APPLICABLE') statusColor = rgb(0.4, 0.5, 0.6);

      page.drawText(r.ruleNumber || 'Rule', { x: 35, y: y - 10, size: 8, font: fontBold });
      page.drawText((r.ruleCode || '').substring(0, 30), { x: 110, y: y - 10, size: 8, font });
      page.drawText(r.result, { x: 330, y: y - 10, size: 8, font: fontBold, color: statusColor });
      
      const reasonSnippet = (r.reason || '').substring(0, 35);
      page.drawText(reasonSnippet, { x: 400, y: y - 10, size: 8, font });

      y -= 18;
    }

    // Disclaimer Box
    y = 80;
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: 45,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    page.drawText('STATUTORY LEGAL DISCLAIMER:', { x: 40, y: 62, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('This assessment is an automated compliance-assistance result and does not constitute a legal determination.', { x: 40, y: 50, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Final enforcement or legal interpretation must be performed by the competent authority or qualified legal professional.', { x: 40, y: 40, size: 7, font, color: rgb(0.4, 0.4, 0.4) });

    const pdfBytes = await pdfDoc.save();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
  }
}
