importScripts('zxing.pdf417.min.js');

self.addEventListener('message', function(e) {
	var luminanceSource = new zxing.LuminanceSource(e.data);

	var bitMatrix = new zxing.BitMatrix(luminanceSource);

	var results = zxing.pdf417.reader.decode(false, bitMatrix);

	if(results[0]){
		self.postMessage(results[0].text)
	} else {
		self.postMessage("couldn't decode")
	}
}, false);