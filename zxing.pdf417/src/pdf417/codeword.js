(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	/// <summary>
	/// Default value for the RowNumber (-1 being an invalid real number)
	/// </summary>
	var BARCODE_ROW_UNKNOWN = -1;

	//endregion

	pdf417.Codeword = function(startX, endX, bucket, value) {
		//region Private Fields

		var self = this;

		//endregion

		//region Public Fields

		this.startX = startX;
		this.endX = endX;
		var bucket = this.bucket = bucket;
		this.value = value;
		this.rowNumber = BARCODE_ROW_UNKNOWN;
		this.width = endX - startX;

		//endregion

		//region Private Functions

		/// <summary>
		/// Sets the row number as the row's indicator column.
		/// </summary>
		var setRowNumberAsRowIndicatorColumn = function() {
			self.rowNumber = Math.floor(self.value / 30 ) * 3 +  Math.floor(self.bucket / 3);
		};

		/// <summary>
		/// Gets a value indicating whether this instance has valid row number.
		/// </summary>
		/// <value><c>true</c> if this instance has valid row number; otherwise, <c>false</c>.</value>
		var hasValidRowNumber = function () {
			return isValidRowNumber(self.rowNumber);
		};

		/// <summary>
		/// Determines whether this instance is valid row number the specified rowNumber.
		/// </summary>
		/// <returns><c>true</c> if this instance is valid row number the specified rowNumber; otherwise, <c>false</c>.</returns>
		/// <param name="rowNumber">Row number.</param>
		var isValidRowNumber = function(rowNumber) {
			return rowNumber !== BARCODE_ROW_UNKNOWN && bucket === Math.floor((rowNumber % 3 ) * 3);
		};

		//endregion

		//region Public Functions

		this.setRowNumberAsRowIndicatorColumn = setRowNumberAsRowIndicatorColumn;
		this.hasValidRowNumber = hasValidRowNumber;
		this.isValidRowNumber = isValidRowNumber;

		//
	};

})(window.zxing || (window.zxing = {}));
