(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	pdf417.BarcodeValue = function() {
		//region Private Fields

		var values = {};

		//endregion

		//region Public Fields


		//endregion

		//region Private Functions

		/// <summary>
		/// Determines the maximum occurrence of a set value and returns all values which were set with this occurrence.
		/// </summary>
		/// <returns>an array of int, containing the values with the highest occurrence, or null, if no value was set.</returns>
		var getValue = function() {
			var maxConfidence = -1;

			var result = [];

			for(var key in values) {
				if(values.hasOwnProperty(key)){
					key = parseInt(key);

					var value = values[key];

					if (value > maxConfidence) {
						maxConfidence = value;

						result = [];

						result.push(key);
					} else if (value === maxConfidence) {
						result.push(key);
					}
				}
			}

			return result;
		};

		/// <summary>
		/// Incremenets the Confidence for a given value. (Adds an occurance of a value)
		///
		/// </summary>
		/// <param name="value">Value.</param>
		var setValue = function(value){
			var confidence = values[value] || 0;

			confidence++;

			values[value] = confidence;
		};

		//endregion

		//region Public Functions

		this.getValue = getValue;
		this.setValue = setValue;

		this.values = values;

		//endregion
	};

})(window.zxing || (window.zxing = {}));
