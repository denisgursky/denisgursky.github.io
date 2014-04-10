(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	var ROW_STEP = 5;
	var START_PATTERN = [8, 1, 1, 1, 1, 1, 1, 3];
	var STOP_PATTERN = [7, 1, 1, 3, 1, 1, 1, 2, 1];
	var INDEXES_START_PATTERN = [0, 4, 1, 5];
	var INDEXES_STOP_PATTERN = [6, 2, 7, 3];

	var INTEGER_MATH_SHIFT = 8;
	var PATTERN_MATCH_RESULT_SCALE_FACTOR = 1 << INTEGER_MATH_SHIFT;
	var MAX_AVG_VARIANCE = Math.floor(PATTERN_MATCH_RESULT_SCALE_FACTOR*0.42);
	var MAX_INDIVIDUAL_VARIANCE = Math.floor(PATTERN_MATCH_RESULT_SCALE_FACTOR*0.8);

	var MAX_PIXEL_DRIFT = 3;
	var MAX_PATTERN_DRIFT = 5;

	var SKIPPED_ROW_COUNT_MAX = 25;
	var BARCODE_MIN_HEIGHT = 10;

	//endregion

	//region Private Function

	/// <summary>
	/// Copies the temp data to the final result
	/// </summary>
	/// <param name="result">Result.</param>
	/// <param name="tmpResult">Temp result.</param>
	/// <param name="destinationIndexes">Destination indexes.</param>
	var copyToResult = function(result, tmpResult, destinationIndexes){
		for (var i = 0; i < destinationIndexes.length; i++) {
			result[destinationIndexes[i]] = tmpResult[i];
		}
	};

	/// <summary>
	/// Determines how closely a set of observed counts of runs of black/white.
	/// values matches a given target pattern. This is reported as the ratio of
	/// the total variance from the expected pattern proportions across all
	/// pattern elements, to the length of the pattern.
	/// </summary>
	/// <returns>
	/// ratio of total variance between counters and pattern compared to
	/// total pattern size, where the ratio has been multiplied by 256.
	/// So, 0 means no variance (perfect match); 256 means the total
	/// variance between counters and patterns equals the pattern length,
	/// higher values mean even more variance
	/// </returns>
	/// <param name="counters">observed counters.</param>
	/// <param name="pattern">expected pattern.</param>
	/// <param name="maxIndividualVariance">The most any counter can differ before we give up.</param>
	var patternMatchVariance = function(counters, pattern, maxIndividualVariance){
		var numCounters = counters.length,
			total = 0,
			patternLength = 0;

		for (var i = 0; i < numCounters; i++){
			total += counters[i];
			patternLength += pattern[i];
		}

		if (total < patternLength) {
			// If we don't even have one pixel per unit of bar width, assume this
			// is too small to reliably match, so fail:
			return Number.MAX_VALUE;
		}

		// We're going to fake floating-point math in integers. We just need to use more bits.
		// Scale up patternLength so that intermediate values below like scaledCounter will have
		// more "significant digits".
		var unitBarWidth = (total << INTEGER_MATH_SHIFT)/patternLength;

		maxIndividualVariance = (maxIndividualVariance*unitBarWidth) >> INTEGER_MATH_SHIFT;

		var totalVariance = 0;

		for (var x = 0; x < numCounters; x++) {
			var counter = counters[x] << INTEGER_MATH_SHIFT;
			var scaledPattern = pattern[x]*unitBarWidth;
			var variance = counter > scaledPattern ? counter - scaledPattern : scaledPattern - counter;

			if (variance > maxIndividualVariance) {
				return Number.MAX_VALUE;
			}

			totalVariance += variance;
		}

		return totalVariance/total;
	};

	/// <summary>
	/// Finds the guard pattern.  Uses System.Linq.Enumerable.Repeat to fill in counters.  This might be a performance issue?
	/// </summary>
	/// <returns>start/end horizontal offset of guard pattern, as an array of two ints.</returns>
	/// <param name="matrix">matrix row of black/white values to search</param>
	/// <param name="column">column x position to start search.</param>
	/// <param name="row">row y position to start search.</param>
	/// <param name="width">width the number of pixels to search on this row.</param>
	/// <param name="whiteFirst">If set to <c>true</c> search the white patterns first.</param>
	/// <param name="pattern">pattern of counts of number of black and white pixels that are being searched for as a pattern.</param>
	/// <param name="counters">counters array of counters, as long as pattern, to re-use .</param>
	var findGuardPattern = function(matrix, column, row, width, whiteFirst, pattern, counters) {
		//SupportClass.Fill(counters, 0);
		counters = zxing.helpers.createArray(counters.length, 0);

		var patternLength = pattern.length,
			isWhite = whiteFirst,
			patternStart = column,
			pixelDrift = 0;

		// if there are black pixels left of the current pixel shift to the left, but only for MAX_PIXEL_DRIFT pixels
		while (matrix.getBit(patternStart, row) && patternStart > 0 && pixelDrift++ < MAX_PIXEL_DRIFT) {
			patternStart--;
		}

		var x = patternStart,
			counterPosition = 0;

		for (; x < width; x++)
		{
			var pixel = matrix.getBit(x, row);

			if (pixel ^ isWhite) {
				counters[counterPosition]++;
			} else {
				if (counterPosition === patternLength - 1) {
					if (patternMatchVariance(counters, pattern, MAX_INDIVIDUAL_VARIANCE) < MAX_AVG_VARIANCE) {
						return [patternStart, x];
					}

					patternStart += counters[0] + counters[1];

					zxing.helpers.copyArrayItems(counters, 2, counters, 0, patternLength - 2);

					counters[patternLength - 2] = 0;
					counters[patternLength - 1] = 0;
					counterPosition--;
				} else {
					counterPosition++;
				}

				counters[counterPosition] = 1;
				isWhite = !isWhite;
			}
		}
		if (counterPosition === patternLength - 1) {
			if (patternMatchVariance(counters, pattern, MAX_INDIVIDUAL_VARIANCE) < MAX_AVG_VARIANCE) {
				return [patternStart, x - 1];
			}
		}

		return null;
	};

	/// <summary>
	/// Finds the rows with the given pattern.
	/// </summary>
	/// <returns>The rows with pattern.</returns>
	/// <param name="matrix">Matrix.</param>
	/// <param name="height">Height.</param>
	/// <param name="width">Width.</param>
	/// <param name="startRow">Start row.</param>
	/// <param name="startColumn">Start column.</param>
	/// <param name="pattern">Pattern.</param>
	var findRowsWithPattern = function(matrix, height, width, startRow, startColumn, pattern) {

		var result = [],
			found = false,
			counters = zxing.helpers.createArray(pattern.length, 0);

		for (; startRow < height; startRow += ROW_STEP) {
			var loc = findGuardPattern(matrix, startColumn, startRow, width, false, pattern, counters);

			if (loc !== null) {
				while (startRow > 0) {
					var previousRowLoc = findGuardPattern(matrix, startColumn, --startRow, width, false, pattern, counters);

					if (previousRowLoc !== null) {
						loc = previousRowLoc;
					} else {
						startRow++;
						break;
					}
				}

				result[0] = new zxing.ResultPoint(loc[0], startRow);
				result[1] = new zxing.ResultPoint(loc[1], startRow);
				found = true;

				break;
			}
		}

		var stopRow = startRow + 1;

		// Last row of the current symbol that contains pattern
		if (found) {
			var skippedRowCount = 0;

			var previousRowLoc = [Math.floor(result[0].x), Math.floor(result[1].x)];

			for (; stopRow < height; stopRow++) {
				var loc = findGuardPattern(matrix, previousRowLoc[0], stopRow, width, false, pattern, counters);

				// a found pattern is only considered to belong to the same barcode if the start and end positions
				// don't differ too much. Pattern drift should be not bigger than two for consecutive rows. With
				// a higher number of skipped rows drift could be larger. To keep it simple for now, we allow a slightly
				// larger drift and don't check for skipped rows.
				if (loc !== null &&
					Math.abs(previousRowLoc[0] - loc[0]) < MAX_PATTERN_DRIFT &&
					Math.abs(previousRowLoc[1] - loc[1]) < MAX_PATTERN_DRIFT)
				{
					previousRowLoc = loc;
					skippedRowCount = 0;
				}
				else
				{
					if (skippedRowCount > SKIPPED_ROW_COUNT_MAX)
					{
						break;
					}
					else
					{
						skippedRowCount++;
					}
				}
			}

			stopRow -= skippedRowCount + 1;
			result[2] = new zxing.ResultPoint(previousRowLoc[0], stopRow);
			result[3] = new zxing.ResultPoint(previousRowLoc[1], stopRow);
		}

		if (stopRow - startRow < BARCODE_MIN_HEIGHT){
			for (var i = 0; i < result.length; i++) {
				result[i] = null;
			}
		}

		return result;
	};

	/// <summary>
	/// Locate the vertices and the codewords area of a black blob using the Start and Stop patterns as locators.
	/// </summary>
	/// <param name="matrix">Matrix.</param>
	/// <param name="startRow">Start row.</param>
	/// <param name="startColumn">Start column.</param>
	/// <returns> an array containing the vertices:
	///           vertices[0] x, y top left barcode
	///           vertices[1] x, y bottom left barcode
	///           vertices[2] x, y top right barcode
	///           vertices[3] x, y bottom right barcode
	///           vertices[4] x, y top left codeword area
	///           vertices[5] x, y bottom left codeword area
	///           vertices[6] x, y top right codeword area
	///           vertices[7] x, y bottom right codeword area
	/// </returns>
	var findVertices = function(matrix, startRow, startColumn){
		var height = matrix.height,
			width = matrix.width;

		var result = [];

		copyToResult(result, findRowsWithPattern(matrix, height, width, startRow, startColumn, START_PATTERN), INDEXES_START_PATTERN);

		if (result[4] !== null) {
			startColumn = Math.floor(result[4].x);
			startRow = Math.floor(result[4].y);
		}

		copyToResult(result, findRowsWithPattern(matrix, height, width, startRow, startColumn, STOP_PATTERN), INDEXES_STOP_PATTERN);

		return result;
	};

	/// <summary>
	/// Detects PDF417 codes in an image. Only checks 0 degree rotation (so rotate the matrix and check again outside of this method)
	/// </summary>
	/// <param name="multiple">multiple if true, then the image is searched for multiple codes. If false, then at most one code will be found and returned.</param>
	/// <param name="bitMatrix">bit matrix to detect barcodes in.</param>
	/// <returns>List of ResultPoint arrays containing the coordinates of found barcodes</returns>
	var detect = function(multiple, bitMatrix){
		var barcodeCoordinates = [];

		var row = 0,
			column = 0,
			foundBarcodeInRow = false;

		while (row < bitMatrix.height) {
			var vertices = findVertices(bitMatrix, row, column);

			if (vertices[0] === null && vertices[3] === null){
				if (!foundBarcodeInRow) {
					// we didn't find any barcode so that's the end of searching
					break;
				}

				// we didn't find a barcode starting at the given column and row. Try again from the first column and slightly
				// below the lowest barcode we found so far.
				foundBarcodeInRow = false;
				column = 0;

				for(var i = 0; i < barcodeCoordinates.length; i++){
					var barcodeCoordinate = barcodeCoordinates[i];

					if (barcodeCoordinate[1] !== null) {
						row = Math.floor(Math.max(row, barcodeCoordinate[1].y));
					}

					if (barcodeCoordinate[3] !== null) {
						row = Math.floor(Math.max(row, barcodeCoordinate[3].y));
					}
				}

				row += ROW_STEP;

				continue;
			}

			foundBarcodeInRow = true;

			barcodeCoordinates.push(vertices);

			if (!multiple) {
				break;
			}

			// if we didn't find a right row indicator column, then continue the search for the next barcode after the
			// start pattern of the barcode just found.
			if (vertices[2] !== null) {
				column = Math.floor(vertices[2].x);
				row = Math.floor(vertices[2].y);
			}
			else {
				column = Math.floor(vertices[4].x);
				row = Math.floor(vertices[4].y);
			}
		}

		return barcodeCoordinates;
	};

	//endregion

	//region Public Members

	pdf417.detector = {
		/// <summary>
		/// <p>Detects a PDF417 Code in an image. Only checks 0 and 180 degree rotations.</p>
		/// </summary>
		/// <param name="image">Image.</param>
		/// <param name="hints">Hints.</param>
		/// <param name="multiple">If set to <c>true</c> multiple.</param>
		/// <returns><see cref="PDF417DetectorResult"/> encapsulating results of detecting a PDF417 code </returns>
		detect: function(multiple, bitMatrix) {
			var barcodeCoordinates = detect(multiple, bitMatrix);

			if (barcodeCoordinates.length === 0) {
				bitMatrix = bitMatrix.clone();

				bitMatrix.rotate180();

				barcodeCoordinates = detect(multiple, bitMatrix);
			}

			return {
				bits: bitMatrix,
				points: barcodeCoordinates
			};
		}
	};

	//endregion
})(window.zxing || (window.zxing = {}));
