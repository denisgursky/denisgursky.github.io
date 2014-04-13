(function(zxing) {
	'use strict';



	/// <summary>
	///   <p>Represents a 2D matrix of bits. In function arguments below, and throughout the common
	/// module, x is the column position, and y is the row position. The ordering is always x, y.
	/// The origin is at the top-left.</p>
	///   <p>Internally the bits are represented in a 1-D array of 32-bit ints. However, each row begins
	/// with a new int. This is done intentionally so that we can copy out a row into a BitArray very
	/// efficiently.</p>
	///   <p>The ordering of bits is row-major. Within each int, the least significant bits are used first,
	/// meaning they represent lower x values. This is compatible with BitArray's implementation.</p>
	/// </summary>
	zxing.BitMatrix = function(luminanceSource) {
		//region Private Fields

		var width = luminanceSource.width,
			height = luminanceSource.height,
			rowSize = (luminanceSource.width + 31) >> 5,
			bits = zxing.helpers.createArray(rowSize * height, 0);


		//endregion

		//region Private Functions

		var getBit = function(x, y) {
			var offset = y * rowSize + (x >> 5);

			return ((((bits[offset]) >> (x & 0x1f))) & 1) !== 0;
		};

		var setBit = function(x, y, value) {
			if(value) {
				var offset = y * rowSize + (x >> 5);

				bits[offset] |= 1 << (x & 0x1f);
			}
		};

		var rotate180 = function() {
			//TODO:implement
			throw new Error('Method is not implemented');
		};

		var clone = function() {
			return zxing.BitMatrix(luminanceSource);
		};

		//endregion

		if(!zxing.hybridBinarizer(luminanceSource, setBit)){
			zxing.globalHistogramBinarizer(luminanceSource, setBit);
		}

		//region Public Members

		this.bits = bits;
		this.width = width;
		this.height = height;

		this.getBit = getBit;
		this.rotate180 = rotate180;
		this.clone = clone;

		//endregion
	};
})(window.zxing || (window.zxing = {}));
