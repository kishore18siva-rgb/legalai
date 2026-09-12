import { ExtractedFieldData } from '../rule_engine/types';

export interface CategoryInference {
  category: string;
  confidence: number;
  reason: string;
}

export interface ImageCoverageResult {
  coverageStatus: 'FULL' | 'PARTIAL';
  facesAccountedFor: number;
  totalRequiredFaces: number;
  detectedPanels: string[];
  missingPanels: string[];
  warningMessage?: string;
}

export class AiExtractionService {
  /**
   * Analyzes 6 physical package faces (FRONT, BACK, LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM)
   */
  public analyzeImageCoverage(imageTypes: string[]): ImageCoverageResult {
    const panels = new Set(imageTypes.map((t) => t.toUpperCase()));
    const requiredSixPanels = ['FRONT', 'BACK', 'LEFT_SIDE', 'RIGHT_SIDE', 'TOP', 'BOTTOM'];
    const detectedPanels = Array.from(panels);
    const missingPanels: string[] = [];

    for (const reqPanel of requiredSixPanels) {
      if (!panels.has(reqPanel)) {
        missingPanels.push(reqPanel.replace('_', ' '));
      }
    }

    const facesAccountedFor = 6 - missingPanels.length;
    const isPartial = missingPanels.length > 0;

    const warningMessage = isPartial
      ? `Captured ${facesAccountedFor}/6 package faces. Declarations (like manufacturer address or customer care) may appear on uncaptured faces (${missingPanels.join(', ')}).`
      : undefined;

    return {
      coverageStatus: isPartial ? 'PARTIAL' : 'FULL',
      facesAccountedFor,
      totalRequiredFaces: 6,
      detectedPanels,
      missingPanels,
      warningMessage,
    };
  }

  /**
   * Automatically infers product category and confidence based on OCR text
   */
  public inferProductCategory(ocrText: string): CategoryInference {
    const txt = ocrText.toLowerCase();

    if (txt.includes('biscuit') || txt.includes('cookie') || txt.includes('snack') || txt.includes('food') || txt.includes('tea') || txt.includes('coffee') || txt.includes('oil')) {
      return { category: 'Food', confidence: 0.96, reason: 'Detected food/beverage keywords and biscuit packaging format.' };
    }
    if (txt.includes('shampoo') || txt.includes('soap') || txt.includes('cream') || txt.includes('lotion') || txt.includes('cosmetic')) {
      return { category: 'Cosmetics', confidence: 0.94, reason: 'Detected personal care / cosmetics keywords.' };
    }
    if (txt.includes('detergent') || txt.includes('cleaner') || txt.includes('dishwash') || txt.includes('household')) {
      return { category: 'Household', confidence: 0.92, reason: 'Detected household cleaning product terms.' };
    }
    if (txt.includes('shirt') || txt.includes('towel') || txt.includes('cloth') || txt.includes('textile')) {
      return { category: 'Clothing/Textile', confidence: 0.90, reason: 'Detected apparel / textile terms.' };
    }
    if (txt.includes('cable') || txt.includes('battery') || txt.includes('charger') || txt.includes('electronic')) {
      return { category: 'Electronics', confidence: 0.91, reason: 'Detected electrical item indicators.' };
    }

    return { category: 'Food', confidence: 0.75, reason: 'Default general pre-packaged commodity classification.' };
  }

  /**
   * Parses raw OCR text into structured package declarations & merges multi-face duplicates.
   */
  public extractDeclarations(ocrText: string, imageId?: string): ExtractedFieldData[] {
    const rawFields: ExtractedFieldData[] = [];
    const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. Net Quantity Extraction
    const netQtyMatch = ocrText.match(/(?:net\s*qty|net\s*quantity|net\s*wt|net\s*weight|net\s*vol|net\s*content)[:\s]*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/i);
    if (netQtyMatch) {
      const val = netQtyMatch[1];
      const unit = netQtyMatch[2];
      rawFields.push({
        fieldKey: 'net_quantity',
        fieldLabel: 'Net Quantity',
        rawValue: `${val} ${unit}`,
        normalizedValue: parseFloat(val),
        unit: unit,
        confidence: 0.96,
        sourceImageId: imageId,
        sourceRegionJson: JSON.stringify({ x0: 20, y0: 60, x1: 250, y1: 80 }),
        sourceText: netQtyMatch[0],
        reviewRequired: false,
      });
    } else {
      const simpleQty = ocrText.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(g|kg|mg|ml|l|L|m|cm|N|U)\b/);
      if (simpleQty) {
        rawFields.push({
          fieldKey: 'net_quantity',
          fieldLabel: 'Net Quantity',
          rawValue: `${simpleQty[1]} ${simpleQty[2]}`,
          normalizedValue: parseFloat(simpleQty[1]),
          unit: simpleQty[2],
          confidence: 0.88,
          sourceImageId: imageId,
          sourceRegionJson: JSON.stringify({ x0: 20, y0: 60, x1: 250, y1: 80 }),
          sourceText: simpleQty[0],
          reviewRequired: false,
        });
      } else {
        rawFields.push({
          fieldKey: 'net_quantity',
          fieldLabel: 'Net Quantity',
          rawValue: null,
          normalizedValue: null,
          unit: null,
          confidence: 0.0,
          sourceImageId: imageId,
          reviewRequired: true,
        });
      }
    }

