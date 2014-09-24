$(function() {
	var $timeListWrapper = $('.time-list-wrapper'),
		$timeList = $('.time-list'),
		$timeButtons = $('.btn-time');

	var debounce = function(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if(!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if(callNow) func.apply(context, args);
		};
	};

	var buttonWidth,
		lastContainerWidth;

	var updateButtonsWidth = function() {
		var containerWidth = $timeListWrapper.width();

		if(lastContainerWidth !== containerWidth) {
			lastContainerWidth = containerWidth;

			var numberOfButtons = Math.round(containerWidth / 85);

			buttonWidth = containerWidth / numberOfButtons;

			$timeButtons.outerWidth(Math.floor(buttonWidth) + 'px');
		}
	};

	var correctListWidth = function() {
		var $timeButtons = $timeList.find('.day-time').eq(0).find('.btn-time');
		var width = $timeButtons.length * Math.floor(buttonWidth);

		$timeList.width(width);
	};

	var fitButtons = debounce(function() {
		updateButtonsWidth();
		correctListWidth();
	}, 100);

	fitButtons();

	$(window).on('resize', function() {
		fitButtons();

		$timeListWrapper.animate({
			scrollLeft: "0px"
		}, "fast");
	});

	var move = function(side) {
		var direction = side === 'left' ? '-' : '+';

		$timeListWrapper.animate({
			scrollLeft: direction + "=" + buttonWidth + "px"
		}, "fast");
	};

	$('.btn-left').on('click', function() {
		move('left');
	});

	$('.btn-right').on('click', function() {
		move('right');
	});
});