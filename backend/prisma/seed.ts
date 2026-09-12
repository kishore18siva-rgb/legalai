import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding LegalLens database with users and Legal Metrology Rules, 2011...');

  // 1. Create Default Users with Hashed Passwords
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const inspectorPasswordHash = await bcrypt.hash('Inspector@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@legallens.gov.in' },
    update: {},
    create: {
      email: 'admin@legallens.gov.in',
      name: 'System Administrator',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  const legalReviewer = await prisma.user.upsert({
    where: { email: 'reviewer@legallens.gov.in' },
    update: {},
    create: {
      email: 'reviewer@legallens.gov.in',
      name: 'Senior Legal Officer',
      password: passwordHash,
      role: 'LEGAL_REVIEWER',
    },
  });

  const inspector = await prisma.user.upsert({
    where: { email: 'inspector@legallens.gov.in' },
    update: {},
    create: {
      email: 'inspector@legallens.gov.in',
      name: 'Compliance Officer Sharma',
      password: inspectorPasswordHash,
      role: 'INSPECTOR',
    },
  });

  console.log(`Users created: Admin (${admin.email}), Reviewer (${legalReviewer.email}), Inspector (${inspector.email})`);

  // 2. Create Initial Legal Source Document Record
  const pdfHash = crypto.createHash('sha256').update('The Legal Metrology (Packaged Commodities) Rules, 2011').digest('hex');
  
  const legalSource = await prisma.legalSource.upsert({
    where: { id: 'source-lm-2011' },
    update: {},
    create: {
      id: 'source-lm-2011',
      name: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
      version: '2011-V1',
      effectiveDate: '2011-04-01',
      sourceUrl: 'https://consumeraffairs.nic.in/sites/default/files/rules2011.pdf',
      fileHash: pdfHash,
      filePath: 'legal/legal_metrology_rules_2011.pdf',
      status: 'ACTIVE',
      ruleCount: 15,
    },
  });

  // 3. Seed Structured Legal Rules (Rules 1-34 & Schedules I-VII)
  const rules = [
    // Rule 6(1)(a) - Name and Address
    {
      id: 'rule-r6-1-a',
      ruleCode: 'R6_1_A_MFG_INFO',
      ruleNumber: 'Rule 6(1)(a)',
      subRule: '(1)',
      clause: '(a)',
      schedule: null,
      title: 'Declaration of Name and Address of Manufacturer / Packer / Importer',
      requirementText: 'Every package shall bear thereon the name and complete address of the manufacturer, or where manufacturer is not the packer, name & address of manufacturer and packer, and for any imported package the name & address of importer.',
      applicabilityCondition: JSON.stringify({ isRetail: true, exempt: false }),
      validationType: 'REQUIRED_FIELD',
      parameters: JSON.stringify({ requiredFields: ['manufacturer_name', 'manufacturer_address'] }),
      exceptions: JSON.stringify({ foodExemption: 'Prevention of Food Adulteration Act applies' }),
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 5,
      sourceText: 'the name and address of the manufacturer, or where the manufacturer is not the packer, the name and address of the manufacturer and packer and for any imported package the name and address of the importer shall be mentioned.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 6(1)(b) - Generic/Common Name
    {
      id: 'rule-r6-1-b',
      ruleCode: 'R6_1_B_GENERIC_NAME',
      ruleNumber: 'Rule 6(1)(b)',
      subRule: '(1)',
      clause: '(b)',
      schedule: null,
      title: 'Common or Generic Name of Commodity',
      requirementText: 'The common or generic names of the commodity contained in the package and in case of packages with more than one product, the name and number or quantity of each product shall be mentioned on the package.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'REQUIRED_FIELD',
      parameters: JSON.stringify({ requiredFields: ['generic_name'] }),
      exceptions: null,
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 5,
      sourceText: 'The common or generic names of the commodity contained in the package and in case of packages with more than one product, the name and number or quantity of each product shall be mentioned on the package.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 6(1)(c) - Net Quantity
    {
      id: 'rule-r6-1-c',
      ruleCode: 'R6_1_C_NET_QTY',
      ruleNumber: 'Rule 6(1)(c)',
      subRule: '(1)',
      clause: '(c)',
      schedule: null,
      title: 'Declaration of Net Quantity with Standard SI Units',
      requirementText: 'The net quantity, in terms of the standard unit of weight or measure, of the commodity contained in the package or where the commodity is packed or sold by number, the number of the commodity contained in the package shall be mentioned.',
      applicabilityCondition: JSON.stringify({ isRetail: true, minQty: 10 }),
      validationType: 'UNIT_VALIDATION',
      parameters: JSON.stringify({ allowedUnits: ['g', 'kg', 'mg', 'ml', 'l', 'L', 'm', 'cm', 'mm', 'sq m', 'sq cm', 'cubic m', 'cubic cm', 'N', 'U'] }),
      exceptions: JSON.stringify({ Rule26Exemption: 'Packages containing 10g/10ml or less are exempt' }),
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 5,
      sourceText: 'The net quantity, in terms of the standard unit of weight or measure, of the commodity contained in the package or where the commodity is packed or sold by number, the number of the commodity contained in the package shall be mentioned.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 6(1)(d) - Month and Year of Manufacture / Packing / Import
    {
      id: 'rule-r6-1-d',
      ruleCode: 'R6_1_D_MFG_DATE',
      ruleNumber: 'Rule 6(1)(d)',
      subRule: '(1)',
      clause: '(d)',
      schedule: null,
      title: 'Month and Year of Manufacture, Pre-packing, or Import',
      requirementText: 'The month and year in which the commodity is manufactured or pre-packed or imported shall be mentioned in the package.',
      applicabilityCondition: JSON.stringify({ isRetail: true, exemptExclusions: ['bidi', 'incense_sticks', 'lpg_cylinder'] }),
      validationType: 'DATE_FORMAT',
      parameters: JSON.stringify({ allowedFormats: ['MM/YYYY', 'MM-YYYY', 'MMM YYYY', 'Month YYYY'] }),
      exceptions: JSON.stringify({ Rule6_1_g_A: 'No declaration of month/year required for bidis, incense sticks, or LPG cylinders' }),
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 5,
      sourceText: 'The month and year in which the commodity is manufactured or pre-packed or imported shall be mentioned in the package.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 6(1)(e) - Retail Sale Price / MRP
    {
      id: 'rule-r6-1-e',
      ruleCode: 'R6_1_E_MRP',
      ruleNumber: 'Rule 6(1)(e)',
      subRule: '(1)',
      clause: '(e)',
      schedule: null,
      title: 'Retail Sale Price (MRP) Declaration',
      requirementText: 'The retail sale price of the package shall be declared in the form "Maximum or Max. retail price Rs/₹ ....... inclusive of all taxes" or "MRP Rs/₹ ....... incl. of all taxes".',
      applicabilityCondition: JSON.stringify({ isRetail: true, exemptExclusions: ['bidi', 'lpg_apm'] }),
      validationType: 'TEXT_MATCH',
      parameters: JSON.stringify({ requiredSubstrings: ['mrp', 'incl', 'tax'] }),
      exceptions: JSON.stringify({ Rule6_1_g_C: 'No MRP declaration required on bidis or LPG cylinders under APM' }),
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 6,
      sourceText: 'the retail sale price of the package; Provided that for packages containing alcoholic beverages or spirituous liquor, State Excise Laws apply.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 6(2) - Consumer Complaint Contact Info
    {
      id: 'rule-r6-2',
      ruleCode: 'R6_2_COMPLAINT_CONTACT',
      ruleNumber: 'Rule 6(2)',
      subRule: '(2)',
      clause: null,
      schedule: null,
      title: 'Consumer Complaint Contact Information',
      requirementText: 'Every package shall bear the name, address, telephone number, e-mail address, if available, of the person or office that can be contacted in case of consumer complaints.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'REQUIRED_FIELD',
      parameters: JSON.stringify({ requiredFields: ['complaint_contact_name_address', 'complaint_phone_or_email'] }),
      exceptions: null,
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 7,
      sourceText: 'Every package shall bear the name, address, telephone number, e mail address, if available, of the person who can be or the office which can be, contacted, in case of consumer complaints.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 6(3) - Sticker alteration prohibition
    {
      id: 'rule-r6-3',
      ruleCode: 'R6_3_STICKER_ALTERATION',
      ruleNumber: 'Rule 6(3)',
      subRule: '(3)',
      clause: null,
      schedule: null,
      title: 'Prohibition of Individual Stickers for Alteration',
      requirementText: 'It shall not be permissible to affix individual stickers on the package for altering or making declaration required under these rules, provided that for reducing MRP a lower price sticker may be affixed without covering the original MRP declaration.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'MANUAL_REVIEW_REQUIRED',
      parameters: JSON.stringify({ checkType: 'sticker_overlay' }),
      exceptions: JSON.stringify({ MRP_Reduction: 'Stickers permitted only for reducing MRP' }),
      capabilityClass: 'MANUAL_VISUAL_CHECK',
      sourceSourceId: legalSource.id,
      sourcePage: 7,
      sourceText: 'It shall not be permissible to affix individual stickers on the package for altering or making declaration required under these rules: Provided that for reducing the Maximum Retail Price (MRP), a sticker with the revised lower MRP may be affixed',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 7(2) & Table-I / Table-II - Height of Numerals
    {
      id: 'rule-r7-2',
      ruleCode: 'R7_2_NUMERAL_HEIGHT',
      ruleNumber: 'Rule 7(2)',
      subRule: '(2)',
      clause: null,
      schedule: 'Table-I & Table-II',
      title: 'Minimum Height of Numerals on Principal Display Panel',
      requirementText: 'The height of any numeral in the net quantity declaration on PDP shall meet Table-I (by weight/volume: up to 200g/ml -> 1mm; 200g-500g -> 2mm; >500g -> 4mm) and Table-II (by area). Minimum letter height is 1mm.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'FONT_SIZE_CHECK',
      parameters: JSON.stringify({
        weightVolume: [
          { maxQty: 200, minHeightMm: 1, blownMinHeightMm: 2 },
          { maxQty: 500, minHeightMm: 2, blownMinHeightMm: 4 },
          { maxQty: 999999, minHeightMm: 4, blownMinHeightMm: 6 }
        ]
      }),
      exceptions: null,
      capabilityClass: 'MANUAL_VISUAL_CHECK',
      sourceSourceId: legalSource.id,
      sourcePage: 8,
      sourceText: 'The height of any numeral in the declaration required under these rules, on the principal display panel shall not be less than as shown in Table-I or Table-II.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 8(1) - Surrounding Space around Quantity Declaration
    {
      id: 'rule-r8-1',
      ruleCode: 'R8_1_QUANTITY_CLEARANCE',
      ruleNumber: 'Rule 8(1)',
      subRule: '(1)',
      clause: null,
      schedule: null,
      title: 'Clearance Surrounding Net Quantity Declaration',
      requirementText: 'The area surrounding the quantity declaration shall be free from printed information above & below by a space equal to at least the numeral height, and left & right by at least twice the numeral height.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'IMAGE_POSITION_CHECK',
      parameters: JSON.stringify({ topBottomRatio: 1.0, leftRightRatio: 2.0 }),
      exceptions: null,
      capabilityClass: 'MANUAL_VISUAL_CHECK',
      sourceSourceId: legalSource.id,
      sourcePage: 9,
      sourceText: 'Provided that the area surrounding the quantity declaration shall be free from printed information (a) above and below by space equal to at least height of numeral, and (b) left and right by space at least twice the height of numeral.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 9(1) - Legibility and Conspicuity
    {
      id: 'rule-r9-1',
      ruleCode: 'R9_1_LEGIBILITY_CONTRAST',
      ruleNumber: 'Rule 9(1)',
      subRule: '(1)',
      clause: '(a),(b)',
      schedule: null,
      title: 'Legibility, Prominence and Conspicuously Contrasting Background Color',
      requirementText: 'Every declaration shall be legible & prominent. Numerals of retail sale price and net quantity shall be printed/painted in a color that contrasts conspicuously with the background of the label.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'READABILITY_CHECK',
      parameters: JSON.stringify({ contrastRatioMin: 3.0 }),
      exceptions: JSON.stringify({ MoldedSurface: 'Blown or molded labels on glass/plastic do not require contrasting color' }),
      capabilityClass: 'MANUAL_VISUAL_CHECK',
      sourceSourceId: legalSource.id,
      sourcePage: 10,
      sourceText: 'numerals of the retail sale price and net quantity declaration shall be printed, painted or inscribed on the package in a colour that contrasts conspicuously with the background of the label',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 12(6) - Misleading Quantity Expressions
    {
      id: 'rule-r12-6',
      ruleCode: 'R12_6_MISLEADING_EXPRESSIONS',
      ruleNumber: 'Rule 12(6)',
      subRule: '(6)',
      clause: null,
      schedule: null,
      title: 'Prohibition of Exaggerated or Misleading Expressions',
      requirementText: 'The declaration of quantity shall not contain any word or expression like "minimum", "not less than", "average", "about", "approximately" or other words of similar nature.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'TEXT_PRESENCE',
      parameters: JSON.stringify({ forbiddenKeywords: ['minimum', 'min', 'not less than', 'average', 'avg', 'about', 'approx', 'approximately'] }),
      exceptions: JSON.stringify({ ScheduleIII: 'Third Schedule commodities permit "when packed"' }),
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 13,
      sourceText: 'The declaration of quantity shall not contain any word or expression which tends to create an exaggerated, misleading or inadequate impression as to quantity (e.g., minimum, not less than, average, about, approximately)',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 13(4) & (5) - Standard Units & SI Symbols
    {
      id: 'rule-r13-4-5',
      ruleCode: 'R13_4_5_SI_UNITS',
      ruleNumber: 'Rule 13(4),(5)',
      subRule: '(4),(5)',
      clause: null,
      schedule: null,
      title: 'Prohibition of Non-SI Units (Dozen, Gross, FPS)',
      requirementText: 'No number called dozen, score, gross, great gross shall be specified on package. No system of units other than SI shall be used. For items sold by number, symbol should be N or U.',
      applicabilityCondition: JSON.stringify({ isRetail: true }),
      validationType: 'TEXT_PRESENCE',
      parameters: JSON.stringify({ forbiddenTerms: ['dozen', 'gross', 'score', 'lbs', 'oz', 'ft', 'inches'] }),
      exceptions: null,
      capabilityClass: 'OCR_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 14,
      sourceText: 'No number called the dozen, score, gross, great gross or the like shall be specified. No system of units other than International System of Units shall be used.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 5 & Second Schedule - Standard Pack Sizes
    {
      id: 'rule-r5-schedule-2',
      ruleCode: 'R5_SCHEDULE_2_STANDARD_PACK',
      ruleNumber: 'Rule 5',
      subRule: null,
      clause: null,
      schedule: 'Second Schedule',
      title: 'Mandatory Standard Pack Size Validation (Second Schedule)',
      requirementText: 'Specified commodities listed in Second Schedule (e.g. Baby food, Biscuits, Tea, Coffee, Edible Oils, Milk Powder, Soaps, Soft drinks, Cement) MUST be packed in prescribed standard quantities.',
      applicabilityCondition: JSON.stringify({ requiresSchedule2Check: true }),
      validationType: 'STANDARD_PACKAGE_CHECK',
      parameters: JSON.stringify({
        schedules: {
          'Biscuits': ['25g', '50g', '75g', '100g', '150g', '200g', '250g', '300g', 'multiples of 100g up to 1kg'],
          'Tea': ['25g', '50g', '100g', '125g', '250g', '500g', '1kg', 'multiples of 1kg'],
          'Coffee': ['25g', '50g', '100g', '200g', '250g', '500g', '1kg', 'multiples of 1kg'],
          'Baby food': ['100g', '200g', '300g', '400g', '500g', '600g', '700g', '800g', '900g', '1kg', '2kg', '5kg', '10kg'],
          'Edible Oils': ['50g', '100g', '200g', '500g', '1kg', '2kg', '3kg', '5kg', 'multiples of 5kg', '50ml', '100ml', '200ml', '500ml', '1L', '2L', '3L', '5L']
        }
      }),
      exceptions: null,
      capabilityClass: 'STRUCTURED_DATA_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 29,
      sourceText: 'The commodities specified in the Second Schedule shall be packed for sale, distribution or delivery in such standard quantities as are specified in that Schedule.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // Rule 26 - Exemptions
    {
      id: 'rule-r26-exemptions',
      ruleCode: 'R26_EXEMPTIONS',
      ruleNumber: 'Rule 26',
      subRule: null,
      clause: '(a),(b),(c),(d)',
      schedule: null,
      title: 'Applicability Exemptions under Rule 26',
      requirementText: 'Nothing in these rules shall apply to packages: (a) <= 10g or <= 10ml by weight/measure; (b) Fast food items packed by hotel/restaurant; (c) Scheduled/non-scheduled drugs under DPCO 1995; (d) Agricultural produce > 50kg.',
      applicabilityCondition: JSON.stringify({ isExemptCheck: true }),
      validationType: 'APPLICABILITY_RULE',
      parameters: JSON.stringify({ maxExemptWeightGrams: 10, maxExemptVolMl: 10, maxAgriKg: 50 }),
      exceptions: null,
      capabilityClass: 'STRUCTURED_DATA_CHECKABLE',
      sourceSourceId: legalSource.id,
      sourcePage: 24,
      sourceText: 'Nothing contained in these rules shall apply to any package containing a commodity if (a) net weight or measure is 10g or 10ml or less; (b) fast food items packed by restaurant/hotel; (c) DPCO formulations; (d) agricultural produce above 50kg.',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    },
    // First Schedule - Maximum Permissible Error (MPE)
    {
      id: 'rule-r22-schedule-1',
      ruleCode: 'R22_SCHEDULE_1_MPE',
      ruleNumber: 'Rule 22',
      subRule: '(1)',
      clause: null,
      schedule: 'First Schedule',
      title: 'Maximum Permissible Error (MPE) Limits on Quantity',
      requirementText: 'The error in deficiency of net quantity shall not exceed limits in First Schedule Table-I (e.g. up to 50g: 9%; 50-100g: 4.5g; 100-200g: 4.5%; 200-300g: 9g; 300-500g: 3%; 500-1000g: 15g; 1-10kg: 1.5%).',
      applicabilityCondition: JSON.stringify({ hasPhysicalMeasurement: true }),
      validationType: 'QUANTITY_ERROR_CHECK',
      parameters: JSON.stringify({
        table1: [
          { maxQty: 50, percent: 9.0, fixed: null },
          { maxQty: 100, percent: null, fixed: 4.5 },
          { maxQty: 200, percent: 4.5, fixed: null },
          { maxQty: 300, percent: null, fixed: 9.0 },
          { maxQty: 500, percent: 3.0, fixed: null },
          { maxQty: 1000, percent: null, fixed: 15.0 },
          { maxQty: 10000, percent: 1.5, fixed: null },
          { maxQty: 15000, percent: null, fixed: 150.0 },
          { maxQty: 999999, percent: 1.0, fixed: null }
        ]
      }),
      exceptions: null,
      capabilityClass: 'PHYSICAL_MEASUREMENT_REQUIRED',
      sourceSourceId: legalSource.id,
      sourcePage: 28,
      sourceText: 'The maximum permissible error, in excess or in deficiency, in the net quantity by weight or volume of any commodity shall be as specified in Table I below',
      effectiveFrom: '2011-04-01',
      version: 1,
      status: 'ACTIVE',
    }
  ];

  for (const rule of rules) {
    await prisma.legalRule.upsert({
      where: { id: rule.id },
      update: {},
      create: rule,
    });
  }

  console.log(`Successfully seeded ${rules.length} legal rules into database.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