    // 2. MRP Extraction
    const mrpMatch = ocrText.match(/(?:mrp|max\s*retail\s*price|retail\s*price)[:\s]*[₹Rs\.]*\s*([0-9]+(?:\.[0-9]+)?)(.*)/i);
    if (mrpMatch) {
      const priceVal = mrpMatch[1];
      const rest = mrpMatch[2] || '';
      rawFields.push({
        fieldKey: 'mrp',
        fieldLabel: 'Maximum Retail Price (MRP)',
        rawValue: `MRP Rs ${priceVal} ${rest.trim()}`,
        normalizedValue: parseFloat(priceVal),
        unit: 'INR',
        confidence: 0.95,
        sourceImageId: imageId,
        sourceRegionJson: JSON.stringify({ x0: 20, y0: 90, x1: 280, y1: 110 }),
        sourceText: mrpMatch[0],
        reviewRequired: !rest.toLowerCase().includes('tax') && !rest.toLowerCase().includes('incl'),
      });
    } else {
      rawFields.push({
        fieldKey: 'mrp',
        fieldLabel: 'Maximum Retail Price (MRP)',
        rawValue: null,
        normalizedValue: null,
        confidence: 0.0,
        sourceImageId: imageId,
        reviewRequired: true,
      });
    }

    // 3. Manufacturing Date
    const mfgMatch = ocrText.match(/(?:mfg|pkd|packed|manufactured|imported|mfg\s*date)[:\s]*([0-9]{2}[\/\-][0-9]{4}|[a-zA-Z]{3,9}\s*[0-9]{4})/i);
    if (mfgMatch) {
      rawFields.push({
        fieldKey: 'mfg_date',
        fieldLabel: 'Manufacturing / Packing Date',
        rawValue: mfgMatch[1],
        normalizedValue: mfgMatch[1],
        confidence: 0.94,
        sourceImageId: imageId,
        sourceText: mfgMatch[0],
        reviewRequired: false,
      });
    } else {
      rawFields.push({
        fieldKey: 'mfg_date',
        fieldLabel: 'Manufacturing / Packing Date',
        rawValue: null,
        confidence: 0.0,
        sourceImageId: imageId,
        reviewRequired: true,
      });
    }

    // 4. Manufacturer Name & Address
    const mfgInfoMatch = ocrText.match(/(?:mfg\s*by|manufactured\s*by|packed\s*by|marketed\s*by)[:\s]*([^,.\n]+(?:,[^.\n]+)*)/i);
    if (mfgInfoMatch) {
      const fullMfgStr = mfgInfoMatch[1].trim();
      const parts = fullMfgStr.split(',');
      const mfgName = parts[0];
      const mfgAddr = parts.slice(1).join(', ') || 'Address extracted from label';

      rawFields.push({
        fieldKey: 'manufacturer_name',
        fieldLabel: 'Manufacturer Name',
        rawValue: mfgName,
        normalizedValue: mfgName,
        confidence: 0.92,
        sourceImageId: imageId,
        sourceRegionJson: JSON.stringify({ x0: 20, y0: 30, x1: 300, y1: 50 }),
        sourceText: mfgInfoMatch[0],
        reviewRequired: false,
      });

      rawFields.push({
        fieldKey: 'manufacturer_address',
        fieldLabel: 'Manufacturer Postal Address',
        rawValue: mfgAddr,
        normalizedValue: mfgAddr,
        confidence: 0.88,
        sourceImageId: imageId,
        sourceText: mfgAddr,
        reviewRequired: false,
      });
    } else {
      rawFields.push({
        fieldKey: 'manufacturer_name',
        fieldLabel: 'Manufacturer Name',
        rawValue: null,
        confidence: 0.0,
        sourceImageId: imageId,
        reviewRequired: true,
      });
      rawFields.push({
        fieldKey: 'manufacturer_address',
        fieldLabel: 'Manufacturer Postal Address',
        rawValue: null,
        confidence: 0.0,
        sourceImageId: imageId,
        reviewRequired: true,
      });
    }

