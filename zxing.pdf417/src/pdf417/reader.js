(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417,
		common = pdf417.common,
		decoder = pdf417.decoder,
		detector = pdf417.detector;

	//region Private Functions

	/// <summary>
	/// Gets the minimum width of the barcode
	/// </summary>
	/// <returns>The minimum width.</returns>
	/// <param name="p1">P1.</param>
	/// <param name="p2">P2.</param>
	var getMinWidth = function(point1, point2) {
		if(!point1 || !point2) {
			return Number.MAX_VALUE;
		}

		return Math.floor(Math.abs(point1.x - point2.x));
	};

	/// <summary>
	/// Gets the maximum width of the barcode
	/// </summary>
	/// <returns>The max width.</returns>
	/// <param name="p1">P1.</param>
	/// <param name="p2">P2.</param>
	var getMaxWidth = function(point1, point2) {
		if(!point1 || !point2) {
			return 0;
		}

		return Math.floor(Math.abs(point1.x - point2.x));
	};

	/// <summary>
	/// Gets the minimum width of the codeword.
	/// </summary>
	/// <returns>The minimum codeword width.</returns>
	/// <param name="p">P.</param>
	var getMinCodewordWidth = function(points) {
		return Math.floor(Math.min(
			Math.min(getMinWidth(points[0], points[4]), getMinWidth(points[6], points[2]) * common.MODULES_IN_CODEWORD /
				common.MODULES_IN_STOP_PATTERN),
			Math.min(getMinWidth(points[1], points[5]), getMinWidth(points[7], points[3]) * common.MODULES_IN_CODEWORD /
				common.MODULES_IN_STOP_PATTERN)));
	};

	/// <summary>
	/// Gets the maximum width of the codeword.
	/// </summary>
	/// <returns>The max codeword width.</returns>
	/// <param name="p">P.</param>
	var getMaxCodewordWidth = function(points) {
		return Math.floor(Math.max(
			Math.max(getMaxWidth(points[0], points[4]), getMaxWidth(points[6], points[2]) * common.MODULES_IN_CODEWORD /
				common.MODULES_IN_STOP_PATTERN),
			Math.max(getMaxWidth(points[1], points[5]), getMaxWidth(points[7], points[3]) * common.MODULES_IN_CODEWORD /
				common.MODULES_IN_STOP_PATTERN)));
	};

	/// <summary>
	/// Decode the specified image, with the hints and optionally multiple barcodes.
	/// Based on Owen's Comments in <see cref="ZXing.ReaderException"/>, this method has been modified to continue silently
	/// if a barcode was not decoded where it was detected instead of throwing a new exception object.
	/// </summary>
	/// <param name="image">Image.</param>
	/// <param name="hints">Hints.</param>
	/// <param name="multiple">If set to <c>true</c> multiple.</param>
	var decode = function(multiple, bitMatrix) {
		var results = [];
		var detectorResult = detector.detect(multiple, bitMatrix);

		for(var i = 0; i < detectorResult.points.length; i++) {
			var points = detectorResult.points[i];

			var decoderResult = decoder.decode(detectorResult.bits, points[4], points[5],
				points[6], points[7],
				getMinCodewordWidth(points), getMaxCodewordWidth(points));

			results.push(decoderResult);
		}

		return results;
	};

	//endregion


	//region Public Members

	pdf417.reader = {
		decode: decode
	};

	//endregion
})(window.zxing || (window.zxing = {}));
