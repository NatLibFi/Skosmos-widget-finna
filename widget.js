$(function() { 

    var finnaOffset = 0;
    var finnaResults;
    var finnaTerm;
    var resultLimit = 20;

    if (uri) { // Using this to detect when on a Skosmos concept/group page since the uri variable will be undefined otherwise.
        queryFinna(prefLabels[0].label, 0);
    }

    function queryFinna(term, offset) {
        finnaTerm = term;
        var params = {lookfor: term, limit: resultLimit,filter: ['usage_rights_str_mv:"usage_C"', 'online_boolean:1', '~format:0/Image/', '~format:0/PhysicalObject/'], view: 'jsonp', type: 'Subject'};
        var url = 'https://api.finna.fi/v1/search?' + $.param(params) + '&callback=?';
        $.getJSON(url, function(data) {
            if (data.resultCnt === 0) { return; }
            finnaResults = data; 
            renderWidget(finnaTerm, false);
        });
    }

    function updateResults() {
        $('.concept-widget').remove();
        renderWidget(finnaTerm, true);
    }

    function renderWidget(term, isOpened) {
        var finnaUrl = 'https://www.finna.fi/Search/Results?' + $.param({lookfor: term, filter: ['usage_rights_str_mv:"usage_C"', 'online_boolean:1'], type: 'Subject'});
        $('.content').append(Handlebars.compile($('#finna-template').html())({label: prefLabels[0].label, count: finnaResults.resultCount, finnalink: finnaUrl, records: finnaResults.records.slice(finnaOffset, finnaOffset + 5), opened: isOpened}));
        $('#collapseOne > .panel-body > .row > button:first').on('click', function() {
            if (finnaOffset >= 5) {
                finnaOffset -= 5;
                updateResults();
            }
        });
        $('#collapseOne > .panel-body > .row > button:last').on('click', function() {
            if ((finnaOffset + 5) < parseInt($('.count').html(), 10) && (finnaOffset + 5) < resultLimit) {
                finnaOffset += 5;
                updateResults();
            }
        });

        $('#headingOne').on('click', function() { 
            var $glyph = $(this).children().children('.glyphicon');
            if ($glyph.hasClass('glyphicon-chevron-down')) {
                $glyph.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
            } else {
                $glyph.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
            }
        });
    }

});
