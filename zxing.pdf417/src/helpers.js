(function(zxing) {
	'use strict';

	var createArray = function(length, defaultValue) {
		var array = [];

		for(var i = 0; i < length; i++) {
			if(typeof(defaultValue) === 'function') {
				array[i] = defaultValue();
			} else {
				array[i] = defaultValue;
			}
		}

		return array;
	};

	var copyArrayItems = function(sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
		for(var i = 0; i < length; i++) {
			destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
		}
	};

	var extend = function(Child, Parent) {
		var F = function() {};
		F.prototype = Parent.prototype;
		Child.prototype = new F();
		Child.prototype.constructor = Child;
		Child.superclass = Parent.prototype;
	};

	var lshift = function(num, bits) {
		return num * Math.pow(2,bits);
	};

	var rshift = function(num, bits) {
		return  Math.floor(num / Math.pow(2,bits));
	};

	var toChar = function(number) {
		return typeof (number) === 'string' ? number : String.fromCharCode(number);
	};

	var charArrayToString = function(array) {
		var result = '';

		for(var i = 0; i < array.length; i++){
			result += toChar(array[i]);
		}

		return result;
	};


	zxing.helpers = {
		createArray: createArray,
		copyArrayItems: copyArrayItems,
		extend: extend,
		lshift: lshift,
		rshift: rshift,
		toChar: toChar,
		charArrayToString: charArrayToString
	};
})(window.zxing || (window.zxing = {}));