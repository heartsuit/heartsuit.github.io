$(function() {
    // progress bar
    var getMax = function() { return $(document).height() - $(window).height(); }
    var getValue = function() { return $(window).scrollTop(); }
    var getWidth = function() {
        value = getValue();
        width = (value / max) * 100;
        width = width + '%';
        return width;
    }
    var setWidth = function() { progressBar.css({ width: getWidth() }); }
    var progressBar = $('.progress-bar')
    var max = getMax();
    var value;
    var width;
    $(document).on('scroll', setWidth);
    $(window).on('resize', function() {
        max = getMax();
        setWidth();
    });
});
