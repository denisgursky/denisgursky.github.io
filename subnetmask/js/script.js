(function(JSZip, saveAs) {

	var $button = document.querySelector('#run'),
		$filename = document.querySelector('#filename'),
		$maskList = document.querySelector('#mask-list');

	var ipRegExp = /([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/gm,
		digitRegExp = /(\d+)/gm;

	var parseIp = function(ip){
		var numbers = ip.match(digitRegExp);

		for(var i = 0; i < numbers.length; i++){
			numbers[i] = parseInt(numbers[i]);
		}

		return numbers;
	};

	var parseSubnetList = function(maskListText){
		var parsedIp = maskListText.match(ipRegExp);

		var result = [];

		for(var i = 0; i < parsedIp.length; i+=2) {
			if(parsedIp[i+1]) {
				result.push({
					begin: parsedIp[i],
					end: parsedIp[i+1]
				});
			}
		}

		return result;
	};

	var generateFileContent = function(mask){
		var begin = parseIp(mask.begin),
			end = parseIp(mask.end),
			content = '';

		for(var n0 = begin[0]; n0 <= end[0]; n0++) {
			for(var n1 = begin[1]; n1 <= end[1]; n1++) {
				for(var n2 = begin[2]; n2 <= end[2]; n2++) {
					for(var n3 = begin[3]; n3 <= end[3]; n3++) {
						if(n3 !== 0 && n3 !== 255) {
							content += [n0, n1, n2, n3].join('.') + '\r\n';
						}
					}
				}
			}
		}

		return content;
	};

	var run = function(filename, maskListText){
		var zip = new JSZip(),
			subnetList = parseSubnetList(maskListText);


		for(var i = 0; i < subnetList.length; i++) {
			var mask = subnetList[i];

			var fileContent = generateFileContent(mask);

			zip.file(mask.begin + '_' + filename + '.txt', fileContent);
		}

		var content = zip.generate({type:"blob"});

		saveAs(content, filename + '.zip');
	};

	$button.addEventListener('click', function(e){
		var filename = $filename.value,
			maskListText = $maskList.value;

		if(filename && filename.length > 0 &&
			maskListText && maskListText.length > 0) {

			run(filename, maskListText);
		} else {
			alert('Some field is empty!');
		}

		return false;
	}, false);
})(JSZip, saveAs);