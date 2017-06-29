$(document).ready(function () {
	//在文章中查找title并填充到div anchorContent中
	$("section").find("h3,h4,h5,h6").each(function (i, item) {
		var tag = $(item).get(0).localName;
		$(item).attr("id", "whoru" + i);
		$("#anchorContent").append('<li><a class="new' + tag + ' anchor-link" onclick="return false;" href="#" link="#whoru' + i + '">' + (i + 1) + " · " + $(this).text() + '</a></li>');
		$(".newh2").css("margin-left", 0);
		$(".newh3").css("margin-left", 20);
		$(".newh4").css("margin-left", 40);
		$(".newh5").css("margin-left", 60);
		$(".newh6").css("margin-left", 80);
	});
	if ($("#anchorContent").text().trim() === "") {
		$(".anchorBlog").hide();
	}
	$("#anchorContentToggle").click(function () {
		var text = $(this).html();
		if (text == "目录[-]") {
			$(this).html("目录[+]");
			$(this).attr({ "title": "展开" });
		} else {
			$(this).html("目录[-]");
			$(this).attr({ "title": "收起" });
		}
		$("#anchorContent").toggle();
	});
	$(".anchor-link").click(function () {
		$("html,body").animate({ scrollTop: $($(this).attr("link")).offset().top }, 800);
	});
});
