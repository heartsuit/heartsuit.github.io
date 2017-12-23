$(function () {
	$(window).scroll(function () {
		if ($(window).scrollTop() > 160) {
			$('div.go-top').show();
		} else {
			$('div.go-top').hide();
		}
	});
	$('div.go-top').click(function () {
		$('html, body').animate({ scrollTop: 0 }, 1000);
	});
});
