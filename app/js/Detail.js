'use strict';

const React = require('react');
const xhr = require('xhr');
const constants = require('./constants');
const tidyTitle = require('./tidyTitle');
const getFeatureByInciWebId = require('./getFeatureByInciWebId');
const bbox = require('@turf/bbox');
const isSmallScreen = require('./isSmallScreen');
const formatDate = require('./formatDate');
const Timeline = require('./Timeline');

const proxyApiEndpoint = 'https://bojokx59pd.execute-api.us-east-1.amazonaws.com/wildfires/perimeter';

const Detail = React.createClass({
  propTypes: {
    firePoint: React.PropTypes.object.isRequired,
    map: React.PropTypes.object.isRequired,
    onClose: React.PropTypes.func.isRequired,
  },

  getInitialState() {
    return {
      perimeterCollection: null,
      timelineEnabled: false,
      showingTimeline: false,
      showingNews: false,
      headerSize: null,
    };
  },

  componentWillMount() {
    const firePoint = this.props.firePoint;

    this.inciwebid = firePoint.properties.inciwebid;

    if (firePoint.properties.perimeterExtent) {
      this.perimeterExtent = JSON.parse(firePoint.properties.perimeterExtent);
    } else {
      const perimeters = getFeatureByInciWebId.perimeters(this.inciwebid, this.props.map);
      this.perimeterExtent = perimeters[0] && bbox(perimeters[0]);
    }
  },

  componentDidMount() {
    zoomToExtent(this.props.map, this.perimeterExtent || bbox(this.props.firePoint), { restrictZoom: true });
    this.showActivePerimeters();

    this.setState({ headerSize: this.headerEl.clientHeight });

    const firePointProperties = this.props.firePoint.properties;
    if (firePointProperties.perimeterExtent && firePointProperties.gisacres && firePointProperties.gisacres > 10000) {
      this.setState({ timelineEnabled: true });
      const url = `${proxyApiEndpoint}/${this.inciwebid}`;
      xhr(url, (err, response, body) => {
        if (err) throw err;
        const perimeterCollection = JSON.parse(body);
        if (!this.el) return;
        const isBadResponse = !perimeterCollection || !perimeterCollection.features;
        if (isBadResponse) {
          /* eslint-disable no-console */
          console.error('Bad perimeter collection:');
          console.error(body);
          /* eslint-enable */
        }
        if (isBadResponse || perimeterCollection.features.length <= 1) {
          this.setState({ timelineEnabled: false });
        } else {
          this.setState({ perimeterCollection });
        }
      });
    }

    this.el.focus();
  },

  componentWillUnmount() {
    this.hideActivePerimeters();
  },

  zoomToPerimeter(options) {
    zoomToExtent(this.props.map, this.perimeterExtent, options);
  },

  toggleTimeline() {
    if (!this.state.perimeterCollection) return;
    const willShow = !this.state.showingTimeline;
    if (willShow) {
      this.hideActivePerimeters();
      this.zoomToPerimeter();
    } else {
      this.showActivePerimeters();
      this.zoomToPerimeter({ restrictZoom: true });
    }
    const nextState = { showingTimeline: willShow };
    if (willShow) nextState.showingNews = false;
    this.setState(nextState);
  },

  hideActivePerimeters() {
    this.props.map.setLayoutProperty(constants.LAYER_FIRE_PERIMETERS_ACTIVE, 'visibility', 'none');
    this.props.map.setLayoutProperty(constants.LAYER_FIRE_PERIMETER_LINES_ACTIVE, 'visibility', 'none');
  },

  showActivePerimeters() {
    const inciwebid = this.props.firePoint.properties.inciwebid;
    const perimetersFilter = ['all', ['==', 'inciwebid', inciwebid]];
    this.props.map.setFilter(constants.LAYER_FIRE_PERIMETERS_ACTIVE, perimetersFilter);
    this.props.map.setFilter(constants.LAYER_FIRE_PERIMETER_LINES_ACTIVE, perimetersFilter);
    this.props.map.setLayoutProperty(constants.LAYER_FIRE_PERIMETERS_ACTIVE, 'visibility', 'visible');
    this.props.map.setLayoutProperty(constants.LAYER_FIRE_PERIMETER_LINES_ACTIVE, 'visibility', 'visible');
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.props.onClose();
    }
  },

  toggleNews() {
    const willShow = !this.state.showingNews;
    const nextState = { showingNews: willShow };
    if (willShow) nextState.showingTimeline = false;
    this.setState(nextState);
  },

  render() {
    const firePoint = this.props.firePoint;

    const burnedArea = (firePoint.properties.gisacres === 0) ? null : (
      <div className='detail-details small'>
        <span className='quiet'>Burned area:</span> {firePoint.properties.gisacres} acres
      </div>
    );

    const hideNonNewsButtons = isSmallScreen() && this.state.showingNews;
    const hideNonTimelineButtons = isSmallScreen() && this.state.showingTimeline;

    let zoomToPerimeterButton = null;
    if (!hideNonNewsButtons && !hideNonTimelineButtons && this.perimeterExtent) {
      zoomToPerimeterButton = (
        <a className='zoom-button button button-fire space-top1 icon crosshair short'
          onClick={this.zoomToPerimeter}>
          Zoom to perimeter
        </a>
      );
    }

    let newsButton = null;
    if (!hideNonTimelineButtons && isSmallScreen()) {
      let classes = 'news-button button button-fire space-top1 icon short';
      let text;
      if (this.state.showingNews) {
        classes += ' prev';
        text = 'Close news';
      } else {
        classes += ' rss';
        text = 'News';
      }
      newsButton = (
        <a className={classes}
          onClick={this.toggleNews}>
          {text}
        </a>
      );
    }

    let timelineButton = null;
    if (!hideNonNewsButtons && this.state.timelineEnabled) {
      let classes = 'timeline-button button button-fire space-top1 short icon';
      let text;
      if (this.state.showingTimeline) {
        classes += ' prev';
        text = 'Close timeline';
      } else if (this.state.perimeterCollection) {
        classes += ' layers button-fire-power ';
        text = 'Timeline';
      } else {
        classes += ' minus disabled';
        text = 'Checking ...';
      }

      timelineButton = (
        <a className={classes}
          onClick={this.toggleTimeline}>
          {text}
        </a>
      );
    }

    let latest = null;
    if (firePoint.properties.description) {
      latest = (
        <div className='space-bottom1'>
          <div className='strong'>
            Latest Information
          </div>
          <div className='micro'>
            Updated: {formatDate(firePoint.properties.published)}
          </div>
          <div className='detail-content-text space-top1'>
            {firePoint.properties.description}
          </div>
        </div>
      );
    }

    let feed = null;
    if (firePoint.properties.articles)  {
      const articles = JSON.parse(firePoint.properties.articles).map((article, i) => {
        // Remove the occasional total duplicate
        if (article.description === firePoint.properties.description) return null;
        return (
          <div key={i} className='pad1y keyline-top'>
            <a href={article.link} target='_blank'
              className='strong block'>
              {article.title}
            </a>
            <div className='micro'>
              {formatDate(article.pubDate)}
            </div>
            <div className='detail-content-text space-top1'>
              {article.description}
            </div>
            <a href={article.link} target='_blank'
              className='text-right strong block'>
              More <span className='icon next' />
            </a>
          </div>
        );
      });

      if (articles.length > 0) {
        feed = (
          <div>
            <div className='strong space-top2 space-bottom1'>
              Reports
            </div>
            {articles}
          </div>
        );
      }
    }

    let news = null;
    if (!isSmallScreen() || this.state.showingNews) {
      if (latest || feed) {
        // 80 = header height with no other buttons
        // 120 = misc other things and padding
        const maxHeight = window.innerHeight - 80 - 120;
        news = (
          <div style={{ maxHeight }}>
            {latest}
            {feed}
          </div>
        );
      } else {
        news = (
          <em className="small">
            Click below to learn about this fire on InciWeb.
          </em>
        );
      }
    }

    let body = null;
    if (this.state.headerSize && this.state.showingTimeline) {
      body = (
        <Timeline perimeterCollection={this.state.perimeterCollection}
          map={this.props.map} />
      );
    } else if (news) {
      body = news;
    }
    if (body) {
      body = (
        <div style={{ top: this.state.headerSize }}
          className='detail-content keyline-all scroll-styled pad1 small'>
          {body}
        </div>
      );
    }

    let footer = null;
    if (!hideNonTimelineButtons) {
      footer = (
        <div className='detail-footer pad2x pad1y clearfix'>
          <a href={firePoint.properties.url} target='_blank'
            className='detail-link button button-fire rcon next short fr'>
            Learn more on InciWeb
          </a>
        </div>
      );
    }

    return (
      <div ref={(el) => this.el = el}
        tabIndex={-1}
        onKeyDown={this.handleKeyDown}>
        <div className='detail-header pad2 clearfix'
          ref={(el) => this.headerEl = el}>
          <a className='detail-close icon close button button-fire short fr'
            onClick={() => this.props.onClose()} />
          <div className='detail-header-text'>
            <h3>
              {tidyTitle(firePoint.properties.title)}
            </h3>
            {burnedArea}
          </div>
          <div className='clearfix'>
            {newsButton}
            {zoomToPerimeterButton}
            {timelineButton}
          </div>
        </div>

        {body}

        {footer}
      </div>
    );
  },
});

function zoomToExtent(map, extent, options) {
  const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
  const zoomOptions = {
    offset: (isSmallScreen) ? [0, 100] : [-175, 0],
    padding: (isSmallScreen) ? 10 : 40,
  };
  if (options && options.restrictZoom) {
    zoomOptions.maxZoom = 9;
  }
  map.fitBounds(extent, zoomOptions);
}

module.exports = Detail;
