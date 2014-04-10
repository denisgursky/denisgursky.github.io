(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	/// <summary>
	/// Initializes a new instance of the <see cref="ZXing.PDF417.Internal.BoundingBox"/> class.
	/// Will throw an exception if the corner points don't match up correctly
	/// </summary>
	/// <param name="image">Image.</param>
	/// <param name="topLeft">Top left.</param>
	/// <param name="topRight">Top right.</param>
	/// <param name="bottomLeft">Bottom left.</param>
	/// <param name="bottomRight">Bottom right.</param>
	pdf417.BoundingBox = function(img, topLeft, bottomLeft, topRight, bottomRight){
		//region Private Fields

		var image = img,
			self = this;

		//endregion

		//region Public Fields

		var image = this.image = image;
		var topLeft = this.topLeft = topLeft;
		var topRight = this.topRight = topRight;
		var bottomLeft = this.bottomLeft = bottomLeft;
		var bottomRight = this.bottomRight = bottomRight;

		this.minX = 0;
		this.maxX = 0;
		this.minY = 0;
		this.maxY = 0;

		//endregion

		//region Private Functions


		/// <summary>
		/// Calculates the minimum and maximum X & Y values based on the corner points.
		/// </summary>
		var calculateMinMaxValues = function() {
			// Constructor ensures that either Left or Right is not null
			if (self.topLeft === null) {
				topLeft = new zxing.ResultPoint(0, topRight.y);
				self.bottomLeft = new zxing.ResultPoint(0, self.bottomRight.y);
			} else if (self.topRight === null) {
				self.topRight = new zxing.ResultPoint(image.width - 1, self.topLeft.y);
				self.bottomRight = new zxing.ResultPoint(image.width - 1, self.topLeft.Y);
			}

			self.minX = Math.floor(Math.min(self.topLeft.x, self.bottomLeft.x));
			self.maxX = Math.floor(Math.max(self.topRight.x, self.bottomRight.x));
			self.minY = Math.floor(Math.min(self.topLeft.y, self.topRight.y));
			self.maxY = Math.floor(Math.max(self.bottomLeft.y, self.bottomRight.y));
		};

		/// <summary>
		/// Adds the missing rows.
		/// </summary>
		/// <returns>The missing rows.</returns>
		/// <param name="missingStartRows">Missing start rows.</param>
		/// <param name="missingEndRows">Missing end rows.</param>
		/// <param name="isLeft">If set to <c>true</c> is left.</param>
		var addMissingRows = function(missingStartRows, missingEndRows, isLeft) {
			var newTopLeft = topLeft,
				newBottomLeft = bottomLeft,
				newTopRight = topRight,
				newBottomRight = bottomRight;

			if (missingStartRows > 0)
			{
				var top = isLeft ? topLeft : topRight,
					newMinY = Math.floor(top.y - missingStartRows);

				if (newMinY < 0) {
					newMinY = 0;
				}

				// TODO use existing points to better interpolate the new x positions
				var newTop = new pdf417.ResultPoint(top.x, newMinY);

				if (isLeft) {
					newTopLeft = newTop;
				} else {
					newTopRight = newTop;
				}
			}

			if (missingEndRows > 0) {
				var bottom = isLeft ? bottomLeft : bottomRight,
					newMaxY = Math.floor(bottom.y + missingEndRows);

				if (newMaxY >= image.height) {
					newMaxY = image.height - 1;
				}

				// TODO use existing points to better interpolate the new x positions
				var newBottom = new pdf417.ResultPoint(bottom.x, newMaxY);
				if (isLeft) {
					newBottomLeft = newBottom;
				} else {
					newBottomRight = newBottom;
				}
			}

			calculateMinMaxValues();

			return new pdf417.BoundingBox(image, newTopLeft, newBottomLeft, newTopRight, newBottomRight);
		};

		//endregion

		calculateMinMaxValues();

		//region Public Functions

		this.addMissingRows = addMissingRows;

		//endregion
	};

	/// <summary>
	/// Merge two Bounding Boxes, getting the left corners of left, and the right corners of right
	/// (Images should be the same)
	/// </summary>
	/// <param name="leftBox">Left.</param>
	/// <param name="rightBox">Right.</param>
	pdf417.BoundingBox.merge = function(leftBox, rightBox) {
		if (leftBox == null){
			return rightBox;
		}

		if (rightBox == null) {
			return leftBox;
		}

		return new pdf417.BoundingBox(leftBox.image, leftBox.topLeft, leftBox.bottomLeft, rightBox.topRight, rightBox.bottomRight);
	};

	pdf417.BoundingBox.create = function(box){
		return new pdf417.BoundingBox(box.image, box.topLeft, box.bottomLeft, box.topRight, box.bottomRight);
	};

})(window.zxing || (window.zxing = {}));
