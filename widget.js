$(function() { 

    var finnaOffset = 0;
    var finnaResults;
    var finnaTerm;
    var resultLimit = 40;
    var currentFormat = readCookie('FINNA_WIDGET_FORMAT') ? readCookie('FINNA_WIDGET_FORMAT') : 1;
    var formats = ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/'];
    var formatName = [{fi: 'aineistoja (kaikki tyypit)', sv: '', en: 'records'}, {fi: 'kuva-aineistoja', sv: 'bild', en: 'image records'}, {fi: 'kirjoja', sv: 'böcker', en: 'books'}, {fi: 'esineitä'}];

    if (uri) { // Using this to detect when on a Skosmos concept/group page since the uri variable will be undefined otherwise.
        queryFinna(prefLabels[0].label, 0, 0);
    }

    function queryFinna(term, offset, limit) {
        finnaTerm = term;
        var params = {lookfor: term, limit: limit,filter: ['online_boolean:1', formats[currentFormat]], view: 'jsonp', type: 'Subject'};
        if (limit === 0 || currentFormat === 0) { 
            params.filter = '';
        }
        var url = 'https://api.finna.fi/v1/search?' + $.param(params) + '&callback=?';
        $.getJSON(url, function(data) {
            if (data.resultCnt === 0) { return; }
            console.log(data);
            finnaResults = data; 
            var opened = (data.records !== undefined);
            renderWidget(finnaTerm, opened);
        });
    }

    function updateResults() {
        $('.concept-widget').remove();
        renderWidget(finnaTerm, true);
    }

    function renderWidget(term, isOpened) {
        if (isOpened) {
            $('.concept-widget').remove();
            var finnaUrl = 'https://www.finna.fi/Search/Results?' + $.param({lookfor: term, filter: ['online_boolean:1'], type: 'Subject'});
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: prefLabels[0].label, count: finnaResults.resultCount, finnalink: finnaUrl, records: finnaResults.records.slice(finnaOffset, finnaOffset + 5), opened: isOpened, formatString: formatName[currentFormat][lang]}));
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
        } else {
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: prefLabels[0].label, count: finnaResults.resultCount, finnalink: finnaUrl, opened: isOpened, formatString: formatName[0][lang]}));
        }

        $('#headingOne > a > .glyphicon').on('click', function() { 
            $('#collapseOne').collapse('toggle');
            var $glyph = $(this);
            if ($glyph.hasClass('glyphicon-chevron-down')) {
                if (finnaResults.records === undefined) {
                    queryFinna(prefLabels[0].label, 0, resultLimit);
                }
                $glyph.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
            } else {
                $glyph.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
            }
        });
        $('#headingOne > .btn-group > .dropdown-menu > li > a').on('click', function() { 
            currentFormat = $(this).parent().index();
            createCookie('FINNA_WIDGET_FORMAT', currentFormat);
            finnaOffset = 0;
            queryFinna(finnaTerm, 0, resultLimit);
        });
    }

});
