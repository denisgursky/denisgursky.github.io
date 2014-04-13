$(function(){
	'use strict';

	var zxing = window.zxing;

	var run = function(image){
		var luminanceSource = new zxing.LuminanceSource(image);

		var bitMatrix = new zxing.BitMatrix(luminanceSource);


		var results = zxing.pdf417.reader.decode(false, bitMatrix);

		alert(results[0].text);
		debugger;
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
		var d = $.Deferred();

		var img = new Image();

		img.src = dataUrl;

		img.onload = function () {
			var tempW = img.width;
			var tempH = img.height;

			var canvas = document.createElement('canvas');
			canvas.width = tempW;
			canvas.height = tempH;

			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, tempW, tempH);

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

	$('#btnUpload').on('click', function(){
		var files = $('#fileUpload')[0].files;

		if (files.length === 1 && files[0].type.indexOf('image') !== -1) {

			localLoad(files[0])
				.then(loadToCanvas)
				.then(run)
				.then(function(){
				});
		}
	});
});