    // 5. Generic / Common Commodity Name
    const genericMatch = ocrText.match(/(?:generic\s*name|product|commodity|common\s*name)[:\s]*([^\n]+)/i);
    if (genericMatch) {
      rawFields.push({
        fieldKey: 'generic_name',
        fieldLabel: 'Generic Commodity Name',
        rawValue: genericMatch[1].trim(),
        normalizedValue: genericMatch[1].trim(),
        confidence: 0.90,
        sourceImageId: imageId,
        sourceText: genericMatch[0],
        reviewRequired: false,
      });
    } else {
      const possibleName = lines.find((l) => !l.includes('MFG') && !l.includes('NET') && !l.includes('MRP'));
      rawFields.push({
        fieldKey: 'generic_name',
        fieldLabel: 'Generic Commodity Name',
        rawValue: possibleName || null,
        normalizedValue: possibleName || null,
        confidence: possibleName ? 0.70 : 0.0,
        sourceImageId: imageId,
        reviewRequired: !possibleName,
      });
    }

    // 6. Brand Name Detection
    const brandMatch = ocrText.match(/(?:brand|mark)[:\s]*([^\n]+)/i);
    rawFields.push({
      fieldKey: 'brand_name',
      fieldLabel: 'Brand Name',
      rawValue: brandMatch ? brandMatch[1].trim() : lines[0] || null,
      normalizedValue: brandMatch ? brandMatch[1].trim() : lines[0] || null,
      confidence: brandMatch ? 0.90 : 0.65,
      sourceImageId: imageId,
      reviewRequired: !brandMatch,
    });

    // 7. Country of Origin
    const originMatch = ocrText.match(/(?:made\s*in|country\s*of\s*origin)[:\s]*([a-zA-Z\s]+)/i);
    rawFields.push({
      fieldKey: 'country_of_origin',
      fieldLabel: 'Country of Origin',
      rawValue: originMatch ? originMatch[1].trim() : 'India',
      normalizedValue: originMatch ? originMatch[1].trim() : 'India',
      confidence: originMatch ? 0.95 : 0.85,
      sourceImageId: imageId,
      reviewRequired: false,
    });

    // 8. Consumer Complaint Contact Info
    const emailMatch = ocrText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = ocrText.match(/(?:1800|1860|[0-9]{3,4})[\s\-]*[0-9]{6,7}/);
    const contactMatch = ocrText.match(/(?:consumer\s*care|complaint|contact|customer\s*care)[:\s]*([^\n]+)/i);

    if (emailMatch || phoneMatch || contactMatch) {
      rawFields.push({
        fieldKey: 'complaint_phone',
        fieldLabel: 'Consumer Complaint Phone',
        rawValue: phoneMatch ? phoneMatch[0] : null,
        normalizedValue: phoneMatch ? phoneMatch[0] : null,
        confidence: phoneMatch ? 0.95 : 0.0,
        sourceImageId: imageId,
      });

      rawFields.push({
        fieldKey: 'complaint_email',
        fieldLabel: 'Consumer Complaint Email',
        rawValue: emailMatch ? emailMatch[0] : null,
        normalizedValue: emailMatch ? emailMatch[0] : null,
        confidence: emailMatch ? 0.95 : 0.0,
        sourceImageId: imageId,
      });

      rawFields.push({
        fieldKey: 'complaint_address',
        fieldLabel: 'Consumer Complaint Address',
        rawValue: contactMatch ? contactMatch[1].trim() : 'Manufacturer Address',
        normalizedValue: contactMatch ? contactMatch[1].trim() : 'Manufacturer Address',
        confidence: 0.85,
        sourceImageId: imageId,
      });
    } else {
      rawFields.push({
        fieldKey: 'complaint_phone',
        fieldLabel: 'Consumer Complaint Phone',
        rawValue: null,
        confidence: 0.0,
        sourceImageId: imageId,
        reviewRequired: true,
      });
    }

    // Merge Duplicate Detections across multi-face OCR
    return this.mergeDuplicateDeclarations(rawFields);
  }

  private mergeDuplicateDeclarations(fields: ExtractedFieldData[]): ExtractedFieldData[] {
    const map = new Map<string, ExtractedFieldData>();

    for (const f of fields) {
      if (!map.has(f.fieldKey)) {
        map.set(f.fieldKey, f);
      } else {
        const existing = map.get(f.fieldKey)!;
        if (!existing.rawValue && f.rawValue) {
          map.set(f.fieldKey, f);
        } else if (existing.rawValue && f.rawValue && f.confidence > existing.confidence) {
          map.set(f.fieldKey, f);
        }
      }
    }

    return Array.from(map.values());
  }
}
