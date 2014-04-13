(function(zxing) {
	'use strict';

	//region Constants

	// the following channel weights give nearly the same
	// gray scale picture as the java version with BufferedImage.TYPE_BYTE_GRAY
	// they are used in sub classes for luminance / gray scale calculation
	var R_CHANNEL_WEIGHT = 19562;
	var G_CHANNEL_WEIGHT = 38550;
	var B_CHANNEL_WEIGHT = 7424;
	var CHANNEL_WEIGHT = 16;

	//endregion

	zxing.LuminanceSource = function(image) {

		//region Private Fields

		var width = image.width,
			height = image.height,
			luminances = [];

		//endregion

		//region Private Functions

		var getPixel = function(image, x, y) {
			if(image.width < x) {
				throw new Error('point error');
			}
			if(image.height < y) {
				throw new Error('point error');
			}
			var point = (x * 4) + (y * image.width * 4);

			return {
				r: image.data[point], g: image.data[point + 1], b: image.data[point + 2]
			};
		};

		var getRow = function(y, row) {
			if(!row || row.length < width) {
				row = zxing.helpers.createArray(width, 0);
			}

			for(var i = 0; i < width; i++) {
				row[i] = luminances[y * width + i];
			}

			return row;
		};

		var initLuminances = function(){
			//TODO: there's faster way
			for(var y = 0; y < image.height; y++) {
				var offset = y * image.width;
				for(var x = 0; x < image.width; x++) {
					var c = getPixel(image, x, y);
					luminances[offset + x] = ((R_CHANNEL_WEIGHT * c.r + G_CHANNEL_WEIGHT * c.g + B_CHANNEL_WEIGHT * c.b) >> CHANNEL_WEIGHT);
				}
			}
		};

		//endregion

		initLuminances();


		//region Public Members

		this.width = width;
		this.height = height;

		this.matrix = luminances;
		this.getRow = getRow;

		//endregion
	};
})(window.zxing || (window.zxing = {}));