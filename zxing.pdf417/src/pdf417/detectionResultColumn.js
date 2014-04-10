(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	//region Constants

	var MAX_NEARBY_DISTANCE = 5;

	//endregion

	pdf417.DetectionResultColumn = function(box) {
		var box = this.box = pdf417.BoundingBox.create(box);
		var codewords = this.codewords = zxing.helpers.createArray(box.maxY - box.minY + 1, null);

		//region Private Fields

		//endregion

		//region Public Fields

		var imageRowToCodewordIndex = function(imageRow) {
			return imageRow - box.minY;
		};

		/// <summary>
		/// Converts the Image's Row to the index in the Codewords array
		/// </summary>
		/// <returns>The Codeword Index.</returns>
		/// <param name="imageRow">Image row.</param>
		var indexForRow = function(imageRow) {
			return imageRow - box.minY;
		};

		/// <summary>
		/// Gets the codeword for a given row
		/// </summary>
		/// <returns>The codeword.</returns>
		/// <param name="imageRow">Image row.</param>
		var getCodeword = function(imageRow){
			return codewords[imageRowToCodewordIndex(imageRow)];
		};

		/// <summary>
		/// Sets the codeword for an image row
		/// </summary>
		/// <param name="imageRow">Image row.</param>
		/// <param name="codeword">Codeword.</param>
		var setCodeword = function(imageRow, codeword) {
			codewords[indexForRow(imageRow)] = codeword;
		};

		/// <summary>
		/// Gets the codeword closest to the specified row in the image
		/// </summary>
		/// <param name="imageRow">Image row.</param>
		var getCodewordNearby = function(imageRow){
			var codeword = getCodeword(imageRow);

			if (codeword != null) {
				return codeword;
			}

			for (var i = 1; i < MAX_NEARBY_DISTANCE; i++) {
				var nearImageRow = imageRowToCodewordIndex(imageRow) - i;

				if (nearImageRow >= 0) {
					codeword = codewords[nearImageRow];

					if (codeword !== null) {
						return codeword;
					}
				}

				nearImageRow = imageRowToCodewordIndex(imageRow) + i;

				if (nearImageRow < codewords.length) {

					codeword = codewords[nearImageRow];

					if (codeword != null) {
						return codeword;
					}
				}
			}

			return null;
		};

		//endregion

		//region Private Function

		//endregion

		//region Public Functions

		this.getCodeword = getCodeword;
		this.setCodeword = setCodeword;
		this.getCodewordNearby = getCodewordNearby;
		this.imageRowToCodewordIndex = imageRowToCodewordIndex;
		this.indexForRow = indexForRow;

		//endregion
	};

})(window.zxing || (window.zxing = {}));
