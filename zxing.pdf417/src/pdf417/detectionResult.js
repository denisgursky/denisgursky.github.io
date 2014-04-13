(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	var ADJUST_ROW_NUMBER_SKIP = 2;

	//endregion

	pdf417.DetectionResult = function(metadata, box) {
		//region Private Fields

		//endregion

		//region Public Fields

		var metadata = this.metadata = metadata;
		this.box = box;
		var columnCount = this.columnCount = metadata.columnCount;
		this.rowCount = metadata.rowCount;
		this.errorCorrectionLevel = metadata.errorCorrectionLevel;
		var detectionResultColumns = this.detectionResultColumns = zxing.helpers.createArray(columnCount + 2, null);

		//endregion

		//region Private Functions


		/// <summary>
		/// Adjusts the indicator column row numbers.
		/// </summary>
		/// <param name="detectionResultColumn">Detection result column.</param>
		var adjustIndicatorColumnRowNumbers = function(detectionResultColumn) {
			if (!!detectionResultColumn) {
				detectionResultColumn.adjustCompleteIndicatorColumnRowNumbers(metadata);
			}
		};

		/// <summary>
		/// Adjusts the row numbers from both Row Indicators
		/// </summary>
		/// <returns> zero </returns>
		var adjustRowNumbersFromBothRI = function() {
			if (!detectionResultColumns[0] || !detectionResultColumns[columnCount + 1]){
				return;
			}

			var LRIcodewords = detectionResultColumns[0].codewords,
				RRIcodewords = detectionResultColumns[columnCount + 1].codewords;

			for (var codewordsRow = 0; codewordsRow < LRIcodewords.length; codewordsRow++) {
				if (!!LRIcodewords[codewordsRow] &&
					!!RRIcodewords[codewordsRow] &&
					LRIcodewords[codewordsRow].rowNumber === RRIcodewords[codewordsRow].rowNumber) {

					for (var barcodeColumn = 1; barcodeColumn <= columnCount; barcodeColumn++) {
						var codeword = detectionResultColumns[barcodeColumn].codewords[codewordsRow];

						if (!codeword) {
							continue;
						}

						codeword.rowNumber = LRIcodewords[codewordsRow].rowNumber;

						if (!codeword.hasValidRowNumber()) {
							// LOG.info("Removing codeword with invalid row number, cw[" + codewordsRow + "][" + barcodeColumn + "]");
							detectionResultColumns[barcodeColumn].codewords[codewordsRow] = null;
						}
					}
				}
			}
		};

		/// <summary>
		/// Adjusts the row numbers from Right Row Indicator.
		/// </summary>
		/// <returns>The unadjusted row count.</returns>
		var adjustRowNumbersFromRRI = function() {
			if (!detectionResultColumns[columnCount + 1]) {
				return 0;
			}

			var unadjustedCount = 0,
				codewords = detectionResultColumns[columnCount + 1].codewords;

			for (var codewordsRow = 0; codewordsRow < codewords.length; codewordsRow++) {
				if (!codewords[codewordsRow]) {
					continue;
				}

				var rowIndicatorRowNumber = codewords[codewordsRow].rowNumber,
					invalidRowCounts = 0;

				for (var barcodeColumn = columnCount + 1; barcodeColumn > 0 && invalidRowCounts < ADJUST_ROW_NUMBER_SKIP; barcodeColumn--) {
					var codeword = detectionResultColumns[barcodeColumn].codewords[codewordsRow];

					if (codeword != null) {
						invalidRowCounts = adjustRowNumberIfValid(rowIndicatorRowNumber, invalidRowCounts, codeword);

						if (!codeword.hasValidRowNumber()) {
							unadjustedCount++;
						}
					}
				}
			}
			return unadjustedCount;
		};

		/// <summary>
		/// Adjusts the row numbers from Left Row Indicator.
		/// </summary>
		/// <returns> Unadjusted row Count.</returns>
		var adjustRowNumbersFromLRI = function() {
			if (!detectionResultColumns[0]) {
				return 0;
			}

			var unadjustedCount = 0,
				codewords = detectionResultColumns[0].codewords;

			for (var codewordsRow = 0; codewordsRow < codewords.length; codewordsRow++) {
				if (!codewords[codewordsRow]) {
					continue;
				}

				var rowIndicatorRowNumber = codewords[codewordsRow].rowNumber,
					invalidRowCounts = 0;

				for (var barcodeColumn = 1; barcodeColumn < columnCount + 1 && invalidRowCounts < ADJUST_ROW_NUMBER_SKIP; barcodeColumn++) {
					var codeword = detectionResultColumns[barcodeColumn].codewords[codewordsRow];

					if (!!codeword) {
						invalidRowCounts = adjustRowNumberIfValid(rowIndicatorRowNumber, invalidRowCounts, codeword);
						if (!codeword.hasValidRowNumber()) {
							unadjustedCount++;
						}
					}
				}
			}
			return unadjustedCount;
		};

		/// <summary>
		/// Adjusts the row number if valid.
		/// </summary>
		/// <returns>The invalid rows</returns>
		/// <param name="rowIndicatorRowNumber">Row indicator row number.</param>
		/// <param name="invalidRowCounts">Invalid row counts.</param>
		/// <param name="codeword">Codeword.</param>
		var adjustRowNumberIfValid = function(rowIndicatorRowNumber, invalidRowCounts, codeword) {
			if (!codeword) {
				return invalidRowCounts;
			}

			if (!codeword.hasValidRowNumber()) {
				if (codeword.isValidRowNumber(rowIndicatorRowNumber)) {
					codeword.RowNumber = rowIndicatorRowNumber;
					invalidRowCounts = 0;
				} else {
					++invalidRowCounts;
				}
			}

			return invalidRowCounts;
		};

		/// <summary>
		/// Adjusts the row numbers by row.
		/// </summary>
		/// <returns>The row numbers by row.</returns>
		var adjustRowNumbersByRow = function(){
			adjustRowNumbersFromBothRI(); // RI = RowIndicators
			// TODO we should only do full row adjustments if row numbers of left and right row indicator column match.
			// Maybe it's even better to calculated the height (in codeword rows) and divide it by the number of barcode
			// rows. This, together with the LRI and RRI row numbers should allow us to get a good estimate where a row
			// number starts and ends.
			var unadjustedCount = adjustRowNumbersFromLRI();

			return unadjustedCount + adjustRowNumbersFromRRI();
		};

		/// <summary>
		/// return number of codewords which don't have a valid row number. Note that the count is not accurate as codewords .
		/// will be counted several times. It just serves as an indicator to see when we can stop adjusting row numbers
		/// </summary>
		/// <returns>The row numbers.</returns>
		var adjustRowNumbers = function() {
			// TODO ensure that no detected codewords with unknown row number are left
			// we should be able to estimate the row height and use it as a hint for the row number
			// we should also fill the rows top to bottom and bottom to top
			var unadjustedCount = adjustRowNumbersByRow();

			if (unadjustedCount === 0) {
				return 0;
			}

			for (var barcodeColumn = 1; barcodeColumn < columnCount + 1; barcodeColumn++) {
				var codewords = detectionResultColumns[barcodeColumn].codewords;

				for (var codewordsRow = 0; codewordsRow < codewords.length; codewordsRow++) {
					if (!codewords[codewordsRow]) {
						continue;
					}

					if (!codewords[codewordsRow].hasValidRowNumber()) {
						_adjustRowNumbers(barcodeColumn, codewordsRow, codewords);
					}
				}
			}
			return unadjustedCount;
		};

		/// <summary>
		/// Adjusts the row numbers.
		/// </summary>
		/// <param name="barcodeColumn">Barcode column.</param>
		/// <param name="codewordsRow">Codewords row.</param>
		/// <param name="codewords">Codewords.</param>
		var _adjustRowNumbers = function(barcodeColumn, codewordsRow, codewords) {
			var codeword = codewords[codewordsRow],
				previousColumnCodewords = detectionResultColumns[barcodeColumn - 1].codewords,
				nextColumnCodewords = previousColumnCodewords;

			if (!!detectionResultColumns[barcodeColumn + 1]) {
				nextColumnCodewords = detectionResultColumns[barcodeColumn + 1].codewords;
			}

			var otherCodewords = [];

			otherCodewords[2] = previousColumnCodewords[codewordsRow];
			otherCodewords[3] = nextColumnCodewords[codewordsRow];

			if (codewordsRow > 0) {
				otherCodewords[0] = codewords[codewordsRow - 1];
				otherCodewords[4] = previousColumnCodewords[codewordsRow - 1];
				otherCodewords[5] = nextColumnCodewords[codewordsRow - 1];
			}

			if (codewordsRow > 1) {
				otherCodewords[8] = codewords[codewordsRow - 2];
				otherCodewords[10] = previousColumnCodewords[codewordsRow - 2];
				otherCodewords[11] = nextColumnCodewords[codewordsRow - 2];
			}

			if (codewordsRow < codewords.length - 1) {
				otherCodewords[1] = codewords[codewordsRow + 1];
				otherCodewords[6] = previousColumnCodewords[codewordsRow + 1];
				otherCodewords[7] = nextColumnCodewords[codewordsRow + 1];
			}

			if (codewordsRow < codewords.length - 2) {
				otherCodewords[9] = codewords[codewordsRow + 2];
				otherCodewords[12] = previousColumnCodewords[codewordsRow + 2];
				otherCodewords[13] = nextColumnCodewords[codewordsRow + 2];
			}

			for (var i = 0; i < otherCodewords.length; i++) {
				if (adjustRowNumber(codeword, otherCodewords[i])) {
					return;
				}
			}
		};

		/// <summary>
		/// Adjusts the row number.
		/// </summary>
		/// <returns><c>true</c>, if row number was adjusted, <c>false</c> otherwise.</returns>
		/// <param name="codeword">Codeword.</param>
		/// <param name="otherCodeword">Other codeword.</param>
		var adjustRowNumber = function(codeword, otherCodeword) {
			if (!otherCodeword) {
				return false;
			}

			if (otherCodeword.hasValidRowNumber() && otherCodeword.bucket === codeword.bucket) {
				codeword.rowNumber = otherCodeword.rowNumber;

				return true;
			}

			return false;
		};

		/// <summary>
		/// Returns the DetectionResult Columns.  This does a fair bit of calculation, so call it sparingly.
		/// </summary>
		/// <returns>The detection result columns.</returns>
		var getDetectionResultColumns = function(){

			adjustIndicatorColumnRowNumbers(detectionResultColumns[0]);
			adjustIndicatorColumnRowNumbers(detectionResultColumns[columnCount + 1]);

			var unadjustedCodewordCount = pdf417.common.MAX_CODEWORDS_IN_BARCODE,
				previousUnadjustedCount;
			do {
				previousUnadjustedCount = unadjustedCodewordCount;
				unadjustedCodewordCount = adjustRowNumbers();
			} while (unadjustedCodewordCount > 0 && unadjustedCodewordCount < previousUnadjustedCount);

			return detectionResultColumns;
		};

		//endregion

		//region Public Methods

		this.getDetectionResultColumns = getDetectionResultColumns;

		//endregion
	};

})(window.zxing || (window.zxing = {}));
