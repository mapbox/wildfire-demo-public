'use strict';

const React = require('react');
const constants = require('./constants');
const formatDate = require('./formatDate');
const isSmallScreen = require('./isSmallScreen');

const OUTLINE_ID = 'perimeterOutlines';
const SELECTED_ID = 'perimeterSelected';

const outlineLayer = {
  id: OUTLINE_ID,
  type: 'line',
  source: OUTLINE_ID,
  interactive: true,
  paint: {
    'line-color': 'hsl(0, 94%, 47%)',
    'line-dasharray': [2, 4],
  },
};

const selectedLayer = {
  id: SELECTED_ID,
  type: 'fill',
  source: SELECTED_ID,
  interactive: true,
  paint: {
    'fill-color': 'hsl(0, 94%, 47%)',
    'fill-opacity': 0.65,
    'fill-outline-color': 'hsl(0, 94%, 47%)',
  },
};

const Timeline = React.createClass({
  propTypes: {
    map: React.PropTypes.object.isRequired,
    perimeterCollection: React.PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      selectedPerimeter: null,
      autoPlaying: false,
    };
  },

  componentWillMount() {
    this.features = this.props.perimeterCollection.features;
    this.features.sort((a, b) => {
      return a.properties.perimeterdatetime - b.properties.perimeterdatetime;
    });
  },

  componentDidMount() {
    const map = this.props.map;
    const collection = this.props.perimeterCollection;

    map.addSource(OUTLINE_ID, {
      type: 'geojson',
      data: collection,
    });
    map.addSource(SELECTED_ID, {
      type: 'geojson',
      data: Object.assign({}, collection, { features: [] }),
    });
    map.addLayer(outlineLayer, constants.LAYER_FIRE_PERIMETERS);
    map.addLayer(selectedLayer, OUTLINE_ID);

    map.setLayoutProperty(constants.LAYER_FIRE_POINTS, 'visibility', 'none');

    this.selectPerimeter(this.props.perimeterCollection.features[0]);
  },

  componentDidUpdate() {
    this.setFocus();
  },

  componentWillUnmount() {
    window.clearTimeout(this.autoPlayTimeout);
    const map = this.props.map;
    map.setLayoutProperty(constants.LAYER_FIRE_POINTS, 'visibility', 'visible');

    try {
      // Don't break if this stuff doesn't exist
      map.removeLayer(OUTLINE_ID);
      map.removeLayer(SELECTED_ID);
      map.removeSource(OUTLINE_ID);
      map.removeSource(SELECTED_ID);
    } catch (e) {} // eslint-disable-line
  },

  setFocus() {
    if (this.selectedEl) this.selectedEl.focus();
  },

  handleKeyDown(e) {
    const perimeters = this.props.perimeterCollection.features;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextPerimeterIndex = perimeters.indexOf(this.state.selectedPerimeter) + 1;
      const nextPerimeter = perimeters[nextPerimeterIndex];
      if (nextPerimeter) this.selectPerimeter(nextPerimeter);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const priorPerimeterIndex = perimeters.indexOf(this.state.selectedPerimeter) - 1;
      const priorPerimeter = perimeters[priorPerimeterIndex];
      if (priorPerimeter) this.selectPerimeter(priorPerimeter);
    }
  },

  selectPerimeter(perimeter, continueAutoPlay) {
    continueAutoPlay = continueAutoPlay || false;
    const map = this.props.map;
    map.removeSource(SELECTED_ID);
    map.addSource(SELECTED_ID, {
      type: 'geojson',
      data: Object.assign({}, this.props.perimeterCollection, {
        features: [perimeter],
      }),
    });

    if (!continueAutoPlay) {
      this.stopAutoPlay();
    }

    this.setState({
      selectedPerimeter: perimeter,
      autoPlaying: continueAutoPlay,
    });
  },

  selectPerimeterByIndex(index, continueAutoPlay) {
    this.selectPerimeter(this.props.perimeterCollection.features[index], continueAutoPlay);
  },

  autoPlay() {
    if (this.state.autoPlaying) return this.stopAutoPlay();
    this.setState({ autoPlaying: true }, () => {
      this.selectPerimeter(this.props.perimeterCollection.features[0], true);
      this.autoPlayIncrement();
    });
  },

  stopAutoPlay(callback) {
    window.clearTimeout(this.autoPlayTimeout);
    this.setState({ autoPlaying: false }, callback);
  },

  autoPlayIncrement() {
    if (!this.state.autoPlaying) return;
    this.autoPlayTimeout = setTimeout(() => {
      if (!this.el) return;
      const features = this.props.perimeterCollection.features;
      const nextTargetIndex = features.indexOf(this.state.selectedPerimeter) + 1;
      if (nextTargetIndex !== features.length) {
        this.selectPerimeterByIndex(nextTargetIndex, true);
        this.autoPlayIncrement();
      } else {
        this.stopAutoPlay();
      }
    }, 500);
  },

  getControls() {
    const perimeter = this.state.selectedPerimeter;
    if (!perimeter) return null;
    const date = formatDate(perimeter.properties.perimeterdatetime).replace(/^\w+\s/, '');
    const selectedIndex = this.props.perimeterCollection.features.indexOf(perimeter);
    const lastIndex = this.props.perimeterCollection.features.length - 1;
    const lastIsSelected =  selectedIndex === lastIndex;
    const firstIsSelected =  selectedIndex === 0;

    const perimeterInfo = (
      <div className='center strong'>
         {date}
      </div>
    );

    const restartButton = (
      <a className='button button-fire short icon refresh'
        onClick={() => this.selectPerimeterByIndex(0)}/>
    );

    let prevClasses = 'button short icon prev';
    const prevTargetIndex = (firstIsSelected) ? lastIndex : selectedIndex - 1;
    let prevHandler = () => this.selectPerimeterByIndex(prevTargetIndex);
    if (firstIsSelected) {
      prevClasses += ' disabled';
      prevHandler = null;
    } else {
      prevClasses += ' button-fire';
    }
    const prevButton = (
      <a className={prevClasses}
        onClick={prevHandler} />
    );

    let nextClasses = 'button short icon next';
    const nextTargetIndex = (lastIsSelected) ? 0 : selectedIndex + 1;
    let nextHandler = () => this.selectPerimeterByIndex(nextTargetIndex);
    if (lastIsSelected) {
      nextClasses += ' disabled';
      nextHandler = null;
    } else {
      nextClasses += ' button-fire';
    }
    const nextButton = (
      <a className={nextClasses}
        onClick={nextHandler} />
    );

    let playClasses = 'button button-fire button-fire-special-icon short';
    if (this.state.autoPlaying) playClasses += ' close';
    if (!this.state.autoPlaying) playClasses += ' time';
    const playButtonIcon = (this.state.autoPlaying)
      ? (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 6H8c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>)
      : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.396 18.433C13.036 15.86 17 12 17 12l-6.604-6.433C10.033 5.217 9.543 5 9 5c-1.104 0-2 .896-2 2v10c0 1.104.896 2 2 2 .543 0 1.033-.218 1.396-.567z"/></svg>);
    const playButton = (
      <a className={playClasses}
        onClick={this.autoPlay}>
        {playButtonIcon}
      </a>
    );

    return (
      <div className='timeline-controls contain'>
        <div className='timeline-controls-info'>
          {perimeterInfo}
        </div>
        <div className='clearfix'>
          <div className='pin-topleft'>
            {restartButton}
          </div>
          <div className='pin-topleft space-left4'>
            {prevButton}
          </div>
          <div className='pin-topright space-right4'>
            {nextButton}
          </div>
          <div className='pin-topright'>
            {playButton}
          </div>
        </div>
      </div>
    );
  },

  render() {
    const controls = this.getControls();

    if (isSmallScreen()) {
      return (
        <div ref={(el) => this.el = el}>
          {controls}
        </div>
      );
    }

    const perimeters = this.props.perimeterCollection.features.map((perimeter, i) => {
      const isSelected = perimeter === this.state.selectedPerimeter;
      const date = formatDate(perimeter.properties.perimeterdatetime).replace(/^\w+\s/, '');
      const display = <span>{date}: {perimeter.properties.gisacres} acres</span>;
      let classes = 'col12 button short';
      if (!isSelected) {
        classes += ' quiet';
      } else {
        classes += ' button-fire';
      }
      const ref = (el) => {
        if (isSelected) this.selectedEl = el;
      };
      return (
        <a key={i} className={classes}
          ref={ref}
          onClick={() => this.selectPerimeter(perimeter)}>
          {display}
        </a>
      );
    });

    return (
      <div ref={(el) => this.el = el}>
        {controls}
        <div onKeyDown={this.handleKeyDown}
          className='timeline-items scroll-styled pill'>
          {perimeters}
        </div>
      </div>
    );
  },
});

module.exports = Timeline;
