(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	var CODEWORD_SKEW_SIZE = 2;

	var MAX_ERRORS = 3;
	var MAX_EC_CODEWORDS = 512;

	//endregion

	var errorCorrection = new pdf417.ec.ErrorCorrection();

	//region Private Methods

	/// <summary>
	/// Adjusts the codeword start column.
	/// </summary>
	/// <returns>The codeword start column.</returns>
	/// <param name="image">Image.</param>
	/// <param name="minColumn">Minimum column.</param>
	/// <param name="maxColumn">Max column.</param>
	/// <param name="leftToRight">If set to <c>true</c> left to right.</param>
	/// <param name="codewordStartColumn">Codeword start column.</param>
	/// <param name="imageRow">Image row.</param>
	var adjustCodewordStartColumn = function(image, minColumn, maxColumn, leftToRight, codewordStartColumn, imageRow) {
		var correctedStartColumn = codewordStartColumn,
			increment = leftToRight ? -1 : 1;

		// there should be no black pixels before the start column. If there are, then we need to start earlier.
		for (var i = 0; i < 2; i++) {
			while (((leftToRight && correctedStartColumn >= minColumn) || (!leftToRight && correctedStartColumn < maxColumn)) &&
				leftToRight === image.getBit(correctedStartColumn, imageRow)){

				if (Math.abs(codewordStartColumn - correctedStartColumn) > CODEWORD_SKEW_SIZE) {
					return codewordStartColumn;
				}

				correctedStartColumn += increment;
			}

			increment = -increment;
			leftToRight = !leftToRight;
		}

		return correctedStartColumn;
	};

	/// <summary>
	/// Gets the module bit count.
	/// </summary>
	/// <returns>The module bit count.</returns>
	/// <param name="image">Image.</param>
	/// <param name="minColumn">Minimum column.</param>
	/// <param name="maxColumn">Max column.</param>
	/// <param name="leftToRight">If set to <c>true</c> left to right.</param>
	/// <param name="startColumn">Start column.</param>
	/// <param name="imageRow">Image row.</param>
	var getModuleBitCount = function(image, minColumn, maxColumn, leftToRight, startColumn, imageRow) {
		var imageColumn = startColumn,
			moduleBitCount = zxing.helpers.createArray(8, 0),
			moduleNumber = 0,
			increment = leftToRight ? 1 : -1,
			previousPixelValue = leftToRight;

		while (((leftToRight && imageColumn < maxColumn) || (!leftToRight && imageColumn >= minColumn)) &&
			moduleNumber < moduleBitCount.length) {

			if (image.getBit(imageColumn, imageRow) === previousPixelValue) {
				moduleBitCount[moduleNumber]++;
				imageColumn += increment;
			} else {
				moduleNumber++;
				previousPixelValue = !previousPixelValue;
			}
		}

		if (moduleNumber === moduleBitCount.length ||
			(((leftToRight && imageColumn === maxColumn) || (!leftToRight && imageColumn === minColumn)) && moduleNumber === moduleBitCount.length - 1)) {
			return moduleBitCount;
		}

		return null;
	};

	/// <summary>
	/// Checks the codeword for any skew.
	/// </summary>
	/// <returns><c>true</c>, if codeword is within the skew, <c>false</c> otherwise.</returns>
	/// <param name="codewordSize">Codeword size.</param>
	/// <param name="minCodewordWidth">Minimum codeword width.</param>
	/// <param name="maxCodewordWidth">Max codeword width.</param>
	var checkCodewordSkew = function(codewordSize, minCodewordWidth, maxCodewordWidth) {
		return minCodewordWidth - CODEWORD_SKEW_SIZE <= codewordSize &&
			codewordSize <= maxCodewordWidth + CODEWORD_SKEW_SIZE;
	};

	/// <summary>
	/// Gets the bit count for codeword.
	/// </summary>
	/// <returns>The bit count for codeword.</returns>
	/// <param name="codeword">Codeword.</param>
	var getBitCountForCodeword = function(codeword) {
		var result = zxing.helpers.createArray(8, 0),
			previousValue = 0,
			i = result.length - 1;

		while (true) {
			if ((codeword & 0x1) !== previousValue) {
				previousValue = codeword & 0x1;

				i--;

				if (i < 0) {
					break;
				}
			}

			result[i]++;
			codeword >>= 1;
		}

		return result;
	};

	/// <summary>
	/// Gets the codeword bucket number.
	/// </summary>
	/// <returns>The codeword bucket number.</returns>
	/// <param name="codeword">Codeword.</param>
	var getCodewordBucketNumber = function(codeword) {
		return getCodewordBucketNumberByModuleBitCount(getBitCountForCodeword(codeword));
	};

	/// <summary>
	/// Gets the codeword bucket number.
	/// </summary>
	/// <returns>The codeword bucket number.</returns>
	/// <param name="moduleBitCount">Module bit count.</param>
	var getCodewordBucketNumberByModuleBitCount = function(moduleBitCount) {
		return (moduleBitCount[0] - moduleBitCount[2] + moduleBitCount[4] - moduleBitCount[6] + 9) % 9;
	};


	/// <summary>
	/// Detects the codeword.
	/// </summary>
	/// <returns>The codeword.</returns>
	/// <param name="image">Image.</param>
	/// <param name="minColumn">Minimum column.</param>
	/// <param name="maxColumn">Max column.</param>
	/// <param name="leftToRight">If set to <c>true</c> left to right.</param>
	/// <param name="startColumn">Start column.</param>
	/// <param name="imageRow">Image row.</param>
	/// <param name="minCodewordWidth">Minimum codeword width.</param>
	/// <param name="maxCodewordWidth">Max codeword width.</param>
	var detectCodeword = function(image, minColumn, maxColumn, leftToRight, startColumn, imageRow, minCodewordWidth, maxCodewordWidth) {
		startColumn = adjustCodewordStartColumn(image, minColumn, maxColumn, leftToRight, startColumn, imageRow);

		// we usually know fairly exact now how long a codeword is. We should provide minimum and maximum expected length
		// and try to adjust the read pixels, e.g. remove single pixel errors or try to cut off exceeding pixels.
		// min and maxCodewordWidth should not be used as they are calculated for the whole barcode an can be inaccurate
		// for the current position
		var moduleBitCount = getModuleBitCount(image, minColumn, maxColumn, leftToRight, startColumn, imageRow);

		if (moduleBitCount === null) {
			return null;
		}

		var codewordBitCount = pdf417.common.getBitCountSum(moduleBitCount),
			endColumn;

		if (leftToRight) {
			endColumn = startColumn + codewordBitCount;
		} else {
			for (var i = 0; i < (moduleBitCount.length >> 1); i++) {
				var tmpCount = moduleBitCount[i];
				moduleBitCount[i] = moduleBitCount[moduleBitCount.length - 1 - i];
				moduleBitCount[moduleBitCount.length - 1 - i] = tmpCount;
			}

			endColumn = startColumn;
			startColumn = endColumn - codewordBitCount;
		}

		// TODO implement check for width and correction of black and white bars
		// use start (and maybe stop pattern) to determine if blackbars are wider than white bars. If so, adjust.
		// should probably done only for codewords with a lot more than 17 bits.
		// The following fixes 10-1.png, which has wide black bars and small white bars
		//    for (int i = 0; i < moduleBitCount.Length; i++) {
		//      if (i % 2 == 0) {
		//        moduleBitCount[i]--;
		//      } else {
		//        moduleBitCount[i]++;
		//      }
		//    }

		// We could also use the width of surrounding codewords for more accurate results, but this seems
		// sufficient for now
		if (!checkCodewordSkew(codewordBitCount, minCodewordWidth, maxCodewordWidth)) {
			// We could try to use the startX and endX position of the codeword in the same column in the previous row,
			// create the bit count from it and normalize it to 8. This would help with single pixel errors.
			return null;
		}

		var decodedValue = pdf417.CodewordDecoder.getDecodedValue(moduleBitCount),
			codeword = pdf417.common.getCodeword(decodedValue);

		if (codeword === -1) {
			return null;
		}

		return new pdf417.Codeword(startColumn, endColumn, getCodewordBucketNumber(decodedValue), codeword);
	};

	/// <summary>
	/// Gets the row indicator column.
	/// </summary>
	/// <returns>The row indicator column.</returns>
	/// <param name="image">Image.</param>
	/// <param name="boundingBox">Bounding box.</param>
	/// <param name="startPoint">Start point.</param>
	/// <param name="leftToRight">If set to <c>true</c> left to right.</param>
	/// <param name="minCodewordWidth">Minimum codeword width.</param>
	/// <param name="maxCodewordWidth">Max codeword width.</param>
	var getRowIndicatorColumn = function(image, boundingBox, startPoint, leftToRight, minCodewordWidth, maxCodewordWidth) {
		var rowIndicatorColumn = new pdf417.DetectionResultRowIndicatorColumn(boundingBox, leftToRight);

		for (var i = 0; i < 2; i++) {
			var increment = i === 0 ? 1 : -1,
				startColumn = Math.floor(startPoint.x);

			for(var imageRow = Math.floor(startPoint.y); imageRow <= boundingBox.maxY && imageRow >= boundingBox.minY; imageRow += increment) {
				var codeword = detectCodeword(image, 0, image.width, leftToRight, startColumn, imageRow, minCodewordWidth, maxCodewordWidth);

				if (codeword !== null) {
					rowIndicatorColumn.setCodeword(imageRow, codeword);

					if (leftToRight) {
						startColumn = codeword.startX;
					} else {
						startColumn = codeword.endX;
					}
				}
			}
		}
		return rowIndicatorColumn;
	};

	/// <summary>
	/// Gets the barcode metadata.
	/// </summary>
	/// <returns>The barcode metadata.</returns>
	/// <param name="leftRowIndicatorColumn">Left row indicator column.</param>
	/// <param name="rightRowIndicatorColumn">Right row indicator column.</param>
	var getBarcodeMetadata = function(leftRowIndicatorColumn, rightRowIndicatorColumn) {
		var leftBarcodeMetadata;

		if (!leftRowIndicatorColumn ||
			(leftBarcodeMetadata = leftRowIndicatorColumn.getBarcodeMetadata()) === null) {
			return rightRowIndicatorColumn === null ? null : rightRowIndicatorColumn.getBarcodeMetadata();
		}

		var rightBarcodeMetadata;

		if (!rightRowIndicatorColumn ||
			(rightBarcodeMetadata = rightRowIndicatorColumn.getBarcodeMetadata()) === null) {
			return leftBarcodeMetadata;
		}

		if (leftBarcodeMetadata.columnCount !== rightBarcodeMetadata.columnCount &&
			leftBarcodeMetadata.errorCorrectionLevel !== rightBarcodeMetadata.errorCorrectionLevel &&
			leftBarcodeMetadata.rowCount !== rightBarcodeMetadata.rowCount) {
			return null;
		}

		return leftBarcodeMetadata;
	};

	var getMax = function(values) {
		var maxValue = -1;

		for (var index = values.length - 1; index >= 0; index--) {
			maxValue = Math.max(maxValue, values[index]);
		}

		return maxValue;
	};

	/// <summary>
	/// Adjusts the bounding box.
	/// </summary>
	/// <returns>The bounding box.</returns>
	/// <param name="rowIndicatorColumn">Row indicator column.</param>
	var adjustBoundingBox = function(rowIndicatorColumn) {
		if (rowIndicatorColumn === null) {
			return null;
		}

		var rowHeights = rowIndicatorColumn.getRowHeights();

		if (rowHeights === null){
			return null;
		}

		var maxRowHeight = getMax(rowHeights),
			missingStartRows = 0;

		for(var i = 0; i < rowHeights.length; i++) {
			var rowHeight = rowHeights[i];

			missingStartRows += maxRowHeight - rowHeight;

			if (rowHeight > 0){
				break;
			}
		}

		var codewords = rowIndicatorColumn.codewords;

		for (var row = 0; missingStartRows > 0 && codewords[row] === null; row++) {
			missingStartRows--;
		}

		var missingEndRows = 0;

		for (var row = rowHeights.length - 1; row >= 0; row--) {
			missingEndRows += maxRowHeight - rowHeights[row];

			if (rowHeights[row] > 0) {
				break;
			}
		}

		for (var row = codewords.length - 1; missingEndRows > 0 && codewords[row] === null; row--) {
			missingEndRows--;
		}

		return rowIndicatorColumn.box.addMissingRows(missingStartRows, missingEndRows, rowIndicatorColumn.isLeft);
	};

	/// <summary>
	/// Merge the specified leftRowIndicatorColumn and rightRowIndicatorColumn.
	/// </summary>
	/// <param name="leftRowIndicatorColumn">Left row indicator column.</param>
	/// <param name="rightRowIndicatorColumn">Right row indicator column.</param>
	var merge = function(leftRowIndicatorColumn, rightRowIndicatorColumn) {
		if (leftRowIndicatorColumn === null && rightRowIndicatorColumn === null) {
			return null;
		}

		var barcodeMetadata = getBarcodeMetadata(leftRowIndicatorColumn, rightRowIndicatorColumn);

		if (barcodeMetadata === null) {
			return null;
		}

		var boundingBox = pdf417.BoundingBox.merge(adjustBoundingBox(leftRowIndicatorColumn), adjustBoundingBox(rightRowIndicatorColumn));

		return new pdf417.DetectionResult(barcodeMetadata, boundingBox);
	};

	/// <summary>
	/// Tests to see if the Barcode Column is Valid
	/// </summary>
	/// <returns><c>true</c>, if barcode column is valid, <c>false</c> otherwise.</returns>
	/// <param name="detectionResult">Detection result.</param>
	/// <param name="barcodeColumn">Barcode column.</param>
	var isValidBarcodeColumn = function(detectionResult, barcodeColumn) {
		return (barcodeColumn >= 0) && (barcodeColumn <= detectionResult.detectionResultColumns.length + 1);
	};

	/// <summary>
	/// Gets the start column.
	/// </summary>
	/// <returns>The start column.</returns>
	/// <param name="detectionResult">Detection result.</param>
	/// <param name="barcodeColumn">Barcode column.</param>
	/// <param name="imageRow">Image row.</param>
	/// <param name="leftToRight">If set to <c>true</c> left to right.</param>
	var getStartColumn = function(detectionResult, barcodeColumn, imageRow, leftToRight) {
		var offset = leftToRight ? 1 : -1;

		var codeword = null;

		if (isValidBarcodeColumn(detectionResult, barcodeColumn - offset)) {
			codeword = detectionResult.detectionResultColumns[barcodeColumn - offset].getCodeword(imageRow);
		}

		if (codeword !== null) {
			return leftToRight ? codeword.endX : codeword.startX;
		}

		codeword = detectionResult.detectionResultColumns[barcodeColumn].getCodewordNearby(imageRow);

		if (codeword !== null) {
			return leftToRight ? codeword.startX : codeword.endX;
		}

		if (isValidBarcodeColumn(detectionResult, barcodeColumn - offset)) {
			codeword = detectionResult.detectionResultColumns[barcodeColumn - offset].getCodewordNearby(imageRow);
		}

		if (codeword !== null) {
			return leftToRight ? codeword.endX : codeword.startX;
		}

		var skippedColumns = 0;

		while (isValidBarcodeColumn(detectionResult, barcodeColumn - offset)) {
			barcodeColumn -= offset;

			for(var i = 0; i < detectionResult.detectionResultColumns[barcodeColumn].codewords.length; i++) {
				var previousRowCodeword = detectionResult.detectionResultColumns[barcodeColumn].codewords;

				if (previousRowCodeword !== null) {
					return (leftToRight ? previousRowCodeword.endX : previousRowCodeword.startX) +
						offset * skippedColumns * (previousRowCodeword.endX - previousRowCodeword.startX);
				}
			}
			skippedColumns++;
		}

		return leftToRight ? detectionResult.box.minX : detectionResult.box.maxX;
	};

	/// <summary>
	/// Creates the barcode matrix.
	/// </summary>
	/// <returns>The barcode matrix.</returns>
	/// <param name="detectionResult">Detection result.</param>
	var createBarcodeMatrix = function(detectionResult) {
		// Manually setup Jagged Array in C#

		var barcodeMatrix = zxing.helpers.createArray(detectionResult.rowCount, function(){
			return [];
		});

		for (var row = 0; row < barcodeMatrix.length; row++) {
			barcodeMatrix[row] = zxing.helpers.createArray(detectionResult.columnCount + 2, null);

			for (var col = 0; col < barcodeMatrix[row].length; col++) {
				barcodeMatrix[row][col] = new pdf417.BarcodeValue();
			}
		}

		var column = -1;

		var detectionResultColumns = detectionResult.getDetectionResultColumns();

		for(var i = 0; i < detectionResultColumns.length; i++) {
			var detectionResultColumn = detectionResultColumns[i];

			column++;

			if (detectionResultColumn === null) {
				continue;
			}

			for (var j = 0; j < detectionResultColumn.codewords.length; j++) {
				var codeword = detectionResultColumn.codewords[j];

				if (codeword === null || codeword.rowNumber === -1) {
					continue;
				}

				barcodeMatrix[codeword.rowNumber][column].setValue(codeword.value);
			}
		}

		return barcodeMatrix;
	};

	/// <summary>
	/// Gets the number of EC code words.
	/// </summary>
	/// <returns>The number of EC code words.</returns>
	/// <param name="barcodeECLevel">Barcode EC level.</param>
	var getNumberOfECCodeWords = function(barcodeECLevel) {
		return 2 << barcodeECLevel;
	};

	/// <summary>
	/// Adjusts the codeword count.
	/// </summary>
	/// <param name="detectionResult">Detection result.</param>
	/// <param name="barcodeMatrix">Barcode matrix.</param>
	var adjustCodewordCount = function(detectionResult, barcodeMatrix) {
		var numberOfCodewords = barcodeMatrix[0][1].getValue(),
			calculatedNumberOfCodewords = detectionResult.columnCount * detectionResult.rowCount - getNumberOfECCodeWords(detectionResult.errorCorrectionLevel);

		if (numberOfCodewords.length === 0) {

			if (calculatedNumberOfCodewords < 1 || calculatedNumberOfCodewords > pdf417.common.MAX_CODEWORDS_IN_BARCODE) {
				return false;
			}

			barcodeMatrix[0][1].setValue(calculatedNumberOfCodewords);
		} else if (numberOfCodewords[0] !== calculatedNumberOfCodewords) {
			// The calculated one is more reliable as it is derived from the row indicator columns
			barcodeMatrix[0][1].setValue(calculatedNumberOfCodewords);
		}

		return true;
	};

	/// <summary>
	/// Given data and error-correction codewords received, possibly corrupted by errors, attempts to
	/// correct the errors in-place.
	/// </summary>
	/// <returns>The errors.</returns>
	/// <param name="codewords">data and error correction codewords.</param>
	/// <param name="erasures">positions of any known erasures.</param>
	/// <param name="numECCodewords">number of error correction codewords that are available in codewords.</param>
	var correctErrors = function(codewords, erasures, numECCodewords) {
		if (erasures !== null &&
			erasures.length > numECCodewords/2 + MAX_ERRORS ||
			numECCodewords < 0 ||
			numECCodewords > MAX_EC_CODEWORDS) {
			// Too many errors or EC Codewords is corrupted
			return -1;
		}

		var decodeResult = errorCorrection.decode(codewords, numECCodewords, erasures);

		if (!decodeResult.result) {
			return -1;
		}

		return decodeResult.errorLocationsCount;
	};

	/// <summary>
	/// Verifies that all is well with the the codeword array.
	/// </summary>
	/// <param name="codewords">Codewords.</param>
	/// <param name="numECCodewords">Number EC codewords.</param>
	var verifyCodewordCount = function(codewords, numECCodewords) {
		if (codewords.length < 4) {
			// Codeword array size should be at least 4 allowing for
			// Count CW, At least one Data CW, Error Correction CW, Error Correction CW
			return false;
		}

		// The first codeword, the Symbol Length Descriptor, shall always encode the total number of data
		// codewords in the symbol, including the Symbol Length Descriptor itself, data codewords and pad
		// codewords, but excluding the number of error correction codewords.
		var numberOfCodewords = codewords[0];

		if (numberOfCodewords > codewords.length) {
			return false;
		}

		if (numberOfCodewords === 0) {

			// Reset to the Length of the array - 8 (Allow for at least level 3 Error Correction (8 Error Codewords)
			if (numECCodewords < codewords.length) {
				codewords[0] = codewords.length - numECCodewords;
			} else {
				return false;
			}
		}

		return true;
	};

	/// <summary>
	/// Decodes the codewords.
	/// </summary>
	/// <returns>The codewords.</returns>
	/// <param name="codewords">Codewords.</param>
	/// <param name="ecLevel">Ec level.</param>
	/// <param name="erasures">Erasures.</param>
	var decodeCodewords = function(codewords, ecLevel, erasures) {
		if (codewords.length === 0) {
			return null;
		}

		var numECCodewords = 1 << (ecLevel + 1),
			correctedErrorsCount = correctErrors(codewords, erasures, numECCodewords);

		if (correctedErrorsCount < 0) {
			return null;
		}

		if (!verifyCodewordCount(codewords, numECCodewords)) {
			return null;
		}

		// Decode the codewords
		var decoderResult = pdf417.DecodedBitStreamParser.decode(codewords, ecLevel.toString());

		if (decoderResult !== null) {
			decoderResult.errorsCorrected = correctedErrorsCount;
			decoderResult.erasures = erasures.length;
		}

		return decoderResult;
	};

	/// <summary>
	/// This method deals with the fact, that the decoding process doesn't always yield a single most likely value. The
	/// current error correction implementation doesn't deal with erasures very well, so it's better to provide a value
	/// for these ambiguous codewords instead of treating it as an erasure. The problem is that we don't know which of
	/// the ambiguous values to choose. We try decode using the first value, and if that fails, we use another of the
	/// ambiguous values and try to decode again. This usually only happens on very hard to read and decode barcodes,
	/// so decoding the normal barcodes is not affected by this.
	/// </summary>
	/// <returns>The decoder result from ambiguous values.</returns>
	/// <param name="ecLevel">Ec level.</param>
	/// <param name="codewords">Codewords.</param>
	/// <param name="erasureArray">contains the indexes of erasures.</param>
	/// <param name="ambiguousIndexes">array with the indexes that have more than one most likely value.</param>
	/// <param name="ambiguousIndexValues">two dimensional array that contains the ambiguous values. The first dimension must
	/// be the same Length as the ambiguousIndexes array.</param>
	var createDecoderResultFromAmbiguousValues = function(ecLevel, codewords, erasureArray, ambiguousIndexes, ambiguousIndexValues) {
		var ambiguousIndexCount = zxing.helpers.createArray(ambiguousIndexes.length, 0);

		var tries = 100;

		while(tries-- > 0) {
			for (var i = 0; i < ambiguousIndexCount.length; i++) {
				codewords[ambiguousIndexes[i]] = ambiguousIndexValues[i][ambiguousIndexCount[i]];
			}

			try
			{
				var result = decodeCodewords(codewords, ecLevel, erasureArray);

				if (result !== null){
					return result;
				}
			} catch (e) {
				// ignored, should not happen
			}

			if (ambiguousIndexCount.length === 0) {
				return null;
			}

			for (var i = 0; i < ambiguousIndexCount.length; i++) {
				if (ambiguousIndexCount[i] < ambiguousIndexValues[i].length - 1) {
					ambiguousIndexCount[i]++;
					break;
				} else {
					ambiguousIndexCount[i] = 0;

					if (i === ambiguousIndexCount.length - 1) {
						return null;
					}
				}
			}
		}

		return null;
	};

	/// <summary>
	/// Creates the decoder result.
	/// </summary>
	/// <returns>The decoder result.</returns>
	/// <param name="detectionResult">Detection result.</param>
	var createDecoderResult = function(detectionResult) {
		var barcodeMatrix = createBarcodeMatrix(detectionResult);

		if (!adjustCodewordCount(detectionResult, barcodeMatrix)) {
			return null;
		}

		var erasures = [],
			codewords = zxing.helpers.createArray(detectionResult.rowCount * detectionResult.columnCount, 0),
			ambiguousIndexValuesList = [],
			ambiguousIndexesList = [];

		for (var row = 0; row < detectionResult.rowCount; row++) {
			for (var column = 0; column < detectionResult.columnCount; column++) {

				var values = barcodeMatrix[row][column + 1].getValue(),
					codewordIndex = row * detectionResult.columnCount + column;

				if (values.length === 0) {
					erasures.push(codewordIndex);
				} else if (values.length === 1) {
					codewords[codewordIndex] = values[0];
				} else {
					ambiguousIndexesList.push(codewordIndex);
					ambiguousIndexValuesList.push(values);
				}
			}
		}

		var ambiguousIndexValues = zxing.helpers.createArray(ambiguousIndexValuesList.length, function() {
			return [];
		});

		for (var i = 0; i < ambiguousIndexValues.length; i++) {
			ambiguousIndexValues[i] = ambiguousIndexValuesList[i];
		}

		return createDecoderResultFromAmbiguousValues(detectionResult.errorCorrectionLevel, codewords, erasures, ambiguousIndexesList, ambiguousIndexValues);
	};

	/// <summary>
	/// Decode the specified image, imageTopLeft, imageBottomLeft, imageTopRight, imageBottomRight, minCodewordWidth
	/// and maxCodewordWidth.
	/// TODO: don't pass in minCodewordWidth and maxCodewordWidth, pass in barcode columns for start and stop pattern
	/// columns. That way width can be deducted from the pattern column.
	/// This approach also allows to detect more details about the barcode, e.g. if a bar type (white or black) is wider
	/// than it should be. This can happen if the scanner used a bad blackpoint.
	/// </summary>
	/// <param name="image">Image.</param>
	/// <param name="imageTopLeft">Image top left.</param>
	/// <param name="imageBottomLeft">Image bottom left.</param>
	/// <param name="imageTopRight">Image top right.</param>
	/// <param name="imageBottomRight">Image bottom right.</param>
	/// <param name="minCodewordWidth">Minimum codeword width.</param>
	/// <param name="maxCodewordWidth">Max codeword width.</param>
	var decode = function(image, imageTopLeft, imageBottomLeft, imageTopRight, imageBottomRight, minCodewordWidth, maxCodewordWidth) {
		var boundingBox = new pdf417.BoundingBox(image, imageTopLeft, imageBottomLeft, imageTopRight, imageBottomRight);

		if(boundingBox === null) {
			return null;
		}

		var leftRowIndicatorColumn = null,
			rightRowIndicatorColumn = null,
			detectionResult = null;

		for(var i = 0; i < 2; i++) {
			if(!!imageTopLeft) {
				leftRowIndicatorColumn = getRowIndicatorColumn(image, boundingBox, imageTopLeft, true, minCodewordWidth, maxCodewordWidth);
			}

			if(!!imageTopRight) {
				rightRowIndicatorColumn = getRowIndicatorColumn(image, boundingBox, imageTopRight, false, minCodewordWidth, maxCodewordWidth);
			}

			detectionResult = merge(leftRowIndicatorColumn, rightRowIndicatorColumn);

			if(detectionResult === null) {
				// TODO Based on Owen's Comments in <see cref="ZXing.ReaderException"/>, this method has been modified to continue silently
				// if a barcode was not decoded where it was detected instead of throwing a new exception object.
				return null;
			}

			if(i === 0 && detectionResult.box !== null &&
				(detectionResult.box.minY < boundingBox.minY || detectionResult.box.maxY > boundingBox.maxY)) {
				boundingBox = detectionResult.box;
			} else {
				detectionResult.box = boundingBox;
				break;
			}
		}

		var maxBarcodeColumn = detectionResult.columnCount + 1;

		detectionResult.detectionResultColumns[0] = leftRowIndicatorColumn;

		detectionResult.detectionResultColumns[maxBarcodeColumn] = rightRowIndicatorColumn;

		var leftToRight = leftRowIndicatorColumn !== null;

		for(var barcodeColumnCount = 1; barcodeColumnCount <= maxBarcodeColumn; barcodeColumnCount++) {
			var barcodeColumn = leftToRight ? barcodeColumnCount : maxBarcodeColumn - barcodeColumnCount;

			if(detectionResult.detectionResultColumns[barcodeColumn] !== null) {
				// This will be the case for the opposite row indicator column, which doesn't need to be decoded again.
				continue;
			}

			var detectionResultColumn;

			if(barcodeColumn === 0 || barcodeColumn === maxBarcodeColumn) {
				detectionResultColumn = new pdf417.DetectionResultRowIndicatorColumn(boundingBox, barcodeColumn === 0);
			} else {
				detectionResultColumn = new pdf417.DetectionResultColumn(boundingBox);
			}

			detectionResult.detectionResultColumns[barcodeColumn] = detectionResultColumn;

			var startColumn = -1,
				previousStartColumn = startColumn;

			// TODO start at a row for which we know the start position, then detect upwards and downwards from there.
			for(var imageRow = boundingBox.minY; imageRow <= boundingBox.maxY; imageRow++) {
				startColumn = getStartColumn(detectionResult, barcodeColumn, imageRow, leftToRight);

				if(startColumn < 0 || startColumn > boundingBox.maxX) {
					if(previousStartColumn === -1) {
						continue;
					}

					startColumn = previousStartColumn;
				}

				var codeword = detectCodeword(image, boundingBox.minX, boundingBox.maxX, leftToRight,
					startColumn, imageRow, minCodewordWidth, maxCodewordWidth);

				if(codeword !== null) {
					detectionResultColumn.setCodeword(imageRow, codeword);
					previousStartColumn = startColumn;
					minCodewordWidth = Math.min(minCodewordWidth, codeword.width);
					maxCodewordWidth = Math.max(maxCodewordWidth, codeword.width);
				}
			}
		}

		return createDecoderResult(detectionResult);
	};

	//endregion

	//region Public Members

	pdf417.decoder = {
		decode: decode
	};

	//endregion
})(window.zxing || (window.zxing = {}));