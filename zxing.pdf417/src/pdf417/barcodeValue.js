(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	var pdf417 = zxing.pdf417;

	pdf417.BarcodeValue = function() {
		//region Private Fields

		var values = [];

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

			for(var i = 0; i < values.length; i++){
				var item = values[i];

				var value = item.value;

				if (value > maxConfidence) {
					maxConfidence = value;

					result = [];

					result.push(item.key);
				} else if (value === maxConfidence) {
					result.push(item.key);
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
			var item = _getValue(value);

			if(!item){
				item = {key: value, value: 0};
				values.push(item);
			}

			item.value++;
		};

		var _getValue = function(value){
			for(var i = 0; i < values.length; i++){
				if(values[i].key === value){
					return values[i];
				}
			}

			return null;
		};

		//endregion

		//region Public Functions

		this.getValue = getValue;
		this.setValue = setValue;

		this.values = values;

		//endregion
	};

})(window.zxing || (window.zxing = {}));
