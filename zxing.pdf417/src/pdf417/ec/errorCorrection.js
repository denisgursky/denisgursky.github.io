(function(zxing) {
	'use strict';

	zxing.pdf417 = zxing.pdf417 || {};

	zxing.pdf417.ec = zxing.pdf417.ec || {};

	var ec = zxing.pdf417.ec;

	ec.ErrorCorrection = function() {
		//region Private Fields

		var field = ec.ModulusGF.PDF417_GF;

		//endregion

		//region Public Fields

		//endregion

		//region Private Functions

		/// <summary>
		/// Runs the euclidean algorithm (Greatest Common Divisor) until r's degree is less than R/2
		/// </summary>
		/// <returns>The euclidean algorithm.</returns>
		var runEuclideanAlgorithm = function(a, b, R) {

			// Assume a's degree is >= b's
			if (a.degree < b.degree) {
				var temp = a;
				a = b;
				b = temp;
			}

			var rLast = a,
				r = b,
				tLast = field.zero,
				t = field.one;

			// Run Euclidean algorithm until r's degree is less than R/2
			while (r.degree >= R / 2) {
				var rLastLast = rLast,
					tLastLast = tLast;

				rLast = r;
				tLast = t;

				// Divide rLastLast by rLast, with quotient in q and remainder in r
				if (rLast.isZero) {
					// Oops, Euclidean algorithm already terminated?
					return null;
				}

				r = rLastLast;

				var q = field.zero,
					denominatorLeadingTerm = rLast.getCoefficient(rLast.degree),
					dltInverse = field.inverse(denominatorLeadingTerm);

				while (r.degree >= rLast.degree && !r.isZero) {
					var degreeDiff = r.degree - rLast.degree,
						scale = field.multiply(r.getCoefficient(r.degree), dltInverse);

					q = q.add(field.buildMonomial(degreeDiff, scale));
					r = r.subtract(rLast.multiplyByMonomial(degreeDiff, scale));
				}

				t = q.multiply(tLast).subtract(tLastLast).getNegative();
			}

			var sigmaTildeAtZero = t.getCoefficient(0);

			if (sigmaTildeAtZero === 0) {
				return null;
			}

			var inverse = field.inverse(sigmaTildeAtZero),
				sigma = t.multiply(inverse),
				omega = r.multiply(inverse);

			return [sigma, omega];
		};

		/// <summary>
		/// Finds the error magnitudes by directly applying Forney's Formula
		/// </summary>
		/// <returns>The error magnitudes.</returns>
		/// <param name="errorEvaluator">Error evaluator.</param>
		/// <param name="errorLocator">Error locator.</param>
		/// <param name="errorLocations">Error locations.</param>
		var findErrorMagnitudes = function(errorEvaluator, errorLocator, errorLocations) {
			var errorLocatorDegree = errorLocator.degree,
				formalDerivativeCoefficients = zxing.helpers.createArray(errorLocatorDegree, 0);

			for (var i = 1; i <= errorLocatorDegree; i++) {
				formalDerivativeCoefficients[errorLocatorDegree - i] = field.multiply(i, errorLocator.getCoefficient(i));
			}

			var formalDerivative = new ec.ModulusPoly(field, formalDerivativeCoefficients);

			// This is directly applying Forney's Formula
			var s = errorLocations.length,
				result = zxing.helpers.createArray(s, 0);

			for (var j = 0; j < s; j++)
			{
				var xiInverse = field.inverse(errorLocations[j]),
					numerator = field.subtract(0, errorEvaluator.evaluateAt(xiInverse)),
					denominator = field.inverse(formalDerivative.evaluateAt(xiInverse));

				result[j] = field.multiply(numerator, denominator);
			}
			return result;
		};


		/// <summary>
		/// Finds the error locations as a direct application of Chien's search
		/// </summary>
		/// <returns>The error locations.</returns>
		/// <param name="errorLocator">Error locator.</param>
		var findErrorLocations = function(errorLocator) {
			// This is a direct application of Chien's search
			var numErrors = errorLocator.degree,
				result = zxing.helpers.createArray(numErrors, 0),
				e = 0;

			for (var i = 1; i < field.size && e < numErrors; i++) {

				if (errorLocator.evaluateAt(i) === 0) {
					result[e] = field.inverse(i);
					e++;
				}
			}

			if (e !== numErrors) {
				return null;
			}

			return result;
		};

		/// <summary>
		/// Decodes the specified received.
		/// </summary>
		/// <param name="received">The received.</param>
		/// <param name="numECCodewords">The num EC codewords.</param>
		/// <param name="erasures">The erasures.</param>
		/// <returns>The error locations count.</returns>
		var decode = function(received, numECCodewords, erasures) {
			var poly = new ec.ModulusPoly(field, received);

			var S = new zxing.helpers.createArray(numECCodewords, 0),
				error = false;

			var decodeResult = {
				result: false,
				errorLocationsCount: 0
			};

			for (var i = numECCodewords; i > 0; i--) {
				var evaluated = poly.evaluateAt(field.exp(i));

				S[numECCodewords - i] = evaluated;

				if (evaluated !== 0) {
					error = true;
				}
			}

			if (!error) {
				decodeResult.result = true;

				return decodeResult;
			}

			var knownErrors = field.one;

			for(var j = 0; j < erasures.length; j++) {
				var erasure = erasures[j];

				var b = field.exp(received.length - 1 - erasure);

				// Add (1 - bx) term:
				var term = new ec.ModulusPoly(field, [field.subtract(0, b), 1]);

				knownErrors = knownErrors.multiply(term);
			}

			var syndrome = new ec.ModulusPoly(field, S);
			//syndrome = syndrome.multiply(knownErrors);

			var sigmaOmega = runEuclideanAlgorithm(field.buildMonomial(numECCodewords, 1), syndrome, numECCodewords);

			if (sigmaOmega === null) {
				decodeResult.result = false;

				return decodeResult;
			}

			var sigma = sigmaOmega[0],
				omega = sigmaOmega[1];

			if (!sigma || !omega) {
				decodeResult.result = false;

				return decodeResult;
			}

			//sigma = sigma.multiply(knownErrors);

			var errorLocations = findErrorLocations(sigma);

			if (errorLocations === null) {
				decodeResult.result = false;

				return decodeResult;
			}

			var errorMagnitudes = findErrorMagnitudes(omega, sigma, errorLocations);

			for (var k = 0; k < errorLocations.length; k++) {
				var position = received.length - 1 - field.log(errorLocations[k]);

				if (position < 0) {
					decodeResult.result = false;

					return decodeResult;
				}

				var a = field.subtract(received[position], errorMagnitudes[k]);

				received[position] = a;
			}

			decodeResult.result = true;
			decodeResult.errorLocationsCount = errorLocations.length;

			return decodeResult;
		};

		//endregion

		//region Public Functions

		this.decode = decode;

		//endregion
	};

})(window.zxing || (window.zxing = {}));
