// declaring a namespace for the plugin
var FINNA = FINNA || {};

FINNA = {
    finnaOffset: 0,
    finnaResults: null,
    prefLabels: prefLabels,
    resultLimit: 10,
    resultsFetched: 0,
    currentFormat: readCookie('FINNA_WIDGET_FORMAT') ? parseInt(readCookie('FINNA_WIDGET_FORMAT'), 10) : 1,
    translations: {'fi': {
                            "translation": { "recordsInFinna": "Termillä kuvailtuja {{interpolation}} Finnassa", "resultListingInFinna": "Katso hakutulokset Finnassa" }
                         },
                   'sv': {
                            "translation": { "recordsInFinna": "{{interpolation}} beskrivad med termen i Finna", "resultListingInFinna": "Se alla sökresultat i Finna" }
                         },
                   'en': {
                            "translation": { "recordsInFinna": "{{interpolation}} records indexed with the term in Finna", "resultListingInFinna": "See all the results in Finna" }
                         }
                  },
    formats: ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/', 'format:0/Sound/', 'format:0/Journal/', 'format:0/MusicalScore/', 'format:0/Video/', 'format:0/Thesis/', 'format:0/WorkOfArt/', 'format:0/Place/', 'format:0/Other/', 'format:0/Document/', 'format:0/Map/'],
    formatNamePlurals: [{fi: 'aineistoja (kaikki tyypit)', sv: '', en: 'records'}, {fi: 'kuvia', sv: 'bilder', en: 'images'}, {fi: 'kirjoja', sv: 'böcker', en: 'books'}, {fi: 'esineitä', sv: 'föremål', en: 'physical objects'}, {fi: 'äänitteitä', sv: 'ljudspelningar', en: 'sound recordings'}, {fi: 'lehtiä/artikkeleita', sv: 'tidskriftar och artiklar', en: 'journals and articles'}, {fi: 'nuotteja', sv: 'noter', en: 'musical scores'}, {fi: 'videoita', sv: 'video', en: 'videos'}, {fi: 'opinnäytteitä', sv: 'examensarbeten', en: 'theses'}],
    formatNames: [{fi: 'Kaikki tyypit', sv: 'Allar typer av material', en: ''}, {fi: 'Kuva', sv: 'Bild', en: 'image records'}, {fi: 'Kirja', sv: 'Bok', en: 'books'}, {fi: 'Esine', sv: 'Föremål'}, {fi: 'Äänite', sv: 'Ljudupptagning', en: ''}, {fi: 'Lehti/Artikkeli', sv: 'Tidskrift/Artikel', en: ''}, {fi: 'Nuotti', sv: 'Noter', en: ''}, {fi: 'Video', sv: 'Video', en: ''}, {fi: 'Opinnäyte', sv: 'Examensarbete', en: ''}],
    
    generateQueryString: function(terms, offset, limit) {
        var params = {lng: lang, limit: limit, type: 'AllFields', join: 'AND'};
        var lookfors = 'bool0[]=OR&';
        for (var i = 0; i < terms.length; i++) {
            lookfors += ('lookfor0[]=topic_facet' + encodeURIComponent(':' + terms[i]) + '&'); 
        }
        if (offset) {
            params.page = Math.floor((offset / 10) + 1);
        }
        if (FINNA.currentFormat === 1) { 
            params.filter = ['online_boolean:1'];
        }
        if (FINNA.currentFormat > 0) {
            params.filter = ['online_boolean:1', FINNA.formats[FINNA.currentFormat]];
        }
        return 'https://api.finna.fi/v1/search?' + lookfors + $.param(params) + '&callback=?';
    },

    // Makes the queries to the Finna API.
    queryFinna: function (terms, offset, limit) {
        var url = FINNA.generateQueryString(terms, offset, limit);
        $.getJSON(url, function(data) {
            if (data.records) {
                FINNA.resultsFetched += data.records.length;
                for (var i in data.records) {
                    var record = data.records[i];
                    record.glyphicon = FINNA.helpers.formatToGlyphicon(record.formats);
                    record.owner = FINNA.helpers.guessOwnerOfRecord(record);
                    record = FINNA.helpers.shortenTitle(record);
                    data.records[i].id = encodeURIComponent(data.records[i].id);
                }
            }
            if (!FINNA.finnaResults || typeof FINNA.finnaResults.records === 'undefined') {
                // If there are no records in the cache.
                FINNA.finnaResults = data; 
            } else if (typeof data.records !== 'undefined') { 
                // If there are already records in the cache appending the new records to that array.
                FINNA.finnaResults.records = FINNA.finnaResults.records.concat(data.records);
            }
            var opened = (data.records !== undefined);
            if (offset === 0) {
                FINNA.renderWidget(opened);
            }
        });
    },

    // Clears the cached search results and offset settings when changing the content type.
    clearCachedResults: function() {
        FINNA.finnaOffset = 0;
        FINNA.resultsFetched = 0;
        FINNA.finnaResults = null;
    },

    renderWidget: function (isOpened) {
        var $previous = $('.concept-widget').css('visibility', 'hidden');
        if (isOpened) {
            var finnaUrl = FINNA.generateQueryString(FINNA.prefLabels);
            $('.content').append(Handlebars.compile($('#finna-template').html())({count: FINNA.finnaResults.resultCount, finnalink: finnaUrl, records: FINNA.finnaResults.records.slice(FINNA.finnaOffset, FINNA.finnaOffset + FINNA.helpers.recordsDisplayed()), opened: isOpened, formatString: FINNA.formatNamePlurals[FINNA.currentFormat][lang], types: FINNA.formatNames, typeString: FINNA.formatNames[FINNA.currentFormat][lang] }));
            $previous.remove();
            $('#collapseFinna > .panel-body > button:first').on('click', function() {
                if (FINNA.finnaOffset >= FINNA.helpers.recordsDisplayed()) {
                    FINNA.finnaOffset -= FINNA.helpers.recordsDisplayed();
                    FINNA.renderWidget(true);
                }
            });
            $('#collapseFinna > .panel-body > button:last').on('click', function() {
                if ((FINNA.finnaOffset + FINNA.helpers.recordsDisplayed()) <= parseInt($('.count').html(), 10) && (FINNA.finnaOffset + FINNA.helpers.recordsDisplayed()) < FINNA.resultsFetched) {
                    FINNA.finnaOffset += FINNA.helpers.recordsDisplayed();
                    FINNA.renderWidget(true);
                    if (FINNA.resultsFetched - FINNA.finnaOffset <= 10 && FINNA.resultsFetched < parseInt($('.count').html(),10))  { 
                        // querying more results in advance if there is two pages or less remaining
                        FINNA.queryFinna(FINNA.helpers.getLabels(), FINNA.resultsFetched, FINNA.resultLimit);
                    }
                }
            });
        } else {
            $('.content').append(Handlebars.compile($('#finna-template').html())({count: FINNA.finnaResults.resultCount, finnalink: FINNA.finnaUrl, opened: isOpened, formatString: FINNA.formatNamePlurals[FINNA.currentFormat][lang], types: FINNA.formatNames, typeString: FINNA.formatNames[FINNA.currentFormat][lang] }));
            $previous.remove();
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
            FINNA.queryFinna(FINNA.helpers.getLabels(), 0, FINNA.resultLimit);
        });
    },

    // Handles the collapsing and expanding actions of the widget.
    toggleAccordion: function() {
        $('#collapseFinna').collapse('toggle');
        var $glyph = $('#headingFinna > a > .glyphicon');
        // switching the glyphicon to indicate a change in the accordion state
        if ($glyph.hasClass('glyphicon-chevron-down')) {
            if (FINNA.finnaResults.records === undefined) {
                FINNA.queryFinna(FINNA.helpers.getLabels(), 0, FINNA.resultLimit);
            }
            $glyph.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
        } else {
            $glyph.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
        }
    },
    
    helpers: {
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

        getLabels: function() {
            var labels = [];
            for (var i in FINNA.prefLabels) {
                labels.push(FINNA.prefLabels[i].label);
                // giving the a higher weight in the query to the term in the users language
                if (FINNA.prefLabels[i].lang === lang) {
                    labels[i] += '^2';
                }
            }
            return labels;
        },

        guessOwnerOfRecord: function(record) {
            var format = record.formats[0].value.split('/')[1];
            if ((format === 'Book' || format === 'Thesis') && typeof record.nonPresenterAuthors !== 'undefined') {
                // limiting to first author since the space is super limited
                return record.nonPresenterAuthors[0].name;
            }
            return record.buildings[0].translated;
        },

        // Shortens the title field of the record to prevent the UI from blowing up.
        shortenTitle: function(record) {
            // only shortening titles longer than 65 chars
            if (record.title.length > 65) {
                record.shortTitle = record.title.substr(0, 60) + ' ...';
            }
            return record;
        },

        recordsDisplayed: function() { 
            var viewWidth = $(window).width(); 
            if (viewWidth < 500) {
                return 2;
            } else if (viewWidth < 720) {
                return 3;
            } else if(viewWidth < 1130) {
                return 4;
            }
            return 5;
        },
    },

};

$(function() { 
    /**
     * Using uri variable passed through in the php-code to detect when on 
     * a Skosmos concept/group page since it will be undefined otherwise.
     **/
    if (typeof uri !== 'undefined') { 
        window.i18next.init({"lng": lang, resources: FINNA.translations});
        Handlebars.registerHelper('trans',function(str, variable){
            var translation = typeof window.i18next !== 'undefined' ? window.i18next.t(str, {interpolation: variable}) : str;
            return translation.charAt(0).toUpperCase() + translation.slice(1);
        });
        // when we have a URI it's then desired to invoke the plugin
        FINNA.queryFinna(FINNA.helpers.getLabels(), 0, 0);
    }
});
