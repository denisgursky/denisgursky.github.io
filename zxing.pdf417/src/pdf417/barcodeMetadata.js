(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	pdf417.BarcodeMetadata = function(columnCount, rowCountUpperPart, rowCountLowerPart, errorCorrectionLevel) {
		//region Private Fields

		//endregion

		//region Public Fields

		this.columnCount = columnCount;
		this.errorCorrectionLevel = errorCorrectionLevel;
		this.rowCountUpper = rowCountUpperPart;
		this.rowCountLower = rowCountLowerPart;
		this.rowCount = rowCountLowerPart + rowCountUpperPart;

		//endregion

		//region Private Function

		//endregion
	};

})(window.zxing || (window.zxing = {}));
