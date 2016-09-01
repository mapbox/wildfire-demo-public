'use strict';

const React = require('react');
const isSmallScreen = require('./isSmallScreen');

const Intro = React.createClass({
  propTypes: {
    onClose: React.PropTypes.func.isRequired,
  },

  render() {
    if (window.location.href.split('?')[1] && window.location.href.split('?')[1].indexOf('nointro') !== -1) {
      return null;
    }

    const useSmallImgs = isSmallScreen();
    const infoSrc = (useSmallImgs) ? 'img/info-small.png' : 'img/info.png';
    const timelineSrc = (useSmallImgs) ? 'img/timeline-small.png' : 'img/timeline.png';
    return (
      <div className='intro-backdrop scroll-styled'>
        <div className='intro round pad2'>
          <a className='fr icon close'
            onClick={this.props.onClose} />
          <div className='pad2x'>
            <h2 className='space-bottom1'>
              U.S. Wildfires on&nbsp;InciWeb
            </h2>
            <div className='intro-body small'>
              <p>
                This map displays data about recent and ongoing U.S. wildfires. The data is updated regularly from a feed on <a href='http://inciweb.nwcg.gov/' target='blank'>InciWeb</a>, supplemented with fire perimeter data from <a href='http://www.geomac.gov/services.shtml' target='_blank'>the Geospatial Multi-Agency Coordination</a>. Both sources are interagency government websites that publish real-time information about U.S. wildfires.
              </p>
              <div className='intro-grid clearfix space-bottom1'>
                <div className='intro-grid-item col4 pad1'>
                  <img src='img/dots.png' />
                  <div className='space-top1'>
                    The radius of each fire's dot corresponds to its largest known perimeter. Click a dot to learn more about the fire.
                  </div>
                </div>
                <div className='intro-grid-item col4 pad1'>
                  <img src={infoSrc} />
                  <div className='space-top1'>
                    You can read the latest updates and articles about each fire from the interagency website InciWeb.
                  </div>
                </div>
                <div className='intro-grid-item col4 pad1'>
                  <img src={timelineSrc} />
                  <div className='space-top1'>
                    For fires that have burned over 10,000 acres, check out the Timeline to see how that fire's perimeter has changed over time.
                  </div>
                </div>
              </div>
            </div>
            <div className='intro-footer center space-top4'>
              <a className='button button-fire-power'
                onClick={this.props.onClose}>
                Continue
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  },
});

module.exports = Intro;
