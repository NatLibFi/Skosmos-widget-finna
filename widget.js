$(function() { 

    var finnaOffset = 0;
    var finnaResults;
    var finnaTerm;
    var resultLimit = 10;
    var resultsFetched = 0;
    var currentFormat = readCookie('FINNA_WIDGET_FORMAT') ? parseInt(readCookie('FINNA_WIDGET_FORMAT'), 10) : 1;
    var formats = ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/'];
    var formatName = [{fi: 'aineistoja (kaikki tyypit)', sv: '', en: 'records'}, {fi: 'kuva-aineistoja', sv: 'bild', en: 'image records'}, {fi: 'kirjoja', sv: 'böcker', en: 'books'}, {fi: 'esineitä'}];

    if (typeof uri !== 'undefined') { // Using this to detect when on a Skosmos concept/group page since the uri variable will be undefined otherwise.
        queryFinna(prefLabels[0].label, 0, 0);
    }

    function queryFinna(term, offset, limit) {
        finnaTerm = term;
        var params = {lookfor: term, limit: limit,filter: ['online_boolean:1', formats[currentFormat]], view: 'jsonp', type: 'Subject'};
        if (offset) {
            params.page = (offset / 5) + 1;
        }
        if (currentFormat === 0) { 
            params.filter = ['online_boolean:1'];
        }
        var url = 'https://api.finna.fi/v1/search?' + $.param(params) + '&callback=?';
        $.getJSON(url, function(data) {
            if (data.resultCnt === 0) { return; }
            if (data.records) {
                resultsFetched += data.records.length;
                for (var i in data.records) {
                    if (data.records[i].id.indexOf('urn:nbn') !== -1) {
                        // for some reason the urn containing id's need to be double encoded...
                        data.records[i].id = encodeURIComponent(data.records[i].id);
                    }
                }
            }
            if (!finnaResults || typeof finnaResults.records === 'undefined') {
                finnaResults = data; 
            } else { 
                // if there are already some records from previous searches appending the new results to that array
                finnaResults.records = finnaResults.records.concat(data.records);
            }
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
            $('#collapseFinna > .panel-body > .row > button:first').on('click', function() {
                if (finnaOffset >= 5) {
                    finnaOffset -= 5;
                    updateResults();
                }
            });
            $('#collapseFinna > .panel-body > .row > button:last').on('click', function() {
                if ((finnaOffset + 5) < parseInt($('.count').html(), 10) && (finnaOffset + 5) < resultsFetched) {
                    finnaOffset += 5;
                    updateResults();
                } else { // here we have reached the end of the current set of results
                    queryFinna(prefLabels[0].label, finnaOffset, resultLimit);
                }
            });
        } else {
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: prefLabels[0].label, count: finnaResults.resultCount, finnalink: finnaUrl, opened: isOpened, formatString: formatName[currentFormat][lang]}));
        }

        $('#headingFinna > a > .glyphicon').on('click', function() { 
            toggleAccordion();
        });
        $('#headingFinna > a').on('click', function() { 
            toggleAccordion();
        });
        $('#headingFinna > .btn-group > .dropdown-menu > li > a').on('click', function() { 
            currentFormat = $(this).parent().index();
            createCookie('FINNA_WIDGET_FORMAT', currentFormat);
            finnaOffset = 0;
            queryFinna(finnaTerm, 0, resultLimit);
        });
    }

    function toggleAccordion() {
        $('#collapseFinna').collapse('toggle');
        var $glyph = $('#headingFinna > a > .glyphicon');
        if ($glyph.hasClass('glyphicon-chevron-down')) {
            if (finnaResults.records === undefined) {
                queryFinna(prefLabels[0].label, 0, resultLimit);
            }
            $glyph.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
        } else {
            $glyph.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
        }
    }

});
