(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	var RATIOS_TABLE = zxing.helpers.createArray(pdf417.common.SYMBOL_TABLE.length, function (){
		return [];
	});

	for (var s = 0; s < pdf417.common.SYMBOL_TABLE.length; s++) {
		RATIOS_TABLE[s] = zxing.helpers.createArray(pdf417.common.BARS_IN_MODULE, 0);
	}

	// Pre-computes the symbol ratio table.
	for (var i = 0; i < pdf417.common.SYMBOL_TABLE.length; i++) {
		var currentSymbol = pdf417.common.SYMBOL_TABLE[i],
			currentBit = currentSymbol & 0x1;

		for (var j = 0; j < pdf417.common.BARS_IN_MODULE; j++) {
			var size = 0.0;

			while ((currentSymbol & 0x1) == currentBit) {
				size += 1.0;
				currentSymbol >>= 1;
			}

			currentBit = currentSymbol & 0x1;

			RATIOS_TABLE[i][pdf417.common.BARS_IN_MODULE - j - 1] = size / pdf417.common.MODULES_IN_CODEWORD;
		}
	}

	//endregion

	pdf417.CodewordDecoder = function(metadata, box) {
		throw new Error('Method is not implemented');
		//region Private Fields

		//endregion

		//region Public Fields


		//endregion

		//region Private Function

		//endregion

		//region Public Function

		//endregion
	};

	//region Static Function

	/// <summary>
	/// Gets the bit value.
	/// </summary>
	/// <returns>The bit value.</returns>
	/// <param name="moduleBitCount">Module bit count.</param>
	var getBitValue = function(moduleBitCount) {
		var result = 0;
		for (var i = 0; i < Math.floor(moduleBitCount.length); i++) {
			for (var bit = 0; bit < moduleBitCount[i]; bit++) {
				result = (result << 1) | (i % 2 == 0 ? 1 : 0);
			}
		}

		return Math.floor(result);
	};

	/// <summary>
	/// Gets the decoded codeword value.
	/// </summary>
	/// <returns>The decoded codeword value.</returns>
	/// <param name="moduleBitCount">Module bit count.</param>
	var getDecodedCodewordValue = function(moduleBitCount) {
		var decodedValue = getBitValue(moduleBitCount);

		return pdf417.common.getCodeword(decodedValue) == pdf417.common.INVALID_CODEWORD
			? pdf417.common.INVALID_CODEWORD
			: decodedValue;
	};

	/// <summary>
	/// Samples the bit counts.
	/// </summary>
	/// <returns>The bit counts.</returns>
	/// <param name="moduleBitCount">Module bit count.</param>
	var sampleBitCounts = function(moduleBitCount) {
		var bitCountSum = pdf417.common.getBitCountSum(moduleBitCount),
			result = zxing.helpers.createArray(pdf417.common.BARS_IN_MODULE, 0),
			bitCountIndex = 0,
			sumPreviousBits = 0;

		for (var i = 0; i < pdf417.common.MODULES_IN_CODEWORD; i++) {
			var sampleIndex = bitCountSum / (2 * pdf417.common.MODULES_IN_CODEWORD) +
				(i * bitCountSum) / pdf417.common.MODULES_IN_CODEWORD;

			if (sumPreviousBits + moduleBitCount[bitCountIndex] <= sampleIndex) {
				sumPreviousBits += moduleBitCount[bitCountIndex];
				bitCountIndex++;
			}

			result[bitCountIndex]++;
		}

		return result;
	};

	/// <summary>
	/// Gets the closest decoded value.
	/// </summary>
	/// <returns>The closest decoded value.</returns>
	/// <param name="moduleBitCount">Module bit count.</param>
	var getClosestDecodedValue = function(moduleBitCount) {
		var bitCountSum = pdf417.common.getBitCountSum(moduleBitCount),
			bitCountRatios = zxing.helpers.createArray(pdf417.common.BARS_IN_MODULE, 0);

		for (var i = 0; i < bitCountRatios.length; i++) {
			bitCountRatios[i] = moduleBitCount[i] / bitCountSum;
		}

		var bestMatchError = Number.MAX_VALUE,
			bestMatch = pdf417.common.INVALID_CODEWORD;

		for (var j = 0; j < RATIOS_TABLE.length; j++) {
			var error = 0.0;
			var ratioTableRow = RATIOS_TABLE[j];

			for (var k = 0; k < pdf417.common.BARS_IN_MODULE; k++) {
				var diff = ratioTableRow[k] - bitCountRatios[k];

				error += diff*diff;

				if (error >= bestMatchError) {
					break;
				}
			}

			if (error < bestMatchError) {
				bestMatchError = error;
				bestMatch = pdf417.common.SYMBOL_TABLE[j];
			}
		}

		return bestMatch;
	};

	/// <summary>
	/// Gets the decoded value.
	/// </summary>
	/// <returns>The decoded value.</returns>
	/// <param name="moduleBitCount">Module bit count.</param>
	var getDecodedValue = function(moduleBitCount){
		var decodedValue = getDecodedCodewordValue(sampleBitCounts(moduleBitCount));

		if (decodedValue !== pdf417.common.INVALID_CODEWORD) {
			return decodedValue;
		}

		return getClosestDecodedValue(moduleBitCount);
	};

	//endregion

	pdf417.CodewordDecoder.getDecodedValue = getDecodedValue;

})(window.zxing || (window.zxing = {}));
