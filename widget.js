var FinnaWidget = FinnaWidget || {};

FinnaWidget = {
    finnaOffset: 0,
    finnaResults: null,
    prefLabelFi: prefLabels[0].label,
    resultLimit: 10,
    resultsFetched: 0,
    currentFormat: readCookie('FINNA_WIDGET_FORMAT') ? parseInt(readCookie('FINNA_WIDGET_FORMAT'), 10) : 1,
    formats: ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/'],
    formatName: [{fi: 'aineistoja (kaikki tyypit)', sv: '', en: 'records'}, {fi: 'kuva-aineistoja', sv: 'bild', en: 'image records'}, {fi: 'kirjoja', sv: 'böcker', en: 'books'}, {fi: 'esineitä'}],


    updateResults: function () {
        $('.concept-widget').remove();
        FinnaWidget.renderWidget(FinnaWidget.prefLabelFi, true);
    },

    queryFinna: function (term, offset, limit) {
        var params = {lookfor: term, limit: limit,filter: ['online_boolean:1', FinnaWidget.formats[FinnaWidget.currentFormat]], view: 'jsonp', type: 'Subject'};
        if (offset) {
            params.page = (offset / 5) + 1;
        }
        if (FinnaWidget.currentFormat === 0) { 
            params.filter = ['online_boolean:1'];
        }
        var url = 'https://api.finna.fi/v1/search?' + $.param(params) + '&callback=?';
        $.getJSON(url, function(data) {
            if (data.resultCnt === 0) { return; }
            if (data.records) {
                FinnaWidget.resultsFetched += data.records.length;
                for (var i in data.records) {
                    if (data.records[i].id.indexOf('urn:nbn') !== -1) {
                        // for some reason the urn containing id's need to be double encoded...
                        data.records[i].id = encodeURIComponent(data.records[i].id);
                    }
                }
            }
            if (!FinnaWidget.finnaResults || typeof FinnaWidget.finnaResults.records === 'undefined') {
                FinnaWidget.finnaResults = data; 
            } else { 
                // if there are already some records from previous searches appending the new results to that array
                FinnaWidget.finnaResults.records = FinnaWidget.finnaResults.records.concat(data.records);
            }
            var opened = (data.records !== undefined);
            FinnaWidget.renderWidget(FinnaWidget.prefLabelFi, opened);
        });
    },

    clearCachedResults: function() {
        FinnaWidget.finnaOffset = 0;
        FinnaWidget.resultsFetched = 0;
        FinnaWidget.finnaResults = null;
    },

    renderWidget: function (term, isOpened) {
        if (isOpened) {
            $('.concept-widget').remove();
            var finnaUrl = 'https://www.finna.fi/Search/Results?' + $.param({lookfor: term, filter: ['online_boolean:1'], type: 'Subject'});
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: FinnaWidget.prefLabelFi, count: FinnaWidget.finnaResults.resultCount, finnalink: finnaUrl, records: FinnaWidget.finnaResults.records.slice(FinnaWidget.finnaOffset, FinnaWidget.finnaOffset + 5), opened: isOpened, formatString: FinnaWidget.formatName[FinnaWidget.currentFormat][lang]}));
            $('#collapseFinna > .panel-body > .row > button:first').on('click', function() {
                if (FinnaWidget.finnaOffset >= 5) {
                    FinnaWidget.finnaOffset -= 5;
                    FinnaWidget.updateResults();
                }
            });
            $('#collapseFinna > .panel-body > .row > button:last').on('click', function() {
                if ((FinnaWidget.finnaOffset + 5) < parseInt($('.count').html(), 10) && (FinnaWidget.finnaOffset + 5) < FinnaWidget.resultsFetched) {
                    FinnaWidget.finnaOffset += 5;
                    FinnaWidget.updateResults();
                } else { // here we have reached the end of the current set of results
                    FinnaWidget.queryFinna(FinnaWidget.prefLabelFi, FinnaWidget.finnaOffset, FinnaWidget.resultLimit);
                }
            });
        } else {
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: FinnaWidget.prefLabelFi, count: FinnaWidget.finnaResults.resultCount, finnalink: FinnaWidget.finnaUrl, opened: isOpened, formatString: FinnaWidget.formatName[FinnaWidget.currentFormat][lang]}));
        }

        $('#headingFinna > a > .glyphicon').on('click', function() { 
            FinnaWidget.toggleAccordion();
        });
        $('#headingFinna > a.versal').on('click', function() { 
            FinnaWidget.toggleAccordion();
        });
        $('#headingFinna > .btn-group > .dropdown-menu > li > a').on('click', function() { 
            FinnaWidget.currentFormat = $(this).parent().index();
            createCookie('FINNA_WIDGET_FORMAT', FinnaWidget.currentFormat);
            FinnaWidget.clearCachedResults();
            FinnaWidget.queryFinna(FinnaWidget.prefLabelFi, 0, FinnaWidget.resultLimit);
        });
    },

    toggleAccordion: function() {
        $('#collapseFinna').collapse('toggle');
        var $glyph = $('#headingFinna > a > .glyphicon');
        if ($glyph.hasClass('glyphicon-chevron-down')) {
            if (FinnaWidget.finnaResults.records === undefined) {
                FinnaWidget.queryFinna(FinnaWidget.prefLabelFi, 0, FinnaWidget.resultLimit);
            }
            $glyph.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
        } else {
            $glyph.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
        }
    }
};

$(function() { 

if (typeof uri !== 'undefined') { // Using this to detect when on a Skosmos concept/group page since the uri variable will be undefined otherwise.
   FinnaWidget.queryFinna(prefLabels[0].label, 0, 0);
}
});
