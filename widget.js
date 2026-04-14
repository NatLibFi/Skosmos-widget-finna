/* global Vue, vue-i18n */

const FINNA = {
  vueApp: null,
  createVueApp: function () {
    return Vue.createApp({
      data () {
        return {
          count: FINNA.cache.finnaResults.resultCount,
          finnalink: FINNA.generateQueryString(FINNA.helpers.getLabelString(FINNA.prefLabels)).replace('api.finna.fi/v1/search', 'finna.fi/Search/Results'),
          leftButtonDisabled: FINNA.recordOffset >= FINNA.helpers.recordsDisplayed() ? 0 : 1,
          rightButtonDisabled: FINNA.cache.moreRecordsReady() === false && FINNA.cache.moreRecordsInAPI() === false ? 1 : 0,
          lang: window.SKOSMOS.lang,
          types: FINNA.formatNames[window.SKOSMOS.lang],
          typeString: FINNA.formatNames[window.SKOSMOS.lang][FINNA.currentFormat],
          currentFormat: FINNA.currentFormat,
          showType: FINNA.currentFormat === 0 ? 1 : 0
        }
      },
      computed: {
        records () {
          if (FINNA.cache.finnaResults.records) {
            return FINNA.cache.finnaResults.records.slice(FINNA.recordOffset, FINNA.recordOffset + FINNA.helpers.recordsDisplayed())
          }
        },
        formatString () {
          return FINNA.formatNamePlurals[FINNA.currentFormat][window.SKOSMOS.lang]
        }
      },
      template: `
                <div class="panel-group" id="finna-widget" role="tablist" aria-multiselectable="true">
                  <div class="panel panel-default">
                    <div class="panel-heading" role="tab" id="finna-heading">
                      <div id="finna-buttons-wrapper">
                        <button class="accordion-button accordion" :type="records ? 'button' : null" :data-bs-toggle="records ? 'collapse' : null" data-bs-target="#finna-collapse" aria-expanded="false" aria-controls="collapseWiki">
                          <div>{{ $t('translation.recordsInFinna', { msg: formatString }) }} {{count}}</div>
                        </button>
                          <div class="btn-group dropup" id="finna-format-group">
                            <button class="btn btn-outline-secondary show" role="button" data-bs-toggle="dropdown" aria-expanded="false">{{typeString}}
                              <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <ul class="dropdown-menu">
                              <div >
                                <li v-for="(type, index) in types">
                                  <div @click="typeButton($event)" :id=index class="dropdown-item">{{type}}</div>
                                </li>
                              </div>
                            </ul>
                          </div>
                      </div>
                    </div>
                    <div id="finna-collapse" class="panel-collapse collapse" :class="{ 'show': records }" role="tabpanel" aria-labelledby="finna-heading">
                      <div class="panel-body">
                        <button @click="leftButton()" type="button" class="btn btn-light border-2 rounded-1" :class="{ 'btn-disabled': leftButtonDisabled }">
                          <i class="fa-solid fa-angle-left"></i>
                        </button>
                        <div class="row">
                          <div id="finna-record" v-for="record in records">
                            <div class="image-container">
                              <a :href="'https://www.finna.fi/Record/' + record.id" target="_blank">
                                <div id="finna-img-wrapper">
                                  <span :class="'fa-solid '+ record.iconizer"></span><img alt="" :src="getRecordSource(record)">
                                </div>
                              </a>
                            </div>
                            <a :href="'https://www.finna.fi/Record/' + record.id" target="_blank">
                              <span class="versal versal-bold" :title="shortTitle ? title : null">{{record.shortTitle ? record.shortTitle : record.title}}</span>
                            </a>
                            <span class="versal">{{record.owner}}</span>
                          </div>
                        </div>
                        <button @click="rightButton()" type="button" class="btn btn-light border-2 rounded-1" :class="{ 'btn-disabled': rightButtonDisabled }">
                          <i class="fa-solid fa-angle-right"></i>
                        </button>
                      </div>
                    </div>
                    <div id="finna-search">
                      <a class="versal-for-finna-search-link" :href=finnalink target="_blank">{{ $t('translation.resultListingInFinna') }}</a>
                    </div>
                  </div>
                </div>
                `,
      methods: {
        getRecordSource (record) {
          if (record.images.length > 0) {
            return 'https://finna.fi' + record.images[0] + '&w=126&h=126'
          }
        },
        leftButton () {
          // previous page button to the left
          if (FINNA.recordOffset >= FINNA.helpers.recordsDisplayed()) {
            FINNA.recordOffset -= FINNA.helpers.recordsDisplayed()
            FINNA.render(true)
          }
        },
        rightButton () {
          // next page button to the right
          if (FINNA.cache.moreRecordsReady()) {
            FINNA.recordOffset += FINNA.helpers.recordsDisplayed()
            FINNA.render(true)
            if (FINNA.cache.lessThanTwoPagesLeft() && FINNA.cache.moreRecordsInAPI()) {
              // querying more results in advance if there is two pages or less remaining
              FINNA.queryFinna(FINNA.cache.resultsFetched, FINNA.resultLimit)
            }
          }
        },
        typeButton (event) {
          FINNA.currentFormat = event.target.id
          const cookiePath = '/'
          const date = new Date()
          date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000) // 365 days from now
          document.cookie = 'FINNA_WIDGET_FORMAT=' + FINNA.currentFormat + '; expires=' + date.toGMTString() + '; path=' + cookiePath + '; SameSite=Lax'
          FINNA.cache.clear()
          FINNA.queryFinna(0, FINNA.resultLimit)
        }
      }

    })
  },
  prefLabels: null,
  recordOffset: 0,
  resultLimit: 10,
  currentFormat: 1,
  formats: ['', '~format:0/Image/', '~format:0/Book/', '~format:0/PhysicalObject/', 'format:0/Sound/', 'format:0/Journal/', 'format:0/MusicalScore/', 'format:0/Video/', 'format:0/Thesis/', 'format:0/WorkOfArt/', 'format:0/Place/', 'format:0/Other/', 'format:0/Document/', 'format:0/Map/'],
  formatNamePlurals: [{ fi: 'aineistoja (kaikki tyypit)', sv: 'material', en: 'items', se: 'materiálat (buot tiippat)' }, { fi: 'kuvia', sv: 'bilder', en: 'images', se: 'govat' }, { fi: 'kirjoja', sv: 'böcker', en: 'books', se: 'girjjit' }, { fi: 'esineitä', sv: 'föremål', en: 'physical objects', se: 'diŋggat' }, { fi: 'äänitteitä', sv: 'ljudupptagningar', en: 'sound recordings', se: 'jietnabáttit' }, { fi: 'lehtiä/artikkeleita', sv: 'tidskrifter och artiklar', en: 'journals and articles', se: 'aviissat/artihkkalat' }, { fi: 'nuotteja', sv: 'noter', en: 'musical scores', se: 'nuohtat' }, { fi: 'videoita', sv: 'video', en: 'videos', se: 'videot' }, { fi: 'opinnäytteitä', sv: 'examensarbeten', en: 'theses', se: 'oahppočájánasat' }],
  formatNames: { fi: ['Kaikki tyypit', 'Kuva', 'Kirja', 'Esine', 'Äänite', 'Lehti/Artikkeli', 'Nuotti', 'Video', 'Opinnäyte'], sv: ['Alla typer av material', 'Bild', 'Bok', 'Föremål', 'Ljudupptagning', 'Tidskrift/Artikel', 'Noter', 'Video', 'Examensarbete'], en: ['All types', 'Image', 'Book', 'Physical object', 'Sound recording', 'Article', 'Musical score', 'Video', 'Thesis'], se: ['Buot tiippat', 'Govva', 'Girji', 'Diŋga', 'Jietnabáddi', 'Aviisa/Artihkal', 'Nuohtta', 'Video', 'Oahppočájánas'] },
  translations: {
    fi: {
      translation: { recordsInFinna: 'Termillä kuvailtuja {msg} Finnassa', resultListingInFinna: 'Katso hakutulokset Finnassa' }
    },
    sv: {
      translation: { recordsInFinna: "@.capitalize:{'msg'} som beskrivits med termen i Finna", resultListingInFinna: 'Se alla sökresultat i Finna' },
      msg: '{msg}'
    },
    se: {
      translation: {
        recordsInFinna: 'Tearpmain govviduvvon {msg} Finnas',
        resultListingInFinna: 'Geahča ohcanbohtosiid Finnas'
      }
    },
    en: {
      translation: { recordsInFinna: "@.capitalize:{'msg'} indexed with the term in Finna", resultListingInFinna: 'See all the results in Finna' },
      msg: '{msg}'
    }
  },

  generateQueryString: function (terms, offset, limit) {
    const params = { lng: window.SKOSMOS.lang, type: 'AllFields', join: 'AND' }
    let lookfors = 'bool0[]=OR&'
    for (let i = 0; i < terms.length; i++) {
      lookfors += ('lookfor0[]=topic_facet' + encodeURIComponent(':' + terms[i]) + '&')
    }
    if (limit) {
      params.limit = limit
    }
    if (offset) {
      params.page = Math.floor((offset / 10) + 1)
    }
    if (FINNA.currentFormat === 1) {
      params.filter = ['online_boolean:1']
    }
    if (FINNA.currentFormat > 0) {
      params.filter = [FINNA.formats[FINNA.currentFormat]]
    }
    const urlParams = new URLSearchParams(params).toString()
    return 'https://api.finna.fi/v1/search?' + lookfors + urlParams
  },
  // Makes the queries to the Finna API.
  queryFinna: function (offset, limit, prefs) {
    if (prefs) {
      this.prefLabels = prefs
    }
    const terms = this.helpers.getLabelString(this.prefLabels)
    const url = this.generateQueryString(terms, offset, limit)
    fetch(url)
      .then(response => {
        return response.json()
      })
      .then(data => {
        if (data.records) {
          FINNA.cache.resultsFetched += data.records.length
          for (const i in data.records) {
            let record = data.records[i]
            record.iconizer = FINNA.helpers.formatToGlyphicon(record.formats)
            record.owner = FINNA.helpers.guessOwnerOfRecord(record)
            record = FINNA.helpers.shortenTitle(record)
            if (record.images[0] && record.images[0].indexOf('fullres')) {
              record.images[0] = record.images[0].replace('&fullres=1', '')
            }
            data.records[i].id = encodeURIComponent(data.records[i].id)
          }
        }
        FINNA.cache.add(data)
        const opened = (data.records !== undefined)
        if (offset === 0) {
          FINNA.render(opened)
        }
      })
  },

  // Cache for the query results to enable smooth paging action
  cache: {
    finnaResults: null,
    resultsFetched: 0,
    lessThanTwoPagesLeft: function () { return this.resultsFetched - FINNA.recordOffset <= 10 },
    moreRecordsInAPI: function () { return this.resultsFetched < this.finnaResults.resultCount },
    moreRecordsReady: function () { return (FINNA.recordOffset + FINNA.helpers.recordsDisplayed()) < FINNA.cache.resultsFetched },
    add: function (response) {
      if (!this.finnaResults || typeof this.finnaResults.records === 'undefined') {
        // If there are no records in the cache.
        this.finnaResults = response
      } else if (typeof response.records !== 'undefined') {
        // If there are already records in the cache appending the new records to that array.
        this.finnaResults.records = this.finnaResults.records.concat(response.records)
      }
    },
    // Clears the cached search results and offset settings when changing the content type.
    clear: function () {
      FINNA.recordOffset = 0
      this.resultsFetched = 0
      this.finnaResults = null
    }
  },

  render: function (isOpened) {
    const mountPoint = document.getElementById('finna-plugin')
    if (mountPoint) {
      if (this.vueApp) {
        this.vueApp.unmount()
      }
      mountPoint.remove()
    }
    const newMountPoint = document.createElement('div')
    newMountPoint.id = 'finna-plugin'
    document.getElementById('main-content-bottom-slot').appendChild(newMountPoint)
    const i18n = VueI18n.createI18n({
      locale: window.SKOSMOS.lang,
      messages: FINNA.translations
    })
    this.vueApp = this.createVueApp()
    this.vueApp.use(i18n)
    const cookies = document.cookie.split('; ')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i]
      const [key, value] = cookie.split('=')
      if (key === 'FINNA_WIDGET_FORMAT') {
        FINNA.currentFormat = decodeURIComponent(value)
      }
    }
    this.vueApp.mount('#finna-plugin')
  },
  // Helper functions for the widget
  helpers: {
    formatToGlyphicon: function (format) {
      const formatString = JSON.stringify(format)
      if (formatString.indexOf('0/Book/') !== -1) {
        return 'fa-book'
      }
      if (formatString.indexOf('0/Image/') !== -1) {
        return 'fa-camera'
      }
      if (formatString.indexOf('0/PhysicalObject/') !== -1) {
        return 'fa-wrench'
      }
      if (formatString.indexOf('0/Sound/') !== -1) {
        return 'fa-volume-high'
      }
      if (formatString.indexOf('0/Journal/') !== -1) {
        return 'fa-file-lines'
      }
      if (formatString.indexOf('0/MusicalScore/') !== -1) {
        return 'fa-music'
      }
      if (formatString.indexOf('0/Video/') !== -1) {
        return 'fa-film'
      }
      if (formatString.indexOf('0/Thesis/') !== -1) {
        return 'fa-book'
      }
      if (formatString.indexOf('0/WorkOfArt/') !== -1) {
        return 'fa-image'
      }
      if (formatString.indexOf('0/Place/') !== -1) {
        return 'fa-globe'
      }
      if (formatString.indexOf('0/Document/') !== -1) {
        return 'fa-folder-open'
      }
      return 'fa-asterisk'
    },
    getLabelString: function (prefLabels) {
      const labels = []
      for (const i in prefLabels) {
        labels.push(prefLabels[i].label)
        // giving the a higher weight in the query to the term in the users language
        if (prefLabels[i].lang === window.SKOSMOS.lang) {
          labels[i] += '^2'
        }
      }
      return labels
    },
    guessOwnerOfRecord: function (record) {
      const format = record.formats[0].value.split('/')[1]
      if ((format === 'Book' || format === 'Thesis') && typeof record.nonPresenterAuthors !== 'undefined' && record.nonPresenterAuthors[0]) {
        // limiting to first author since the space is super limited
        return record.nonPresenterAuthors[0].name
      }
      if (record.buildings) {
        return record.buildings[0].translated
      }
      return null
    },

    // Shortens the title field of the record to prevent the UI from blowing up.
    shortenTitle: function (record) {
      // only shortening titles longer than 65 chars
      if (record.title.length > 65) {
        record.shortTitle = record.title.substr(0, 60) + ' ...'
      }
      return record
    },

    // Returns an integer value of how many records to display in a page based on the viewport width.
    recordsDisplayed: function () {
      const viewWidth = window.innerWidth
      if (viewWidth < 500) {
        return 2
      } else if (viewWidth < 720) {
        return 3
      } else if (viewWidth < 1130) {
        return 4
      }
      return 5
    }

  }

}

document.addEventListener('DOMContentLoaded', function () {
  window.newFinnaSearch = function (data) {
    // Only activating the widget when on a concept page and there is a prefLabel.
    if (data.pageType !== 'concept' || data.prefLabels === undefined) {
      return
    }
    FINNA.cache.clear()

    const isOpen = 1
    if (isOpen) {
      FINNA.queryFinna(0, FINNA.resultLimit, data.prefLabels)
    } else {
      FINNA.queryFinna(0, 0, data.prefLabels)
    }
  }
})
