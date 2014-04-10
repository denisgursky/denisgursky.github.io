(function(zxing) {
	'use strict';

	//region Constants

	var LUMINANCE_BITS = 5;
	var LUMINANCE_SHIFT = 8 - LUMINANCE_BITS;
	var LUMINANCE_BUCKETS = 1 << LUMINANCE_BITS;

	//endregion

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
			bits = zxing.helpers.createArray(rowSize * height, 0),
			luminances = [],
			localLuminances = [],
			buckets = zxing.helpers.createArray(LUMINANCE_BUCKETS, 0);

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

		var initArrays = function(luminanceSize) {
			if(luminances.length < luminanceSize) {
				luminances = zxing.helpers.createArray(luminanceSize, 0);
			}

			for(var x = 0; x < LUMINANCE_BUCKETS; x++) {
				buckets[x] = 0;
			}
		};

		var rotate180 = function() {
			//TODO:implement
			throw new Error('Method is not implemented');
		};

		var clone = function() {
			return zxing.BitMatrix(luminanceSource);
		};

		var estimateBlackPoint = function(buckets) {
			// Find the tallest peak in the histogram.
			var numBuckets = buckets.length,
				maxBucketCount = 0,
				firstPeak = 0,
				firstPeakSize = 0;

			for(var x = 0; x < numBuckets; x++) {
				if(buckets[x] > firstPeakSize) {
					firstPeak = x;
					firstPeakSize = buckets[x];
				}
				if(buckets[x] > maxBucketCount) {
					maxBucketCount = buckets[x];
				}
			}

			// Find the second-tallest peak which is somewhat far from the tallest peak.
			var secondPeak = 0,
				secondPeakScore = 0;

			for(var x = 0; x < numBuckets; x++) {
				var distanceToBiggest = x - firstPeak;

				// Encourage more distant second peaks by multiplying by square of distance.

				var score = buckets[x] * distanceToBiggest * distanceToBiggest;

				if(score > secondPeakScore) {
					secondPeak = x;
					secondPeakScore = score;
				}
			}

			// Make sure firstPeak corresponds to the black peak.
			if(firstPeak > secondPeak) {
				var temp = firstPeak;
				firstPeak = secondPeak;
				secondPeak = temp;
			}

			// If there is too little contrast in the image to pick a meaningful black point, throw rather
			// than waste time trying to decode the image, and risk false positives.
			// TODO: It might be worth comparing the brightest and darkest pixels seen, rather than the
			// two peaks, to determine the contrast.
			if(secondPeak - firstPeak <= numBuckets >> 4) {
				return false;
			}

			// Find a valley between them that is low and closer to the white peak.
			var bestValley = secondPeak - 1,
				bestValleyScore = -1;

			for(var x = secondPeak - 1; x > firstPeak; x--) {
				var fromFirst = x - firstPeak,
					score = fromFirst * fromFirst * (secondPeak - x) * (maxBucketCount - buckets[x]);

				if(score > bestValleyScore) {
					bestValley = x;
					bestValleyScore = score;
				}
			}

			return bestValley << LUMINANCE_SHIFT;
		};

		/// <summary>
		/// Does not sharpen the data, as this call is intended to only be used by 2D Readers.
		/// </summary>
		var initBlackMatrix = function () {

			// Quickly calculates the histogram by sampling four rows from the image. This proved to be
			// more robust on the blackbox tests than sampling a diagonal as we used to do.
			initArrays(width);

			var localBuckets = buckets;

			for(var y = 1; y < 5; y++) {
				var row = height * y / 5;

				localLuminances = luminanceSource.getRow(row, luminances);

				var right = (width << 2) / 5;

				for(var x = width / 5; x < right; x++) {
					var pixel = localLuminances[x] & 0xff;

					localBuckets[pixel >> LUMINANCE_SHIFT]++;
				}
			}

			var blackPoint = estimateBlackPoint(localBuckets);

			if(blackPoint === false) {
				throw new Error('No black point');
			}

			// We delay reading the entire image luminance until the black point estimation succeeds.
			// Although we end up reading four rows twice, it is consistent with our motto of
			// "fail quickly" which is necessary for continuous scanning.
			localLuminances = luminanceSource.matrix;

			for(var y = 0; y < height; y++) {
				var offset = y * width;

				for(var x = 0; x < width; x++) {
					var pixel = localLuminances[offset + x] & 0xff;

					setBit(x, y, pixel < blackPoint);
				}
			}
		};

		//endregion

		initBlackMatrix();

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
