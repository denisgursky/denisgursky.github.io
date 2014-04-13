(function(zxing) {
	'use strict';

	/// <summary> This Binarizer implementation uses the old ZXing global histogram approach. It is suitable
	/// for low-end mobile devices which don't have enough CPU or memory to use a local thresholding
	/// algorithm. However, because it picks a global black point, it cannot handle difficult shadows
	/// and gradients.
	var globalHistogramBinarizer = function(luminanceSource, setBit){
		//region Constants

		var LUMINANCE_BITS = 5;
		var LUMINANCE_SHIFT = 8 - LUMINANCE_BITS;
		var LUMINANCE_BUCKETS = 1 << LUMINANCE_BITS;

		//endregion

		var luminances = [],
			localLuminances = [],
			buckets = zxing.helpers.createArray(LUMINANCE_BUCKETS, 0),
			width = luminanceSource.width,
			height = luminanceSource.height;

		var initArrays = function(luminanceSize) {
			if(luminances.length < luminanceSize) {
				luminances = zxing.helpers.createArray(luminanceSize, 0);
			}

			for(var x = 0; x < LUMINANCE_BUCKETS; x++) {
				buckets[x] = 0;
			}
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
				var row = Math.floor(height * y / 5);

				localLuminances = luminanceSource.getRow(row, luminances);

				var right = Math.floor((width << 2) / 5);

				for(var x = Math.floor(width / 5); x < right; x++) {
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

		initBlackMatrix();
	};


	/// <summary> This class implements a local thresholding algorithm, which while slower than the
	/// GlobalHistogramBinarizer, is fairly efficient for what it does. It is designed for
	/// high frequency images of barcodes with black data on white backgrounds. For this application,
	/// it does a much better job than a global blackpoint with severe shadows and gradients.
	/// However it tends to produce artifacts on lower frequency images and is therefore not
	/// a good general purpose binarizer for uses outside ZXing.
	var hybridBinarizer = function(luminanceSource, setBit){

		//region Constants

		// This class uses 5x5 blocks to compute local luminance, where each block is 8x8 pixels.
		// So this is the smallest dimension in each axis we can accept.
		var BLOCK_SIZE_POWER = 3;
		var BLOCK_SIZE = 1 << BLOCK_SIZE_POWER; // ...0100...00
		var BLOCK_SIZE_MASK = BLOCK_SIZE - 1;   // ...0011...11
		var MINIMUM_DIMENSION = 40;
		var MIN_DYNAMIC_RANGE = 24;

		//endregion


		/// <summary>
		/// Calculates a single black point for each 8x8 block of pixels and saves it away.
		/// See the following thread for a discussion of this algorithm:
		/// http://groups.google.com/group/zxing/browse_thread/thread/d06efa2c35a7ddc0
		/// </summary>
		/// <param name="luminances">The luminances.</param>
		/// <param name="subWidth">Width of the sub.</param>
		/// <param name="subHeight">Height of the sub.</param>
		/// <param name="width">The width.</param>
		/// <param name="height">The height.</param>
		/// <returns></returns>
		var calculateBlackPoints = function(luminances, subWidth, subHeight, width, height) {
			var blackPoints = zxing.helpers.createArray(subHeight, 0);

			for (var i = 0; i < subHeight; i++) {
				blackPoints[i] = zxing.helpers.createArray(subWidth, 0);
			}

			for (var y = 0; y < subHeight; y++) {
				var yoffset = y << BLOCK_SIZE_POWER,
					maxYOffset = height - BLOCK_SIZE;

				if (yoffset > maxYOffset) {
					yoffset = maxYOffset;
				}

				for (var x = 0; x < subWidth; x++) {
					var xoffset = x << BLOCK_SIZE_POWER,
						maxXOffset = width - BLOCK_SIZE;

					if (xoffset > maxXOffset) {
						xoffset = maxXOffset;
					}

					var sum = 0,
						min = 0xFF,
						max = 0;

					for (var yy = 0, offset = yoffset * width + xoffset; yy < BLOCK_SIZE; yy++, offset += width) {
						for (var xx = 0; xx < BLOCK_SIZE; xx++){
							var pixel = luminances[offset + xx] & 0xFF;
							// still looking for good contrast
							sum += pixel;
							if (pixel < min) {
								min = pixel;
							}

							if (pixel > max){
								max = pixel;
							}
						}

						// short-circuit min/max tests once dynamic range is met
						if (max - min > MIN_DYNAMIC_RANGE) {
							// finish the rest of the rows quickly
							for (yy++, offset += width; yy < BLOCK_SIZE; yy++, offset += width){
								for (var xx = 0; xx < BLOCK_SIZE; xx++) {
									sum += luminances[offset + xx] & 0xFF;
								}
							}
						}
					}

					// The default estimate is the average of the values in the block.
					var average = sum >> (BLOCK_SIZE_POWER * 2);

					if (max - min <= MIN_DYNAMIC_RANGE) {
						// If variation within the block is low, assume this is a block with only light or only
						// dark pixels. In that case we do not want to use the average, as it would divide this
						// low contrast area into black and white pixels, essentially creating data out of noise.
						//
						// The default assumption is that the block is light/background. Since no estimate for
						// the level of dark pixels exists locally, use half the min for the block.
						average = min >> 1;

						if (y > 0 && x > 0) {
							// Correct the "white background" assumption for blocks that have neighbors by comparing
							// the pixels in this block to the previously calculated black points. This is based on
							// the fact that dark barcode symbology is always surrounded by some amount of light
							// background for which reasonable black point estimates were made. The bp estimated at
							// the boundaries is used for the interior.

							// The (min < bp) is arbitrary but works better than other heuristics that were tried.
							var averageNeighborBlackPoint = (blackPoints[y - 1][x] + (2 * blackPoints[y][x - 1]) +
							blackPoints[y - 1][x - 1]) >> 2;

							if (min < averageNeighborBlackPoint) {
								average = averageNeighborBlackPoint;
							}
						}
					}
					blackPoints[y][x] = average;
				}
			}

			return blackPoints;
		};

		var cap = function(value, min, max) {
			return value < min ? min : value > max ? max : value;
		};

		/// <summary>
		/// Applies a single threshold to an 8x8 block of pixels.
		/// </summary>
		/// <param name="luminances">The luminances.</param>
		/// <param name="xoffset">The xoffset.</param>
		/// <param name="yoffset">The yoffset.</param>
		/// <param name="threshold">The threshold.</param>
		/// <param name="stride">The stride.</param>
		/// <param name="matrix">The matrix.</param>
		var thresholdBlock = function(luminances, xoffset, yoffset, threshold, stride) {
			var offset = (yoffset * stride) + xoffset;

			for (var y = 0; y < BLOCK_SIZE; y++, offset += stride) {
				for (var x = 0; x < BLOCK_SIZE; x++) {
					var pixel = luminances[offset + x] & 0xff;

					// Comparison needs to be <= so that black == 0 pixels are black even if the threshold is 0.
					setBit(xoffset + x, yoffset + y, (pixel <= threshold));
				}
			}
		};

		/// <summary>
		/// For each 8x8 block in the image, calculate the average black point using a 5x5 grid
		/// of the blocks around it. Also handles the corner cases (fractional blocks are computed based
		/// on the last 8 pixels in the row/column which are also used in the previous block).
		/// </summary>
		/// <param name="luminances">The luminances.</param>
		/// <param name="subWidth">Width of the sub.</param>
		/// <param name="subHeight">Height of the sub.</param>
		/// <param name="width">The width.</param>
		/// <param name="height">The height.</param>
		/// <param name="blackPoints">The black points.</param>
		/// <param name="matrix">The matrix.</param>
		var calculateThresholdForBlock = function(luminances, subWidth, subHeight, width, height, blackPoints) {
			for (var y = 0; y < subHeight; y++) {
				var yoffset = y << BLOCK_SIZE_POWER,
					maxYOffset = height - BLOCK_SIZE;

				if (yoffset > maxYOffset) {
					yoffset = maxYOffset;
				}

				for (var x = 0; x < subWidth; x++) {
					var xoffset = x << BLOCK_SIZE_POWER,
						maxXOffset = width - BLOCK_SIZE;

					if (xoffset > maxXOffset) {
						xoffset = maxXOffset;
					}

					var left = cap(x, 2, subWidth - 3),
						top = cap(y, 2, subHeight - 3),
						sum = 0;

					for (var z = -2; z <= 2; z++) {
						var blackRow = blackPoints[top + z];
						sum += blackRow[left - 2];
						sum += blackRow[left - 1];
						sum += blackRow[left];
						sum += blackRow[left + 1];
						sum += blackRow[left + 2];
					}

					var average = Math.floor(sum / 25);

					thresholdBlock(luminances, xoffset, yoffset, average, width);
				}
			}
		};


		/// <summary>
		/// Calculates the final BitMatrix once for all requests. This could be called once from the
		/// constructor instead, but there are some advantages to doing it lazily, such as making
		/// profiling easier, and not doing heavy lifting when callers don't expect it.
		/// </summary>
		var binarizeEntireImage = function() {
			var width = luminanceSource.width,
				height = luminanceSource.height;

			if(width >= MINIMUM_DIMENSION && height >= MINIMUM_DIMENSION) {
				var luminances = luminanceSource.matrix;

				var subWidth = width >> BLOCK_SIZE_POWER;
				if((width & BLOCK_SIZE_MASK) !== 0) {
					subWidth++;
				}

				var subHeight = height >> BLOCK_SIZE_POWER;
				if((height & BLOCK_SIZE_MASK) !== 0) {
					subHeight++;
				}

				var blackPoints = calculateBlackPoints(luminances, subWidth, subHeight, width, height);

				calculateThresholdForBlock(luminances, subWidth, subHeight, width, height, blackPoints);

				return true;
			}

			return false;
		};

		return binarizeEntireImage();
	};

	zxing.globalHistogramBinarizer = globalHistogramBinarizer;
	zxing.hybridBinarizer = hybridBinarizer;

})(window.zxing || (window.zxing = {}));
