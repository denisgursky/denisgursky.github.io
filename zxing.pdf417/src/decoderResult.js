(function(zxing) {
	'use strict';

	zxing.DecoderResult = function(rawBytes, text, byteSegments, ecLevel, saSequence, saParity) {
		saSequence = saSequence || -1;
		saParity = saParity || -1;

		//region Private Fields

		//endregion

		//region Public Fields

		this.errorsCorrected = null; //is not implemented
		this.erasures = null; //is not implemented

		if (!rawBytes && !text) {
			throw new Error('No result provided');
		}

		this.rawBytes = rawBytes;
		this.text = text;
		this.byteSegments = byteSegments;
		this.ecLevel = ecLevel;
		this.structuredAppendParity = saParity;
		this.structuredAppendSequenceNumber = saSequence;

		//endregion

		//region Private Function

		//endregion
	};

})(window.zxing || (window.zxing = {}));
