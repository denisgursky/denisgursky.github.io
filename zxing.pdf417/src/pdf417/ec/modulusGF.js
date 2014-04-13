(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	zxing.pdf417.ec = zxing.pdf417.ec || {};

	var ec = zxing.pdf417.ec;

	ec.ModulusGF = function(modulus, generator) {
		//region Private Fields

		var expTable = zxing.helpers.createArray(modulus, 0),
			logTable = zxing.helpers.createArray(modulus, 0);

		var self = this;

		//endregion

		var x = 1;

		for (var i = 0; i < modulus; i++) {
			expTable[i] = x;
			x = (x * generator) % modulus;
		}

		for (var j = 0; j < modulus - 1; j++) {
			logTable[expTable[j]] = j;
		}

		// logTable[0] == 0 but this should never be used

		//region Public Fields

		this.size = modulus;
		this.zero = new ec.ModulusPoly(this, [0]);
		this.one = new ec.ModulusPoly(this, [1]);

		var add = function(a, b){
			return (a + b) % modulus;
		};

		var subtract = function(a, b) {
			return (modulus + a - b) % modulus;
		};

		var exp = function(a) {
			return expTable[a];
		};

		var log = function(a) {
			if (a === 0) {
				throw new Error('Wrong argument');
			}

			return logTable[a];
		};

		var inverse = function(a) {
			if (a === 0) {
				throw new Error('Wrong argument');
			}

			return expTable[modulus - logTable[a] - 1];
		};

		var multiply = function(a, b) {
			if (a === 0 || b === 0) {
				return 0;
			}

			return expTable[(logTable[a] + logTable[b]) % (modulus - 1)];
		};

		//endregion

		//region Private Functions

		var buildMonomial = function(degree, coefficient) {
			if (degree < 0) {
				throw new Error('Wrong arguments');
			}

			if (coefficient === 0) {
				return self.zero;
			}

			var coefficients = zxing.helpers.createArray(degree + 1, 0);

			coefficients[0] = coefficient;

			return new ec.ModulusPoly(this, coefficients);
		};

		//endregion

		//region Public Functions

		this.buildMonomial = buildMonomial;
		this.add = add;
		this.subtract = subtract;
		this.exp = exp;
		this.log = log;
		this.inverse = inverse;
		this.multiply = multiply;

		//endregion
	};

	ec.ModulusGF.PDF417_GF = new ec.ModulusGF(zxing.pdf417.common.NUMBER_OF_CODEWORDS, 3);

})(window.zxing || (window.zxing = {}));
