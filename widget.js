// declaring a namespace for the plugin
var FINNA = FINNA || {};

FINNA = {
    prefLabels: null,
    recordOffset: 0,
    resultLimit: 10,
    currentFormat: readCookie('FINNA_WIDGET_FORMAT') ? parseInt(readCookie('FINNA_WIDGET_FORMAT'), 10) : 1,
    translations: {'fi': {
                            "translation": { "recordsInFinna": "Termillä kuvailtuja {{- interpolation}} Finnassa", "resultListingInFinna": "Katso hakutulokset Finnassa" }
                         },
                   'sv': {
                            "translation": { "recordsInFinna": "{{- interpolation}} som beskrivits med termen i Finna", "resultListingInFinna": "Se alla sökresultat i Finna" }
                         },
                   'en': {
                            "translation": { "recordsInFinna": "{{- interpolation}} indexed with the term in Finna", "resultListingInFinna": "See all the results in Finna" }
                         }
                  },
    formats: ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/', 'format:0/Sound/', 'format:0/Journal/', 'format:0/MusicalScore/', 'format:0/Video/', 'format:0/Thesis/', 'format:0/WorkOfArt/', 'format:0/Place/', 'format:0/Other/', 'format:0/Document/', 'format:0/Map/'],
    formatNamePlurals: [{fi: 'aineistoja (kaikki tyypit)', sv: 'material', en: 'items'}, {fi: 'kuvia', sv: 'bilder', en: 'images'}, {fi: 'kirjoja', sv: 'böcker', en: 'books'}, {fi: 'esineitä', sv: 'föremål', en: 'physical objects'}, {fi: 'äänitteitä', sv: 'ljudspelningar', en: 'sound recordings'}, {fi: 'lehtiä/artikkeleita', sv: 'tidskriftar och artiklar', en: 'journals and articles'}, {fi: 'nuotteja', sv: 'noter', en: 'musical scores'}, {fi: 'videoita', sv: 'video', en: 'videos'}, {fi: 'opinnäytteitä', sv: 'examensarbeten', en: 'theses'}],
    formatNames: {fi: ['Kaikki tyypit', 'Kuva', 'Kirja', 'Esine', 'Äänite', 'Lehti/Artikkeli', 'Nuotti', 'Video', 'Opinnäyte'], sv: ['Alla typer av material', 'Bild', 'Bok', 'Föremål', 'Ljudupptagning', 'Tidskrift/Artikel','Noter', 'Video', 'Examensarbete'], en: ['All types', 'Image','Book','Physical object', 'Sound recording', 'Article', 'Musical score', 'Video', 'Thesis']},
    
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
            params.filter = [FINNA.formats[FINNA.currentFormat]];
        }
        return 'https://api.finna.fi/v1/search?' + lookfors + $.param(params) + '&callback=?';
    },

    // Makes the queries to the Finna API.
    queryFinna: function (offset, limit, prefs) {
        if (prefs) {
            this.prefLabels = prefs;
        }
        var terms = this.helpers.getLabelString(this.prefLabels);
        var url = this.generateQueryString(terms, offset, limit);
        $.getJSON(url, function(data) {
            if (data.records) {
                FINNA.cache.resultsFetched += data.records.length;
                for (var i in data.records) {
                    var record = data.records[i];
                    record.glyphicon = FINNA.helpers.formatToGlyphicon(record.formats);
                    record.owner = FINNA.helpers.guessOwnerOfRecord(record);
                    record = FINNA.helpers.shortenTitle(record);
                    if (record.images[0] && record.images[0].indexOf('fullres')) {
                        record.images[0] = record.images[0].replace('&fullres=1', '');
                    }
                    data.records[i].id = encodeURIComponent(data.records[i].id);
                }
            }
            FINNA.cache.add(data);
            var opened = (data.records !== undefined);
            if (offset === 0) {
                FINNA.widget.render(opened);
            }
        });
    },

    // Cache for the query results to enable smooth paging action
    cache: {
        finnaResults: null,
        resultsFetched: 0,
        lessThanTwoPagesLeft: function() { return this.resultsFetched - FINNA.recordOffset <= 10; },
        moreRecordsInAPI: function() { return this.resultsFetched < parseInt($('.count').html(),10); },
        moreRecordsReady: function() { return (FINNA.recordOffset + FINNA.helpers.recordsDisplayed()) < FINNA.cache.resultsFetched; },
        add: function(response) {
            if (!this.finnaResults || typeof this.finnaResults.records === 'undefined') {
                // If there are no records in the cache.
                this.finnaResults = response; 
            } else if (typeof response.records !== 'undefined') { 
                // If there are already records in the cache appending the new records to that array.
                this.finnaResults.records = this.finnaResults.records.concat(response.records);
            }
        },
        // Clears the cached search results and offset settings when changing the content type.
        clear: function() {
            FINNA.recordOffset = 0;
            this.resultsFetched = 0;
            this.finnaResults = null;
        },
    },

    widget: {
        addAccordionToggleEvents: function() {
                $('#headingFinna > a > .fa-regular').on('click', function() {
                    FINNA.widget.toggleAccordion();
                });
                $('#headingFinna > a.versal').on('click', function() {
                    FINNA.widget.toggleAccordion();
                });
            },
        
        addPagingButtons: function() {
            // previous page button to the left
            $('#collapseFinna > .panel-body > button:first').on('click', function() {
                if (FINNA.recordOffset >= FINNA.helpers.recordsDisplayed()) {
                    FINNA.recordOffset -= FINNA.helpers.recordsDisplayed();
                    FINNA.widget.render(true);
                }
                if (FINNA.recordOffset >= FINNA.helpers.recordsDisplayed()) {
                    $('#collapseFinna > .panel-body > button:first').removeClass('btn-disabled');
                }
            });

            // next page button to the right
            $('#collapseFinna > .panel-body > button:last').on('click', function() {
                if (FINNA.cache.moreRecordsReady()) {
                    FINNA.recordOffset += FINNA.helpers.recordsDisplayed();
                    FINNA.widget.render(true);
                    if (FINNA.cache.lessThanTwoPagesLeft() && FINNA.cache.moreRecordsInAPI())  { 
                        // querying more results in advance if there is two pages or less remaining
                        FINNA.queryFinna(FINNA.cache.resultsFetched, FINNA.resultLimit);
                    }
                    $('#collapseFinna > .panel-body > button:first').removeClass('btn-disabled');
                    if (FINNA.cache.moreRecordsReady() === false && FINNA.cache.moreRecordsInAPI() === false) {
                        $('#collapseFinna > .panel-body > button:last').addClass('btn-disabled');
                    }
                }
            });
        },

        // Flips the icon displayed on the top right corner of the widget header
        flipChevron: function() {
            var $glyph = $('#headingFinna > a > .fa-regular');
            if ($glyph.hasClass('local-chevron-down')) {
                if (FINNA.cache.finnaResults.records === undefined) {
                    FINNA.queryFinna(0, FINNA.resultLimit);
                }
                $glyph.removeClass('local-chevron-down').addClass('local-chevron-up');
                createCookie('FINNA_WIDGET_OPEN', 1);
            } else {
                $glyph.removeClass('local-chevron-up').addClass('local-chevron-down');
                createCookie('FINNA_WIDGET_OPEN', 0);
            }
        },

        render: function (isOpened) {
            // hiding the current state of the widget in the dom to avoid the page length jumping around
            var finnaUrl = FINNA.generateQueryString(FINNA.helpers.getLabelString(FINNA.prefLabels)).replace('api.finna.fi/v1/search', 'finna.fi/Search/Results');
            var context = {
                count: FINNA.cache.finnaResults.resultCount, 
                finnalink: finnaUrl, 
                opened: isOpened,
                formatString: FINNA.formatNamePlurals[FINNA.currentFormat][lang],
                noMoreResults: FINNA.cache.finnaResults.resultCount <= FINNA.helpers.recordsDisplayed() ? 1 : 0,
                lang: lang,
                types: FINNA.formatNames[lang], 
                typeString: FINNA.formatNames[lang][FINNA.currentFormat] 
            };
            // adding the records to the context object if the widget is to be rendered in it's opened state.
            if (isOpened) {
                context.records = FINNA.cache.finnaResults.records.slice(FINNA.recordOffset, FINNA.recordOffset + FINNA.helpers.recordsDisplayed());
                context.showType = FINNA.currentFormat === 0 ? 1 : 0;
            }
            if ($('#finna-widget').length > 0) {
                $('#finna-widget').replaceWith(Handlebars.compile($('#finna-template').html())(context));
            } else {
                $('.content').append(Handlebars.compile($('#finna-template').html())(context));
            }
            this.addPagingButtons();
            this.addAccordionToggleEvents();

            $('#headingFinna > .btn-group > .dropdown-menu > li > a').on('click', function() { 
                FINNA.currentFormat = $(this).parent().index();
                createCookie('FINNA_WIDGET_FORMAT', FINNA.currentFormat);
                FINNA.cache.clear();
                FINNA.queryFinna(0, FINNA.resultLimit);
            });
        },

        // Handles the collapsing and expanding actions of the widget.
        toggleAccordion: function() {
            $('#collapseFinna').collapse('toggle');
            // switching the glyphicon to indicate a change in the accordion state
            FINNA.widget.flipChevron();
        },
    },
    
    // Helper functions for the widget
    helpers: {
        formatToGlyphicon: function(format) {
            var formatString = JSON.stringify(format);
            if (formatString.indexOf("0/Book/") !== -1) {
                return 'fa-book';
            }
            if (formatString.indexOf("0/Image/") !== -1) {
                return 'fa-camera';
            }
            if (formatString.indexOf("0/PhysicalObject/") !== -1) {
                return 'fa-wrench';
            }
            if (formatString.indexOf("0/Sound/") !== -1) {
                return 'fa-volume-high';
            }
            if (formatString.indexOf("0/Journal/") !== -1) {
                return 'fa-file';
            }
            if (formatString.indexOf("0/MusicalScore/") !== -1) {
                return 'fa-music';
            }
            if (formatString.indexOf("0/Video/") !== -1) {
                return 'fa-film';
            }
            if (formatString.indexOf("0/Thesis/") !== -1) {
                return 'fa-book';
            }
            if (formatString.indexOf("0/WorkOfArt/") !== -1) {
                return 'fa-image';
            }
            if (formatString.indexOf("0/Place/") !== -1) {
                return 'fa-globe';
            }
            if (formatString.indexOf("0/Document/") !== -1) {
                return 'fa-folder-open';
            }
            return 'fa-asterisk';
        },

        getLabelString: function(prefLabels) {
            var labels = [];
            for (var i in prefLabels) {
                labels.push(prefLabels[i].label);
                // giving the a higher weight in the query to the term in the users language
                if (prefLabels[i].lang === lang) {
                    labels[i] += '^2';
                }
            }
            return labels;
        },

        guessOwnerOfRecord: function(record) {
            var format = record.formats[0].value.split('/')[1];
            if ((format === 'Book' || format === 'Thesis') && typeof record.nonPresenterAuthors !== 'undefined' && record.nonPresenterAuthors[0]) {
                // limiting to first author since the space is super limited
                return record.nonPresenterAuthors[0].name;
            }
            if (record.buildings) {
                return record.buildings[0].translated;
            }
            return null;
        },

        // Shortens the title field of the record to prevent the UI from blowing up.
        shortenTitle: function(record) {
            // only shortening titles longer than 65 chars
            if (record.title.length > 65) {
                record.shortTitle = record.title.substr(0, 60) + ' ...';
            }
            return record;
        },

        // Returns an integer value of how many records to display in a page based on the viewport width.
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

function tempLogger(itemToBeLogged) {
    window.console.log("* * * * * *");
    window.console.log(itemToBeLogged);
}

$(function() { 
    if (typeof window.i18next !== 'undefined') {
        window.i18next.init({"lng": lang, resources: FINNA.translations});
    }
    Handlebars.registerHelper('trans',function(str, variable){
        var translation = typeof window.i18next !== 'undefined' ? window.i18next.t(str, {interpolation: variable}) : str;
        return translation.charAt(0).toUpperCase() + translation.slice(1);
    });

    window.newFinnaSearch = function (data) {
        // Only activating the widget when on a concept page and there is a prefLabel.
        if (data.page !== 'page' || data.prefLabels === undefined) {
            return;
        }
        FINNA.cache.clear();
        var openCookie = readCookie('FINNA_WIDGET_OPEN');
        var isOpen = openCookie !== null ? parseInt(openCookie, 10) : 1;
        if (isOpen) {
            FINNA.queryFinna(0, FINNA.resultLimit, data.prefLabels);
        } else {
            FINNA.queryFinna(0, 0, data.prefLabels);
        }
    };
});
