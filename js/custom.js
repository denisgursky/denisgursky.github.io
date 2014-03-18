(function() {
	var deviceMap = {
		mobile: {
			width: 320,
			height: 480
		},
		tablet: {
			height: 768,
			width: 1024
		},
		desktop: {
			width: 1432,
			height: 800
		}
	};

	var changeMode = function($device, $iframe, deviceType) {
		$device.className = $device.className.replace(/mobile|tablet|desktop/, '') + ' ' + deviceType;

		var device = deviceMap[deviceType];

		$iframe.width = device.width;
		$iframe.height = device.height;
	};

	var controlContainers = document.querySelectorAll('.control-container');

	for(var i = 0; i < controlContainers.length; i++) {
		controlContainers[i].addEventListener('click', function(e) {
			var $device = e.currentTarget.getElementsByClassName('device')[0];

			if(e.target.attributes['data-device']) {
				var $iframe = $device.getElementsByTagName('iframe')[0],
					deviceType = e.target.attributes['data-device'].value;

				changeMode($device, $iframe, deviceType);
			}
		}, false);
	}


	var docsIframe = document.querySelector('#docs-iframe');

	document.querySelector('.docs-overview').addEventListener('click', function(e){
		if(e.target.attributes['data-docurl']) {
			docsIframe.src = e.target.attributes['data-docurl'].value;
		}
	}, false);
})();