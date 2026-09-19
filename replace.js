const fs = require('fs');
const file = 'c:/Users/ABISHEK/Documents/kishore/legalai/backend/src/controllers/inspectionController.ts';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const newCode = \    const processPromises = files.map(async (file, i) => {
      const relPath = path.relative(process.cwd(), file.path).replace(/\\\\/g, '/');
      const imageType = imageTypes[i] || (i === 0 ? 'FRONT' : i === 1 ? 'BACK' : i === 2 ? 'LEFT_SIDE' : i === 3 ? 'RIGHT_SIDE' : i === 4 ? 'TOP' : 'BOTTOM');

      const quality = await ocrService.checkImageQuality(file.path);
      const imgRecord = await prisma.inspectionImage.create({
        data: {
          inspectionId: inspection.id,
          imageType,
          originalPath: relPath,
          processedPath: relPath,
          qualityStatus: quality,
          fileSize: file.size,
        },
      });

      const ocrResult = await ocrService.processImage(file.path, imageType, file.originalname);
      await prisma.ocrResult.create({
        data: {
          inspectionImageId: imgRecord.id,
          fullText: ocrResult.fullText,
          confidence: ocrResult.confidence,
          boundingBoxesJson: JSON.stringify(ocrResult.boundingBoxes),
          provider: 'tesseract',
        },
      });

      return {
        imgRecord,
        faceInput: {
          face: imageType,
          imageId: imgRecord.id,
          fullText: ocrResult.fullText,
          boundingBoxes: ocrResult.boundingBoxes,
        },
        ocrText: ocrResult.fullText,
        ocrConfidence: ocrResult.confidence,
      };
    });

    const results = await Promise.all(processPromises);
    for (const res of results) {
      savedImages.push(res.imgRecord);
      faceOcrInputs.push(res.faceInput);
      fullOcrText += '\\n' + res.ocrText;
      totalConfidence += res.ocrConfidence;
    }\;

lines.splice(57, 39, newCode);
fs.writeFileSync(file, lines.join('\n'));
console.log('replaced');
