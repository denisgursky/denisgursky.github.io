(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;


	/// <summary>
	/// Initializes a new instance of the <see cref="ZXing.PDF417.Internal.DetectionResultRowIndicatorColumn"/> class.
	/// </summary>
	/// <param name="box">Box.</param>
	/// <param name="isLeft">If set to <c>true</c> is left.</param>
	pdf417.DetectionResultRowIndicatorColumn = function(box, isLeft){
		pdf417.DetectionResultRowIndicatorColumn.superclass.constructor.apply(this, arguments);

		//region Private Fields

		//endregion

		//region Public Fields

		var box = this.box;
		var codewords = this.codewords;
		var isLeft = this.isLeft = isLeft

		this.startX = null; //is not implemented
		this.endX = null; //is not implemented

		var self = this;

		//endregion

		//region Private Function

		/// <summary>
		/// Prune the codewords which do not match the metadata
		/// TODO Maybe we should keep the incorrect codewords for the start and end positions?
		/// </summary>
		/// <param name="codewords">Codewords.</param>
		/// <param name="metadata">Metadata.</param>
		var removeIncorrectCodewords = function(codewords, metadata){
			for (var row = 0; row < codewords.length; row++) {
				var codeword = codewords[row];

				if (codeword == null){
					continue;
				}

				var indicatorValue = codeword.value % 30,
					rowNumber = codeword.rowNumber;

				// Row does not exist in the metadata
				if (rowNumber >= metadata.rowCount) { // different to java rowNumber > metadata.RowCount
					codewords[row] = null; // remove this.
					continue;
				}

				if (!isLeft) {
					rowNumber += 2;
				}

				switch (rowNumber % 3) {
					default:
					case 0:
						if (indicatorValue*3 + 1 !== metadata.rowCountUpper) {
							codewords[row] = null;
						}

						break;

					case 1:
						if (indicatorValue%3 !== metadata.rowCountLower ||
							Math.floor(indicatorValue / 3) !== metadata.errorCorrectionLevel) {
							codewords[row] = null;
						}

						break;

					case 2:
						if (indicatorValue + 1 !== metadata.columnCount) {
							codewords[row] = null;
						}

						break;
				}
			}
		};

		/// <summary>
		/// Gets the barcode metadata.
		/// </summary>
		/// <returns>The barcode metadata.</returns>
		var getBarcodeMetadata = function() {
			var barcodeColumnCount = new pdf417.BarcodeValue(),
				barcodeRowCountUpperPart = new pdf417.BarcodeValue(),
				barcodeRowCountLowerPart = new pdf417.BarcodeValue(),
				barcodeECLevel = new pdf417.BarcodeValue();

			for(var i = 0; i < codewords.length; i++) {
				var codeword = codewords[i];

				if (codeword == null) {
					continue;
				}

				codeword.setRowNumberAsRowIndicatorColumn();

				var rowIndicatorValue = codeword.value % 30,
					codewordRowNumber = codeword.rowNumber;

				if (!isLeft){
					codewordRowNumber += 2;
				}

				switch (codewordRowNumber % 3) {
					case 0:
						barcodeRowCountUpperPart.setValue(rowIndicatorValue * 3 + 1);
						break;
					case 1:
						barcodeECLevel.setValue(Math.floor(rowIndicatorValue / 3));
						barcodeRowCountLowerPart.setValue(Math.floor(rowIndicatorValue % 3));
						break;
					case 2:
						barcodeColumnCount.setValue(rowIndicatorValue + 1);
						break;
				}
			}

			// Maybe we should check if we have ambiguous values?
			var barcodeColumnCountValues = barcodeColumnCount.getValue(),
				barcodeRowCountUpperPartValues = barcodeRowCountUpperPart.getValue(),
				barcodeRowCountLowerPartValues = barcodeRowCountLowerPart.getValue(),
				barcodeECLevelValues = barcodeECLevel.getValue();

			if ((barcodeColumnCountValues.length === 0) ||
				(barcodeRowCountUpperPartValues.length === 0) ||
				(barcodeRowCountLowerPartValues.length === 0) ||
				(barcodeECLevelValues.length === 0) ||
				barcodeColumnCountValues[0] < 1 ||
				barcodeRowCountUpperPartValues[0] + barcodeRowCountLowerPartValues[0] < pdf417.common.MIN_ROWS_IN_BARCODE ||
				barcodeRowCountUpperPartValues[0] + barcodeRowCountLowerPartValues[0] > pdf417.common.MAX_ROWS_IN_BARCODE) {
				return null;
			}

			var barcodeMetadata = new pdf417.BarcodeMetadata(barcodeColumnCountValues[0],
				barcodeRowCountUpperPartValues[0],
				barcodeRowCountLowerPartValues[0],
				barcodeECLevelValues[0]);

			removeIncorrectCodewords(codewords, barcodeMetadata);

			return barcodeMetadata;
		};

		/// <summary>
		/// Adjusts the in omplete indicator column row numbers.
		/// </summary>
		/// <param name="metadata">Metadata.</param>
		var adjustIncompleteIndicatorColumnRowNumbers = function(metadata) {
			// TODO maybe we should add missing codewords to store the correct row number to make
			// finding row numbers for other columns easier
			// use row height count to make detection of invalid row numbers more reliable

			var top = isLeft ? box.topLeft : box.topRight,
				bottom = isLeft ? box.bottomLeft : box.bottomRight,
				firstRow = self.imageRowToCodewordIndex(Math.floor(top.y)),
				lastRow = self.imageRowToCodewordIndex(Math.floor(bottom.y));

			// We need to be careful using the average row height.
			// Barcode could be skewed so that we have smaller and taller rows
			var averageRowHeight = (lastRow - firstRow) / metadata.rowCount;

			// initialize loop
			var barcodeRow = -1,
				maxRowHeight = 1,
				currentRowHeight = 0;

			for (var codewordRow = firstRow; codewordRow < lastRow; codewordRow++) {
				var codeword = codewords[codewordRow];

				if (codeword === null) {
					continue;
				}

				codeword.setRowNumberAsRowIndicatorColumn();

				var rowDifference = codeword.rowNumber - barcodeRow;

				// TODO improve handling with case where first row indicator doesn't start with 0
				if (rowDifference == 0) {
					currentRowHeight++;
				} else if (rowDifference == 1) {
					maxRowHeight = Math.max(maxRowHeight, currentRowHeight);
					currentRowHeight = 1;
					barcodeRow = codeword.rowNumber;
				} else if (codeword.rowNumber > metadata.rowCount) {
					codewords[codewordRow] = null;
				} else {
					barcodeRow = codeword.rowNumber;
					currentRowHeight = 1;
				}

			}

			return Math.floor(averageRowHeight + 0.5);
		};

		/// <summary>
		/// Sets the Row Numbers as Inidicator Columns
		/// </summary>
		var setRowNumbers = function() {
			for (var i = 0; i < codewords; i++) {
				if (codewords[i] !== null) {
					codewords[i].setRowNumberAsRowIndicatorColumn();
				}
			}
		};

		/// <summary>
		/// TODO implement properly
		/// TODO maybe we should add missing codewords to store the correct row number to make
		/// finding row numbers for other columns easier
		/// use row height count to make detection of invalid row numbers more reliable
		/// </summary>
		/// <returns>The indicator column row numbers.</returns>
		/// <param name="metadata">Metadata.</param>
		var adjustCompleteIndicatorColumnRowNumbers = function(metadata) {
			setRowNumbers(); // Assign this as an indicator column

			removeIncorrectCodewords(codewords, metadata);

			var top = isLeft ? box.topLeft : box.topRight,
				bottom = isLeft ? box.bottomLeft : box.bottomRight,
				firstRow = self.imageRowToCodewordIndex(Math.floor(top.y)),
				lastRow = self.imageRowToCodewordIndex(Math.floor(bottom.y));

			// We need to be careful using the average row height.
			// Barcode could be skewed so that we have smaller and taller rows
			var averageRowHeight = (lastRow - firstRow) / metadata.rowCount;

			// initialize loop
			var barcodeRow = -1,
				maxRowHeight = 1,
				currentRowHeight = 0;

			for (var codewordRow = firstRow; codewordRow < lastRow; codewordRow++) {
				var codeword = codewords[codewordRow];

				if (codeword == null){
					continue;
				}

				//      float expectedRowNumber = (codewordsRow - firstRow) / averageRowHeight;
				//      if (Math.abs(codeword.getRowNumber() - expectedRowNumber) > 2) {
				//        SimpleLog.log(LEVEL.WARNING,
				//            "Removing codeword, rowNumberSkew too high, codeword[" + codewordsRow + "]: Expected Row: " +
				//                expectedRowNumber + ", RealRow: " + codeword.getRowNumber() + ", value: " + codeword.getValue());
				//        codewords[codewordsRow] = null;
				//      }

				var rowDifference = codeword.rowNumber - barcodeRow;

				// TODO improve handling with case where first row indicator doesn't start with 0
				if (rowDifference == 0) {
					currentRowHeight++;
				} else if (rowDifference == 1) {
					maxRowHeight = Math.max(maxRowHeight, currentRowHeight);
					currentRowHeight = 1;
					barcodeRow = codeword.rowNumber;
				} else if (rowDifference < 0 ||
					codeword.rowNumber >= metadata.rowCount ||
					rowDifference > codewordRow) {
					codewords[codewordRow] = null;
				} else {
					var checkedRows;

					if (maxRowHeight > 2) {
						checkedRows = (maxRowHeight - 2) * rowDifference;
					} else {
						checkedRows = rowDifference;
					}

					var closePreviousCodewordFound = checkedRows > codewordRow;

					for (var i = 1; i <= checkedRows && !closePreviousCodewordFound; i++) {
						// there must be (height * rowDifference) number of codewords missing. For now we assume height = 1.
						// This should hopefully get rid of most problems already.
						closePreviousCodewordFound = codewords[codewordRow - i] != null;
					}

					if (closePreviousCodewordFound) {
						codewords[codewordRow] = null;
					} else {
						barcodeRow = codeword.rowNumber;
						currentRowHeight = 1;
					}
				}

			}

			return Math.floor(averageRowHeight + 0.5);
		};

		/// <summary>
		/// Gets the row heights.
		/// </summary>
		/// <returns>The row heights.</returns>
		var getRowHeights = function() {
			var barcodeMetadata = getBarcodeMetadata();

			if (barcodeMetadata == null) {
				return null;
			}

			adjustIncompleteIndicatorColumnRowNumbers(barcodeMetadata);

			var result = zxing.helpers.createArray(barcodeMetadata.rowCount, 0);

			for (var i = 0; i < codewords.length; i++) {
				var codeword = codewords[i];

				if (codeword !== null) {
					var rowNumber = codeword.rowNumber;

					if (rowNumber >= result.length) {
						return null;
					}

					result[rowNumber]++;
				} // else throw exception? (or return null)
			}

			return result;
		};

		//endregion

		//region Private Function

		this.getBarcodeMetadata = getBarcodeMetadata;

		this.getRowHeights = getRowHeights;

		this.adjustCompleteIndicatorColumnRowNumbers = adjustCompleteIndicatorColumnRowNumbers;

		//endregion
	};

	zxing.helpers.extend(pdf417.DetectionResultRowIndicatorColumn, pdf417.DetectionResultColumn);

})(window.zxing || (window.zxing = {}));
