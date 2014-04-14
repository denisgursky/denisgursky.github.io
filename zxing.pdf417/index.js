$(function(){
	'use strict';

	var worker = new Worker('zxing.worker.js');

	var zxing = window.zxing;

	var run = function(image, useWorkers){
		var d = $.Deferred();


		if(useWorkers){
			worker.postMessage(image);

			worker.addEventListener('message', function(e) {
				d.resolve(e.data);
			}, false);
		} else {
			var luminanceSource = new zxing.LuminanceSource(image);

			var bitMatrix = new zxing.BitMatrix(luminanceSource);


			var results = zxing.pdf417.reader.decode(false, bitMatrix);

			if(results[0]){
				d.resolve(results[0].text);
			} else {
				d.resolve("couldn't decode");
			}
		}

		return d.promise();
	};

	var localLoad = function (file) {
		var d = $.Deferred();

		var reader = new FileReader();

		reader.onloadend = function () {
			d.resolve(reader.result, file.type);
		};

		reader.readAsDataURL(file);

		return d.promise();
	};

	var loadToCanvas = function (dataUrl, type, resizing) {
		if(navigator.userAgent.match(/iPhone/)){
			resizing = true;
		}

		var d = $.Deferred();

		var img = new Image();

		img.src = dataUrl;

		img.onload = function () {
			var tempW = img.width;
			var tempH = img.height;

			if (resizing) {
				var MAX_WIDTH = 2048;
				var MAX_HEIGHT = 1536;

				if (tempW > tempH) {
					if (tempW > MAX_WIDTH) {
						tempH *= MAX_WIDTH / tempW;
						tempW = MAX_WIDTH;
					}
				} else {
					if (tempH > MAX_HEIGHT) {
						tempW *= MAX_HEIGHT / tempH;
						tempH = MAX_HEIGHT;
					}
				}
			}

			var canvas = document.createElement('canvas');
			canvas.width = tempW;
			canvas.height = tempH;

			var ctx = canvas.getContext("2d");
			//ctx.drawImage(img, 0, 0, tempW, tempH);

			drawImageIOSFix(ctx, img, 0, 0, img.width, img.height, 0, 0, tempW, tempH);

			var imgd = ctx.getImageData(0, 0, tempW, tempH);

			var image = {
				data: imgd.data,
				width: tempW,
				height: tempH
			};

			d.resolve(image);
		};

		return d.promise();
	};

	/**
	 * Detecting vertical squash in loaded image.
	 * Fixes a bug which squash image vertically while drawing into canvas for some images.
	 * This is a bug in iOS6 devices. This function from https://github.com/stomita/ios-imagefile-megapixel
	 *
	 */
	var detectVerticalSquash = function (img) {
		var iw = img.naturalWidth, ih = img.naturalHeight;
		var canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = ih;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		var data = ctx.getImageData(0, 0, 1, ih).data;
		// search image edge pixel position in case it is squashed vertically.
		var sy = 0;
		var ey = ih;
		var py = ih;
		while (py > sy) {
			var alpha = data[(py - 1) * 4 + 3];
			if (alpha === 0) {
				ey = py;
			} else {
				sy = py;
			}
			py = (ey + sy) >> 1;
		}
		var ratio = (py / ih);
		return (ratio === 0) ? 1 : ratio;
	};

	var drawImageIOSFix = function(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
		var vertSquashRatio = detectVerticalSquash(img);
		// Works only if whole image is displayed:
		// ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
		// The following works correct also when only a part of the image is displayed:
		ctx.drawImage(img, sx * vertSquashRatio, sy * vertSquashRatio,
			sw * vertSquashRatio, sh * vertSquashRatio,
			dx, dy, dw, dh);
	};

	$('#btnDecode').on('click', function(){
		decode(false);
	});

	$('#btnDecode2').on('click', function(){
		decode(true);
	});

	var decode = function(useWorkers){
		time.start('all');
		$('#resultTime').text('decoding...');
		$('#result').val('');

		var files = $('#fileUpload')[0].files;

		if (files.length === 1 && files[0].type.indexOf('image') !== -1) {

			localLoad(files[0])
				.then(loadToCanvas)
				.then(function(image){
					return run(image, useWorkers)
				})
				.then(function(result){
					$('#resultTime').text("Elapsed time: " + (time.stop('all') / 1000).toFixed(2) + " secs");
					$('#result').val(result)
				});
		}
	}

	var time = (function(){
		var timers = {};

		return {
			start: function(name){
				timers[name] = (new Date()).getTime();
			},
			stop: function(name){
				if(timers[name]){
					var diff = (new Date().getTime()) - timers[name];
					timers[name] = undefined;
					return diff;
				}

				return 0;
			}
		}
	})();
});