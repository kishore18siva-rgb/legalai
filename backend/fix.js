const { PrismaClient } = require('@prisma/client');
const { DeterministicRuleEngine } = require('./dist/services/rule_engine/engine');

const prisma = new PrismaClient();
const ruleEngine = new DeterministicRuleEngine();

async function run() {
  const rules = await prisma.legalRule.findMany();
  const inspections = await prisma.inspection.findMany({ include: { product: true, extractedFields: true } });
  
  console.log(`Recalculating ${inspections.length} inspections with ${rules.length} rules...`);
  
  for (const ins of inspections) {
    const fieldsForEngine = ins.extractedFields.map(f => ({
      fieldKey: f.fieldKey,
      fieldLabel: f.fieldLabel,
      rawValue: f.rawValue,
      normalizedValue: f.normalizedValue,
      unit: f.unit,
      confidence: f.confidence,
      sourceFace: f.sourceFace,
      placementStatus: f.placementStatus,
      sourceImageId: f.sourceImageId,
      sourceRegionJson: f.sourceRegionJson,
      sourceText: f.sourceText,
      reviewRequired: f.reviewRequired
    }));
    
    const netQtyField = fieldsForEngine.find(f => f.fieldKey === 'net_quantity');
    const context = {
      productName: ins.product?.name,
      category: ins.product?.category,
      packageType: ins.product?.packageType,
      isRetailPackage: true,
      pdpFace: ins.pdpFace || 'FRONT',
      pdpDeterminationMethod: ins.pdpDeterminationMethod || 'AI',
      netQuantityValue: netQtyField?.normalizedValue ? parseFloat(String(netQtyField.normalizedValue)) : undefined,
      netQuantityUnit: netQtyField?.unit || undefined,
      hasPhysicalMeasurement: false
    };
    
    const evaluations = ruleEngine.evaluateRules(rules, fieldsForEngine, context);
    await prisma.ruleResult.deleteMany({ where: { inspectionId: ins.id } });
    
    let passed = 0, failed = 0, review = 0, na = 0;
    
    for (const ev of evaluations) {
      if (ev.result === 'PASS') passed++;
      if (ev.result === 'FAIL') failed++;
      if (ev.result === 'REVIEW') review++;
      if (ev.result === 'NOT_APPLICABLE') na++;
      
      await prisma.ruleResult.create({
        data: {
          inspectionId: ins.id,
          ruleId: ev.ruleId,
          ruleCode: ev.ruleCode,
          ruleNumber: ev.ruleNumber,
          result: ev.result,
          requirementText: ev.requirementText,
          extractedValue: ev.extractedValue,
          expectedCondition: ev.expectedCondition,
          reason: ev.reason,
          confidence: ev.confidence,
          sourceFace: ev.sourceFace,
          detectedFace: ev.detectedFace,
          placementStatus: ev.placementStatus,
          evidenceImageId: ev.evidenceImageId,
          ruleVersion: ev.ruleVersion
        }
      });
    }
    
    const total = passed + failed + review;
    let score = total > 0 ? (passed / total) * 100 : 0;
    score = parseFloat(score.toFixed(1));
    
    let overall = 'PASS';
    if (failed > 0) overall = 'FAIL';
    else if (review > 0) overall = 'REVIEW';
    else if (passed === 0 && na > 0) overall = 'NOT_APPLICABLE';
    
    await prisma.inspection.update({
      where: { id: ins.id },
      data: {
        overallResult: overall,
        complianceScore: score,
        passedCount: passed,
        failedCount: failed,
        reviewCount: review,
        naCount: na
      }
    });
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
