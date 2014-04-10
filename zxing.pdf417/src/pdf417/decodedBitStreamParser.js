(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	var Mode = {
		ALPHA: 1,
		LOWER: 2,
		MIXED: 3,
		PUNCT: 4,
		ALPHA_SHIFT: 5,
		PUNCT_SHIFT: 6
	};

	var TEXT_COMPACTION_MODE_LATCH = 900;
	var BYTE_COMPACTION_MODE_LATCH = 901;
	var NUMERIC_COMPACTION_MODE_LATCH = 902;
	var BYTE_COMPACTION_MODE_LATCH_6 = 924;
	var BEGIN_MACRO_PDF417_CONTROL_BLOCK = 928;
	var BEGIN_MACRO_PDF417_OPTIONAL_FIELD = 923;
	var MACRO_PDF417_TERMINATOR = 922;
	var MODE_SHIFT_TO_BYTE_COMPACTION_MODE = 913;
	var MAX_NUMERIC_CODEWORDS = 15;

	var PL = 25;
	var LL = 27;
	var AS = 27;
	var ML = 28;
	var AL = 28;
	var PS = 29;
	var PAL = 29;

	var PUNCT_CHARS = [
		';', '<', '>', '@', '[', '\\', '}', '_', '`', '~', '!',
		'\r', '\t', ',', ':', '\n', '-', '.', '$', '/', '"', '|', '*',
		'(', ')', '?', '{', '}', '\''
	];

	var MIXED_CHARS = [
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '&',
		'\r', '\t', ',', ':', '#', '-', '.', '$', '/', '+', '%', '*',
		'=', '^'
	];

	var NUMBER_OF_SEQUENCE_CODEWORDS = 2;

	//endregion

	pdf417.DecodedBitStreamParser = function() {
		throw new Error('Method is not implemented');
		//region Private Fields

		//endregion

		//region Public Fields


		//endregion

		//region Private Function

		//endregion
	};


	/// <summary>
	/// The Text Compaction mode includes all the printable ASCII characters
	/// (i.e. values from 32 to 126) and three ASCII control characters: HT or tab
	/// (ASCII value 9), LF or line feed (ASCII value 10), and CR or carriage
	/// return (ASCII value 13). The Text Compaction mode also includes various latch
	/// and shift characters which are used exclusively within the mode. The Text
	/// Compaction mode encodes up to 2 characters per codeword. The compaction rules
	/// for converting data into PDF417 codewords are defined in 5.4.2.2. The sub-mode
	/// switches are defined in 5.4.2.3.
	///
	/// <param name="textCompactionData">The text compaction data.</param>
	/// <param name="byteCompactionData">The byte compaction data if there</param>
	///                           was a mode shift.
	/// <param name="length">The size of the text compaction and byte compaction data.</param>
	/// <param name="result">The decoded data is appended to the result.</param>
	/// </summary>
	var decodeTextCompaction = function(textCompactionData, byteCompactionData, length, result) {
		// Beginning from an initial state of the Alpha sub-mode
		// The default compaction mode for PDF417 in effect at the start of each symbol shall always be Text
		// Compaction mode Alpha sub-mode (uppercase alphabetic). A latch codeword from another mode to the Text
		// Compaction mode shall always switch to the Text Compaction Alpha sub-mode.

		var subMode = Mode.ALPHA,
			priorToShiftMode = Mode.ALPHA,
			i = 0;

		while (i < length) {
			var subModeCh = textCompactionData[i],
				ch = null;

			switch (subMode) {
				case Mode.ALPHA:
					// Alpha (uppercase alphabetic)
					if (subModeCh < 26) {
						// Upper case Alpha Character
						debugger; //check_it
						ch = 'A' + subModeCh;
					} else {
						if (subModeCh === 26) {
							ch = ' ';
						} else if (subModeCh === LL) {
							subMode = Mode.LOWER;
						} else if (subModeCh === ML) {
							subMode = Mode.MIXED;
						} else if (subModeCh === PS) {
							// Shift to punctuation
							priorToShiftMode = subMode;
							subMode = Mode.PUNCT_SHIFT;
						} else if (subModeCh === MODE_SHIFT_TO_BYTE_COMPACTION_MODE) {
							result += byteCompactionData[i];
						} else if (subModeCh === TEXT_COMPACTION_MODE_LATCH) {
							subMode = Mode.ALPHA;
						}
					}
					break;

				case Mode.LOWER:
					// Lower (lowercase alphabetic)
					if (subModeCh < 26) {
						debugger; //check_it
						ch = 'a' + subModeCh;
					} else {
						if (subModeCh === 26) {
							ch = ' ';
						} else if (subModeCh === AS) {
							// Shift to alpha
							priorToShiftMode = subMode;
							subMode = Mode.ALPHA_SHIFT;
						} else if (subModeCh === ML) {
							subMode = Mode.MIXED;
						} else if (subModeCh === PS) {
							// Shift to punctuation
							priorToShiftMode = subMode;
							subMode = Mode.PUNCT_SHIFT;
						} else if (subModeCh === MODE_SHIFT_TO_BYTE_COMPACTION_MODE) {
							result += byteCompactionData[i];
						} else if (subModeCh === TEXT_COMPACTION_MODE_LATCH) {
							subMode = Mode.ALPHA;
						}
					}
					break;

				case Mode.MIXED:
					// Mixed (numeric and some punctuation)
					if (subModeCh < PL) {
						ch = MIXED_CHARS[subModeCh];
					} else {
						if (subModeCh === PL) {
							subMode = Mode.PUNCT;
						} else if (subModeCh === 26) {
							ch = ' ';
						} else if (subModeCh === LL) {
							subMode = Mode.LOWER;
						} else if (subModeCh === AL) {
							subMode = Mode.ALPHA;
						} else if (subModeCh === PS) {
							// Shift to punctuation
							priorToShiftMode = subMode;
							subMode = Mode.PUNCT_SHIFT;
						} else if (subModeCh === MODE_SHIFT_TO_BYTE_COMPACTION_MODE) {
							result += byteCompactionData[i];
						} else if (subModeCh === TEXT_COMPACTION_MODE_LATCH) {
							subMode = Mode.ALPHA;
						}
					}
					break;

				case Mode.PUNCT:
					// Punctuation
					if (subModeCh < PAL) {
						ch = PUNCT_CHARS[subModeCh];
					} else {
						if (subModeCh === PAL) {
							subMode = Mode.ALPHA;
						} else if (subModeCh === MODE_SHIFT_TO_BYTE_COMPACTION_MODE) {
							result += byteCompactionData[i];
						} else if (subModeCh === TEXT_COMPACTION_MODE_LATCH) {
							subMode = Mode.ALPHA;
						}
					}
					break;

				case Mode.ALPHA_SHIFT:
					// Restore sub-mode
					subMode = priorToShiftMode;
					if (subModeCh < 26) {
						debugger; //check_it
						ch = ('A' + subModeCh);
					} else {
						if (subModeCh === 26) {
							ch = ' ';
						} else if (subModeCh === TEXT_COMPACTION_MODE_LATCH) {
							subMode = Mode.ALPHA;
						}
					}
					break;

				case Mode.PUNCT_SHIFT:
					// Restore sub-mode
					subMode = priorToShiftMode;
					if (subModeCh < PAL) {
						ch = PUNCT_CHARS[subModeCh];
					} else {
						if (subModeCh === PAL) {
							subMode = Mode.ALPHA;
						} else if (subModeCh === MODE_SHIFT_TO_BYTE_COMPACTION_MODE) {
							// PS before Shift-to-Byte is used as a padding character,
							// see 5.4.2.4 of the specification
							result += byteCompactionData[i];
						} else if (subModeCh === TEXT_COMPACTION_MODE_LATCH) {
							subMode = Mode.ALPHA;
						}
					}
					break;
			}

			if (ch !== null) {
				// Append decoded character to result
				result += zxing.helpers.toChar(ch);
			}

			i++;
		}

		return result;
	};


	/// <summary>
	/// Text Compaction mode (see 5.4.1.5) permits all printable ASCII characters to be
	/// encoded, i.e. values 32 - 126 inclusive in accordance with ISO/IEC 646 (IRV), as
	/// well as selected control characters.
	///
	/// <param name="codewords">The array of codewords (data + error)</param>
	/// <param name="codeIndex">The current index into the codeword array.</param>
	/// <param name="result">The decoded data is appended to the result.</param>
	/// <returns>The next index into the codeword array.</returns>
	/// </summary>
	var textCompaction = function(codewords, codeIndex, result) {
		// 2 character per codeword
		var textCompactionData = zxing.helpers.createArray((codewords[0] - codeIndex) << 1, 0);
		// Used to hold the byte compaction value if there is a mode shift
		var byteCompactionData = zxing.helpers.createArray((codewords[0] - codeIndex) << 1, 0);

		var index = 0,
			end = false;

		while ((codeIndex < codewords[0]) && !end) {
			var code = codewords[codeIndex++];

			if (code < TEXT_COMPACTION_MODE_LATCH) {
				textCompactionData[index] = Math.floor(code / 30);
				textCompactionData[index + 1] = code % 30;
				index += 2;
			} else {
				switch (code) {
					case TEXT_COMPACTION_MODE_LATCH:
						// reinitialize text compaction mode to alpha sub mode
						textCompactionData[index++] = TEXT_COMPACTION_MODE_LATCH;
						break;
					case BYTE_COMPACTION_MODE_LATCH:
					case BYTE_COMPACTION_MODE_LATCH_6:
					case NUMERIC_COMPACTION_MODE_LATCH:
					case BEGIN_MACRO_PDF417_CONTROL_BLOCK:
					case BEGIN_MACRO_PDF417_OPTIONAL_FIELD:
					case MACRO_PDF417_TERMINATOR:
						codeIndex--;
						end = true;
						break;
					case MODE_SHIFT_TO_BYTE_COMPACTION_MODE:
						// The Mode Shift codeword 913 shall cause a temporary
						// switch from Text Compaction mode to Byte Compaction mode.
						// This switch shall be in effect for only the next codeword,
						// after which the mode shall revert to the prevailing sub-mode
						// of the Text Compaction mode. Codeword 913 is only available
						// in Text Compaction mode; its use is described in 5.4.2.4.
						textCompactionData[index] = MODE_SHIFT_TO_BYTE_COMPACTION_MODE;
						code = codewords[codeIndex++];
						byteCompactionData[index] = code;
						index++;
						break;
				}
			}
		}

		result = decodeTextCompaction(textCompactionData, byteCompactionData, index, result);

		return {
			codeIndex: codeIndex,
			result: result
		};
	};

	/// <summary>
	/// Byte Compaction mode (see 5.4.3) permits all 256 possible 8-bit byte values to be encoded.
	/// This includes all ASCII characters value 0 to 127 inclusive and provides for international
	/// character set support.
	///
	/// <param name="mode">The byte compaction mode i.e. 901 or 924</param>
	/// <param name="codewords">The array of codewords (data + error)</param>
	/// <param name="codeIndex">The current index into the codeword array.</param>
	/// <param name="result">The decoded data is appended to the result.</param>
	/// <returns>The next index into the codeword array.</returns>
	/// </summary>
	var byteCompaction = function(mode, codewords, codeIndex, result) {
		if (mode === BYTE_COMPACTION_MODE_LATCH) {
			// Total number of Byte Compaction characters to be encoded
			// is not a multiple of 6
			var count = 0,
				value = 0,
				decodedData = zxing.helpers.createArray(6, 0),
				byteCompactedCodewords = zxing.helpers.createArray(6, 0),
				end = false,
				nextCode = codewords[codeIndex++];

			while ((codeIndex < codewords[0]) && !end) {
				byteCompactedCodewords[count++] = nextCode;
				// Base 900
				value = 900 * value + nextCode;
				nextCode = codewords[codeIndex++];
				// perhaps it should be ok to check only nextCode >= TEXT_COMPACTION_MODE_LATCH
				if (nextCode === TEXT_COMPACTION_MODE_LATCH ||
					nextCode === BYTE_COMPACTION_MODE_LATCH ||
					nextCode === NUMERIC_COMPACTION_MODE_LATCH ||
					nextCode === BYTE_COMPACTION_MODE_LATCH_6 ||
					nextCode === BEGIN_MACRO_PDF417_CONTROL_BLOCK ||
					nextCode === BEGIN_MACRO_PDF417_OPTIONAL_FIELD ||
					nextCode === MACRO_PDF417_TERMINATOR) {
					codeIndex--;
					end = true;
				} else {
					if ((count % 5 === 0) && (count > 0)) {
						// Decode every 5 codewords
						// Convert to Base 256
						for (var j = 0; j < 6; ++j) {
							decodedData[5 - j] = value % 256;
							value = zxing.helpers.rshift(value, 8);
						}

						result += zxing.helpers.charArrayToString(decodedData);
						count = 0;
					}
				}
			}

			// if the end of all codewords is reached the last codeword needs to be added
			if (codeIndex === codewords[0] && nextCode < TEXT_COMPACTION_MODE_LATCH){
				byteCompactedCodewords[count++] = nextCode;
			}

			// If Byte Compaction mode is invoked with codeword 901,
			// the last group of codewords is interpreted directly
			// as one byte per codeword, without compaction.
			for (var i = 0; i < count; i++) {
				result += zxing.helpers.toChar(byteCompactedCodewords[i]);
			}
		} else if (mode === BYTE_COMPACTION_MODE_LATCH_6) {
			// Total number of Byte Compaction characters to be encoded
			// is an integer multiple of 6
			var count = 0,
				value = 0,
				end = false;

			while (codeIndex < codewords[0] && !end)
			{
				var code = codewords[codeIndex++];

				if (code < TEXT_COMPACTION_MODE_LATCH) {
					count++;
					// Base 900
					value = 900 * value + code;
				} else {
					if (code === TEXT_COMPACTION_MODE_LATCH ||
						code === BYTE_COMPACTION_MODE_LATCH ||
						code === NUMERIC_COMPACTION_MODE_LATCH ||
						code === BYTE_COMPACTION_MODE_LATCH_6 ||
						code === BEGIN_MACRO_PDF417_CONTROL_BLOCK ||
						code === BEGIN_MACRO_PDF417_OPTIONAL_FIELD ||
						code === MACRO_PDF417_TERMINATOR) {
						codeIndex--;
						end = true;
					}
				}

				if ((count % 5 === 0) && (count > 0)) {
					// Decode every 5 codewords
					// Convert to Base 256
					var decodedData = zxing.helpers.createArray(6, 0);

					for (var j = 0; j < 6; ++j) {
						debugger; //check_it
						decodedData[5 - j] = value & 0xFF;
						value >>= 8;
					}

					debugger; //check_it
					result += decodedData;
					count = 0;
				}
			}
		}

		return {
			codeIndex: codeIndex,
			result: result
		};
	};


	/// <summary>
	/// Convert a list of Numeric Compacted codewords from Base 900 to Base 10.
	/// EXAMPLE
	/// Encode the fifteen digit numeric string 000213298174000
	/// Prefix the numeric string with a 1 and set the initial value of
	/// t = 1 000 213 298 174 000
	/// Calculate codeword 0
	/// d0 = 1 000 213 298 174 000 mod 900 = 200
	///
	/// t = 1 000 213 298 174 000 div 900 = 1 111 348 109 082
	/// Calculate codeword 1
	/// d1 = 1 111 348 109 082 mod 900 = 282
	///
	/// t = 1 111 348 109 082 div 900 = 1 234 831 232
	/// Calculate codeword 2
	/// d2 = 1 234 831 232 mod 900 = 632
	///
	/// t = 1 234 831 232 div 900 = 1 372 034
	/// Calculate codeword 3
	/// d3 = 1 372 034 mod 900 = 434
	///
	/// t = 1 372 034 div 900 = 1 524
	/// Calculate codeword 4
	/// d4 = 1 524 mod 900 = 624
	///
	/// t = 1 524 div 900 = 1
	/// Calculate codeword 5
	/// d5 = 1 mod 900 = 1
	/// t = 1 div 900 = 0
	/// Codeword sequence is: 1, 624, 434, 632, 282, 200
	///
	/// Decode the above codewords involves
	///   1 x 900 power of 5 + 624 x 900 power of 4 + 434 x 900 power of 3 +
	/// 632 x 900 power of 2 + 282 x 900 power of 1 + 200 x 900 power of 0 = 1000213298174000
	///
	/// Remove leading 1 =>  Result is 000213298174000
	/// <param name="codewords">The array of codewords</param>
	/// <param name="count">The number of codewords</param>
	/// <returns>The decoded string representing the Numeric data.</returns>
	/// </summary>
	var decodeBase900toBase10 = function(codewords, count) {
//		var result = 0;
//
//		for (var i = 0; i < count; i++) {
//			result = BigInteger.Add(result, BigInteger.Multiply(EXP900[count - i - 1], new BigInteger(codewords[i])));
//		}
//
//		var resultString = result.toString();
//
//		if (resultString[0] !== '1') {
//			return null;
//		}
//
//		return resultString.Substring(1);

		debugger;
		//try to use https://github.com/peterolson/BigInteger.js
		//TODO: method is not implemented

		return '';
	};

	/// <summary>
	/// Numeric Compaction mode (see 5.4.4) permits efficient encoding of numeric data strings.
	///
	/// <param name="codewords">The array of codewords (data + error)</param>
	/// <param name="codeIndex">The current index into the codeword array.</param>
	/// <param name="result">The decoded data is appended to the result.</param>
	/// <returns>The next index into the codeword array.</returns>
	/// </summary>
	var numericCompaction = function(codewords, codeIndex, result) {
		var count = 0,
			end = false;

		var numericCodewords = zxing.helpers.createArray(MAX_NUMERIC_CODEWORDS, 0);

		while (codeIndex < codewords[0] && !end) {
			var code = codewords[codeIndex++];

			if (codeIndex === codewords[0]) {
				end = true;
			}

			if (code < TEXT_COMPACTION_MODE_LATCH) {
				numericCodewords[count] = code;
				count++;
			} else {
				if (code === TEXT_COMPACTION_MODE_LATCH ||
					code === BYTE_COMPACTION_MODE_LATCH ||
					code === BYTE_COMPACTION_MODE_LATCH_6 ||
					code === BEGIN_MACRO_PDF417_CONTROL_BLOCK ||
					code === BEGIN_MACRO_PDF417_OPTIONAL_FIELD ||
					code === MACRO_PDF417_TERMINATOR) {
					codeIndex--;
					end = true;
				}
			}

			if (count % MAX_NUMERIC_CODEWORDS === 0 ||
				code === NUMERIC_COMPACTION_MODE_LATCH ||
				end) {
				// Re-invoking Numeric Compaction mode (by using codeword 902
				// while in Numeric Compaction mode) serves  to terminate the
				// current Numeric Compaction mode grouping as described in 5.4.4.2,
				// and then to start a new one grouping.
				var s = decodeBase900toBase10(numericCodewords, count);

				if (s === null){
					return -1;
				}

				debugger; //check_it
				result += s;
				count = 0;
			}
		}

		return {
			codeIndex: codeIndex,
			result: result
		};
	};

	var decodeMacroBlock = function(codewords, codeIndex, resultMetadata) {
		if (codeIndex + NUMBER_OF_SEQUENCE_CODEWORDS > codewords[0]) {
			// we must have at least two bytes left for the segment index
			return -1;
		}

		var segmentIndexArray = zxing.helpers.createArray(NUMBER_OF_SEQUENCE_CODEWORDS, 0);

		for (var i = 0; i < NUMBER_OF_SEQUENCE_CODEWORDS; i++, codeIndex++) {
			segmentIndexArray[i] = codewords[codeIndex];
		}

		var s = decodeBase900toBase10(segmentIndexArray, NUMBER_OF_SEQUENCE_CODEWORDS);

		if (s === null){
			return -1;
		}

		resultMetadata.SegmentIndex = parseInt(s, 10);

		var fileId = '';

		codeIndex = textCompaction(codewords, codeIndex, fileId);

		resultMetadata.fileId = fileId.toString();

		if (codewords[codeIndex] === BEGIN_MACRO_PDF417_OPTIONAL_FIELD) {
			codeIndex++;

			var additionalOptionCodeWords = zxing.helpers.createArray(codewords[0] - codeIndex, 0),
				additionalOptionCodeWordsIndex = 0,
				end = false;

			while ((codeIndex < codewords[0]) && !end) {
				var code = codewords[codeIndex++];

				if (code < TEXT_COMPACTION_MODE_LATCH) {
					additionalOptionCodeWords[additionalOptionCodeWordsIndex++] = code;
				} else {
					switch (code) {
						case MACRO_PDF417_TERMINATOR:
							resultMetadata.isLastSegment = true;
							codeIndex++;
							end = true;
							break;
						default:
							return -1;
					}
				}
			}

			resultMetadata.optionalData = zxing.helpers.createArray(additionalOptionCodeWordsIndex, 0);
			zxing.helpers.copyArrayItems(additionalOptionCodeWords, 0, resultMetadata.optionalData, 0, additionalOptionCodeWordsIndex);
		} else if (codewords[codeIndex] === MACRO_PDF417_TERMINATOR) {
			resultMetadata.isLastSegment = true;
			codeIndex++;
		}

		return codeIndex;
	};

	pdf417.DecodedBitStreamParser.decode = function(codewords, ecLevel){
		var result = "";

		// Get compaction mode
		var codeIndex = 1,
			code = codewords[codeIndex++],
			compactionResult;

		var resultMetadata = {};

		while (codeIndex < codewords[0]) {
			switch (code) {
				case TEXT_COMPACTION_MODE_LATCH:
					compactionResult = textCompaction(codewords, codeIndex, result);
					codeIndex = compactionResult.codeIndex;
					result = compactionResult.result;
					break;
				case BYTE_COMPACTION_MODE_LATCH:
				case BYTE_COMPACTION_MODE_LATCH_6:
				case MODE_SHIFT_TO_BYTE_COMPACTION_MODE:
					compactionResult = byteCompaction(code, codewords, codeIndex, result);
					codeIndex = compactionResult.codeIndex;
					result = compactionResult.result;
					break;
				case NUMERIC_COMPACTION_MODE_LATCH:
					compactionResult = numericCompaction(codewords, codeIndex, result);
					codeIndex = compactionResult.codeIndex;
					result = compactionResult.result;
					break;
				case BEGIN_MACRO_PDF417_CONTROL_BLOCK:
					codeIndex = decodeMacroBlock(codewords, codeIndex, resultMetadata);
					break;
				case BEGIN_MACRO_PDF417_OPTIONAL_FIELD:
				case MACRO_PDF417_TERMINATOR:
					// Should not see these outside a macro block
					return null;
				default:
					// Default to text compaction. During testing numerous barcodes
					// appeared to be missing the starting mode. In these cases defaulting
					// to text compaction seems to work.
					codeIndex--;
					compactionResult = textCompaction(codewords, codeIndex, result);
					codeIndex = compactionResult.codeIndex;
					result = compactionResult.result;
					break;
			}

			if (codeIndex < 0){
				return null;
			}

			if (codeIndex < codewords.length) {
				code = codewords[codeIndex++];
			} else {
				return null;
			}
		}

		if (result.length === 0) {
			return null;
		}

		var decoderResult = new zxing.DecoderResult(null, result.toString(), null, ecLevel);
		decoderResult.other = resultMetadata;

		return decoderResult;
	};

})(window.zxing || (window.zxing = {}));
