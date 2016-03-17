// declaring a namespace for the plugin
var FINNA = FINNA || {};

    //Asiakirja
    //Esine
    //Kartta 
    //Kirja 
    //Kuva 
    //Lehti/Artikkeli 
    //Muu
    //Nuotti
    //Opinnäyte
    //Paikka
    //Taideteos
    //Video
    //Äänite 

FINNA = {
    finnaOffset: 0,
    finnaResults: null,
    prefLabelFi: prefLabels[0].label,
    resultLimit: 10,
    resultsFetched: 0,
    imgCache: {},
    currentFormat: readCookie('FINNA_WIDGET_FORMAT') ? parseInt(readCookie('FINNA_WIDGET_FORMAT'), 10) : 1,
    formats: ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/', 'format:0/Sound/', 'format:0/Journal/', 'format:0/MusicalScore/', 'format:0/Video/', 'format:0/Thesis/', 'format:0/WorkOfArt/', 'format:0/Place/', 'format:0/Other/', 'format:0/Document/', 'format:0/Map/'],
    formatNamePlurals: [{fi: 'aineistoja (kaikki tyypit)', sv: '', en: 'records'}, {fi: 'kuvia', sv: 'bild', en: 'image records'}, {fi: 'kirjoja', sv: 'böcker', en: 'books'}, {fi: 'esineitä'}, {fi: 'äänitteitä', sv: '', en: ''}, {fi: 'lehtiä/artikkeleita', sv: '', en: ''}, {fi: 'nuotteja', sv: '', en: ''}, {fi: 'videoita', sv: '', en: ''}, {fi: 'opinnäytteitä', sv: '', en: ''}],
    formatNames: [{fi: 'Kaikki tyypit', sv: '', en: ''}, {fi: 'Kuva', sv: 'bild', en: 'image records'}, {fi: 'Kirja', sv: 'böcker', en: 'books'}, {fi: 'Esine'}, {fi: 'Äänite', sv: '', en: ''}, {fi: 'Lehti/Artikkeli', sv: '', en: ''}, {fi: 'Nuotti', sv: '', en: ''}, {fi: 'Video', sv: '', en: ''}, {fi: 'Opinnäyte', sv: '', en: ''}],


    updateResults: function () {
        $('.concept-widget').remove();
        FINNA.renderWidget(FINNA.prefLabelFi, true);
    },

    queryFinna: function (term, offset, limit) {
        var params = {lookfor: term, limit: limit,filter: ['online_boolean:1', FINNA.formats[FINNA.currentFormat]], view: 'jsonp', type: 'Subject'};
        if (offset) {
            params.page = Math.floor((offset / 10) + 1);
        }
        if (FINNA.currentFormat === 0) { 
            params.filter = ['online_boolean:1'];
        }
        var url = 'https://api.finna.fi/v1/search?' + $.param(params) + '&callback=?';
        $.getJSON(url, function(data) {
            if (data.records) {
                FINNA.resultsFetched += data.records.length;
                for (var i in data.records) {
                    data.records[i].glyphicon = FINNA.formatToGlyphicon(data.records[i].formats);
                    if (data.records[i].id.indexOf('urn:nbn') !== -1) {
                        // for some reason the urn containing id's need to be double encoded...
                        data.records[i].id = encodeURIComponent(data.records[i].id);
                    }
                }
            }
            if (!FINNA.finnaResults || typeof FINNA.finnaResults.records === 'undefined') {
                FINNA.finnaResults = data; 
            } else if (typeof data.records !== 'undefined') { 
                // if there are already some records from previous searches appending the new results to that array
                FINNA.finnaResults.records = FINNA.finnaResults.records.concat(data.records);
            }
            var opened = (data.records !== undefined);
            if (offset === 0) {
                FINNA.renderWidget(FINNA.prefLabelFi, opened);
            }
        });
    },

    clearCachedResults: function() {
        FINNA.finnaOffset = 0;
        FINNA.resultsFetched = 0;
        FINNA.finnaResults = null;
    },

    formatToGlyphicon: function(format) {
        var formatString = JSON.stringify(format);
        if (formatString.indexOf("0/Book/") !== -1) {
            return 'glyphicon-book'; 
        }
        if (formatString.indexOf("0/Image/") !== -1) {
            return 'glyphicon-camera'; 
        }
        if (formatString.indexOf("0/PhysicalObject/") !== -1) {
            return 'glyphicon-wrench'; 
        }
        if (formatString.indexOf("0/Sound/") !== -1) {
            return 'glyphicon-volume-up'; 
        }
        if (formatString.indexOf("0/Journal/") !== -1) {
            return 'glyphicon-file'; 
        }
        if (formatString.indexOf("0/MusicalScore/") !== -1) {
            return 'glyphicon-music'; 
        }
        if (formatString.indexOf("0/Video/") !== -1) {
            return 'glyphicon-film'; 
        }
        if (formatString.indexOf("0/Thesis/") !== -1) {
            return 'glyphicon-book'; 
        }
        if (formatString.indexOf("0/WorkOfArt/") !== -1) {
            return 'glyphicon-picture'; 
        }
        if (formatString.indexOf("0/Place/") !== -1) {
            return 'glyphicon-globe'; 
        }
        if (formatString.indexOf("0/Document/") !== -1) {
            return 'glyphicon-folder-open'; 
        }
        return 'glyphicon-asterisk'; 
    },

    renderWidget: function (term, isOpened) {
        if (isOpened) {
            $('.concept-widget').remove();
            var finnaUrl = 'https://www.finna.fi/Search/Results?' + $.param({lookfor: term, filter: ['online_boolean:1'], type: 'Subject'});
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: FINNA.prefLabelFi, count: FINNA.finnaResults.resultCount, finnalink: finnaUrl, records: FINNA.finnaResults.records.slice(FINNA.finnaOffset, FINNA.finnaOffset + 5), opened: isOpened, formatString: FINNA.formatNamePlurals[FINNA.currentFormat][lang], types: FINNA.formatNames}));
            $('#collapseFinna > .panel-body > .row > button:first').on('click', function() {
                if (FINNA.finnaOffset >= 5) {
                    FINNA.finnaOffset -= 5;
                    FINNA.updateResults();
                }
            });
            $('#collapseFinna > .panel-body > .row > button:last').on('click', function() {
                if ((FINNA.finnaOffset + 5) <= parseInt($('.count').html(), 10) && (FINNA.finnaOffset + 5) < FINNA.resultsFetched) {
                    FINNA.finnaOffset += 5;
                    FINNA.updateResults();
                    if (FINNA.resultsFetched - FINNA.finnaOffset <= 10 && FINNA.resultsFetched < parseInt($('.count').html()))  { 
                        // querying more results in advance if there is two pages or less remaining
                        FINNA.queryFinna(FINNA.prefLabelFi, FINNA.resultsFetched, FINNA.resultLimit);
                    }
                }
            });
        } else {
            $('.concept-widget').remove();
            $('.content').append(Handlebars.compile($('#finna-template').html())({label: FINNA.prefLabelFi, count: FINNA.finnaResults.resultCount, finnalink: FINNA.finnaUrl, opened: isOpened, formatString: FINNA.formatNamePlurals[FINNA.currentFormat][lang], types: FINNA.formatNames}));
        }

        $('#headingFinna > a > .glyphicon').on('click', function() { 
            FINNA.toggleAccordion();
        });
        $('#headingFinna > a.versal').on('click', function() { 
            FINNA.toggleAccordion();
        });
        $('#headingFinna > .btn-group > .dropdown-menu > li > a').on('click', function() { 
            FINNA.currentFormat = $(this).parent().index();
            createCookie('FINNA_WIDGET_FORMAT', FINNA.currentFormat);
            FINNA.clearCachedResults();
            FINNA.queryFinna(FINNA.prefLabelFi, 0, FINNA.resultLimit);
        });
    },

    toggleAccordion: function() {
        $('#collapseFinna').collapse('toggle');
        var $glyph = $('#headingFinna > a > .glyphicon');
        if ($glyph.hasClass('glyphicon-chevron-down')) {
            if (FINNA.finnaResults.records === undefined) {
                FINNA.queryFinna(FINNA.prefLabelFi, 0, FINNA.resultLimit);
            }
            $glyph.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
        } else {
            $glyph.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
        }
    },

};

$(function() { 

if (typeof uri !== 'undefined') { // Using this to detect when on a Skosmos concept/group page since the uri variable will be undefined otherwise.
   FINNA.queryFinna(prefLabels[0].label, 0, 0);
}
});
