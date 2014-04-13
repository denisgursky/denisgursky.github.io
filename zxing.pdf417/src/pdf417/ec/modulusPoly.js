(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	zxing.pdf417.ec = zxing.pdf417.ec || {};

	var ec = zxing.pdf417.ec;

	ec.ModulusPoly = function(field, coefficients) {

		//region Private Fields

		var self = this;

		//endregion

		if (coefficients.length === 0) {
			throw new Error('Wrong argument');
		}

		var coefficientsLength = coefficients.length;

		if (coefficientsLength > 1 && coefficients[0] === 0) {
			// Leading term must be non-zero for anything except the constant polynomial "0"
			var firstNonZero = 1;

			while (firstNonZero < coefficientsLength && coefficients[firstNonZero] === 0) {
				firstNonZero++;
			}

			if (firstNonZero === coefficientsLength) {
				this.coefficients = field.zero.coefficients;
			} else {
				this.coefficients = zxing.helpers.createArray(coefficientsLength - firstNonZero, 0);

				zxing.helpers.copyArrayItems(coefficients, firstNonZero, this.coefficients, 0, this.coefficients.length);
			}
		} else {
			this.coefficients = coefficients;
		}

		//region Public Fields
		this.field = field;
		this.degree = this.coefficients.length - 1;
		this.isZero = this.coefficients[0] === 0;

		//endregion

		//region Private Functions

		/// <summary>
		/// coefficient of x^degree term in this polynomial
		/// </summary>
		/// <param name="degree">The degree.</param>
		/// <returns>coefficient of x^degree term in this polynomial</returns>
		var getCoefficient = function(degree){
			return self.coefficients[self.coefficients.length - 1 - degree];
		};

		/// <summary>
		/// evaluation of this polynomial at a given point
		/// </summary>
		/// <param name="a">A.</param>
		/// <returns>evaluation of this polynomial at a given point</returns>
		var evaluateAt = function(a) {
			if (a === 0) {
				// Just return the x^0 coefficient
				return getCoefficient(0);
			}

			var size = self.coefficients.length,
				result = 0;

			if (a === 1) {
				// Just the sum of the coefficients
				for (var i = 0; i < self.coefficients.length; i++) {
					result = field.add(result, self.coefficients[i]);
				}

				return result;
			}

			result = self.coefficients[0];

			for (var j = 1; j < size; j++) {
				result = field.add(field.multiply(a, result), self.coefficients[j]);
			}

			return result;
		};

		/// <summary>
		/// Adds another Modulus
		/// </summary>
		/// <param name="other">Other.</param>
		var add = function(other) {
			if (field !== other.field) {
				//check_it
				throw new Error("ModulusPolys do not have same ModulusGF field");
			}

			if (self.isZero) {
				return other;
			}

			if (other.isZero) {
				return self;
			}

			var smallerCoefficients = self.coefficients,
				largerCoefficients = other.coefficients;

			if (smallerCoefficients.length > largerCoefficients.length) {
				var temp = smallerCoefficients;
				smallerCoefficients = largerCoefficients;
				largerCoefficients = temp;
			}

			var sumDiff = zxing.helpers.createArray(largerCoefficients.length, 0),
				lengthDiff = largerCoefficients.length - smallerCoefficients.length;

			// Copy high-order terms only found in higher-degree polynomial's coefficients
			zxing.helpers.copyArrayItems(largerCoefficients, 0, sumDiff, 0, lengthDiff);

			for (var i = lengthDiff; i < largerCoefficients.length; i++) {
				sumDiff[i] = field.add(smallerCoefficients[i - lengthDiff], largerCoefficients[i]);
			}

			return new ec.ModulusPoly(field, sumDiff);
		};

		/// <summary>
		/// Subtract another Modulus
		/// </summary>
		/// <param name="other">Other.</param>
		var subtract = function(other) {
			if (field !== other.field) {
				//check_it
				throw new Error("ModulusPolys do not have same ModulusGF field");
			}

			if (other.isZero) {
				return self;
			}

			return add(other.getNegative());
		};

		/// <summary>
		/// Multiply by another Modulus
		/// </summary>
		/// <param name="other">Other.</param>
		var multiplyByModulus = function(other){
			if (field !== other.field) {
				//check_it
				throw new Error("ModulusPolys do not have same ModulusGF field");
			}

			if (self.isZero || other.isZero) {
				return field.zero;
			}

			var aCoefficients = self.coefficients,
				aLength = aCoefficients.length,
				bCoefficients = other.coefficients,
				bLength = bCoefficients.length,
				product = zxing.helpers.createArray(aLength + bLength - 1, 0);

			for (var i = 0; i < aLength; i++) {
				var aCoeff = aCoefficients[i];

				for (var j = 0; j < bLength; j++) {
					product[i + j] = field.add(product[i + j], field.multiply(aCoeff, bCoefficients[j]));
				}
			}

			return new ec.ModulusPoly(field, product);
		};

		/// <summary>
		/// Multiply by a Scalar.
		/// </summary>
		/// <param name="scalar">Scalar.</param>
		var multiplyByScalar = function(scalar) {
			if (scalar === 0) {
				return field.zero;
			}

			if (scalar === 1) {
				return this;
			}

			var size = coefficients.length,
				product = zxing.helpers.createArray(size, 0);

			for (var i = 0; i < size; i++) {
				product[i] = field.multiply(coefficients[i], scalar);
			}

			return new ec.ModulusPoly(field, product);
		};

		var multiply = function(otherOrScalar){
			if(typeof (otherOrScalar) === 'number'){
				return multiplyByScalar(otherOrScalar);
			} else {
				return multiplyByModulus(otherOrScalar);
			}
		};

		/// <summary>
		/// Returns a Negative version of this instance
		/// </summary>
		var getNegative = function() {
			var size = coefficients.length,
				negativeCoefficients = zxing.helpers.createArray(size, 0);

			for (var i = 0; i < size; i++) {
				negativeCoefficients[i] = field.subtract(0, coefficients[i]);
			}

			return new ec.ModulusPoly(field, negativeCoefficients);
		};

		/// <summary>
		/// Multiplies by a Monomial
		/// </summary>
		/// <returns>The by monomial.</returns>
		/// <param name="degree">Degree.</param>
		/// <param name="coefficient">Coefficient.</param>
		var multiplyByMonomial = function(degree, coefficient) {
			if (degree < 0) {
				throw new Error('Wrong argument');
			}

			if (coefficient === 0) {
				return field.zero;
			}

			var size = self.coefficients.length,
				product = new zxing.helpers.createArray(size + degree, 0);

			for (var i = 0; i < size; i++) {
				product[i] = field.multiply(self.coefficients[i], coefficient);
			}

			return new ec.ModulusPoly(field, product);
		};

		/// <summary>
		/// Divide by another modulus
		/// </summary>
		/// <param name="other">Other.</param>
		var divide = function(other) {
			if (field !== other.field) {
				//check_it
				throw new Error("ModulusPolys do not have same ModulusGF field");
			}

			if (other.isZero) {
				throw new Error("Device by zero");
			}

			var quotient = field.zero,
				remainder = this,
				denominatorLeadingTerm = other.getCoefficient(other.degree),
				inverseDenominatorLeadingTerm = field.inverse(denominatorLeadingTerm);

			while (remainder.degree >= other.degree && !remainder.isZero) {
				var degreeDifference = remainder.degree - other.degree,
					scale = field.multiply(remainder.getCoefficient(remainder.degree), inverseDenominatorLeadingTerm),
					term = other.multiplyByMonomial(degreeDifference, scale),
					iterationQuotient = field.buildMonomial(degreeDifference, scale);

				quotient = quotient.add(iterationQuotient);
				remainder = remainder.subtract(term);
			}

			return [quotient, remainder];
		};

		//endregion

		//region Public Functions

		this.getCoefficient = getCoefficient;
		this.evaluateAt = evaluateAt;
		this.add = add;
		this.subtract = subtract;
		this.multiply = multiply;
		this.getNegative = getNegative;
		this.multiplyByMonomial = multiplyByMonomial;
		this.divide = divide;

		//endregion
	};

})(window.zxing || (window.zxing = {}));
