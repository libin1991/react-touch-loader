import React from 'react';
import './touch-loader.less';

const STATS = {
    init: '',
    pulling: 'pulling',
    enough: 'pulling enough',
    refreshing: 'refreshing',
    refreshed: 'refreshed',
    reset: 'reset',

    loading: 'loading'// loading more
};

// pull to refresh
// tap bottom to load more
export default React.createClass({
    getInitialState: function() {
        return {
            loaderState: STATS.init,
            pullHeight: 0,
            progressed: 0
        };
    },
    getDefaultProps: function () {
        return {
            distanceToRefresh: 60
        };
    },
    setInitialTouch: function(touch) {
        this._initialTouch = {
            clientY: touch.clientY
        };
    },
    calculateDistance: function (touch) {
        return touch.clientY - this._initialTouch.clientY;
    },
    // 拖拽的缓动公式 - easeOutSine
    easing: function (distance) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        var t = distance;
        var b = 0;
        var d = screen.availHeight; // 允许拖拽的最大距离
        var c = d / 2.5; // 提示标签最大有效拖拽距离

        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    },
    canRefresh: function() {
        return this.props.onRefresh && [STATS.refreshing, STATS.loading].indexOf(this.state.loaderState) < 0;
    },

    touchStart: function(e) {
        if(!this.canRefresh()) return;
        if(e.touches.length == 1) this._initialTouch = {
            clientY: e.touches[0].clientY,
            scrollTop: this.refs.panel.scrollTop
        };
    },
    touchMove: function(e) {
        if(!this.canRefresh()) return;
        var scrollTop = this.refs.panel.scrollTop;
        var distance = this.calculateDistance(e.touches[0]);

        if(distance > 0 && scrollTop <= 0){
            var pullDistance = distance - this._initialTouch.scrollTop;
            if(pullDistance < 0) {
                // 修复webview滚动过程中touchstart时计算panel.scrollTop不准
                pullDistance = 0;
                this._initialTouch.scrollTop = distance;
            }
            var pullHeight = this.easing(pullDistance);
            if(pullHeight) e.preventDefault();// 减弱滚动

            this.setState({
                loaderState: pullHeight > this.props.distanceToRefresh ? STATS.enough : STATS.pulling,
                pullHeight: pullHeight
            });
        }
    },
    touchEnd: function() {
        if(!this.canRefresh()) return;
        var endState = {
            loaderState: STATS.reset,
            pullHeight: 0
        };

        if (this.state.loaderState == STATS.enough) {
            // refreshing
            this.setState({
                loaderState: STATS.refreshing,
                pullHeight: 0
            });

            // trigger refresh action
            this.props.onRefresh(function(){
                // resove
                this.setState({
                    loaderState: STATS.refreshed,
                    pullHeight: 0
                });
            }.bind(this), function(){
                // reject
                this.setState(endState);// reset
            }.bind(this));
        }else this.setState(endState);// reset
    },

    loadMore: function(){
        this.setState({ loaderState:  STATS.loading });
        this.props.onLoadMore(function(){
            // resolve
            this.setState({loaderState: STATS.init});
        }.bind(this));
    },

    componentWillReceiveProps: function(nextProps) {
        if(nextProps.initializing < 2) this.setState({
            progressed: 0 // reset progress animation state
        });
    },
    animationEnd: function(){
        var newState = {};

        if(this.state.loaderState == STATS.refreshed) newState.loaderState = STATS.init;
        if(this.props.initializing > 1) newState.progressed = 1;

        this.setState(newState);
    },
    render: function(){
        const {
            className,
            hasMore,
            initializing
        } = this.props;
        let {
            loadMoreState,
            loaderState,
            pullHeight,
            progressed
        } = this.state;

        let footer = hasMore ? (
            <div className="tloader-footer">
                <p className="tloader-btn" onClick={this.loadMore}/>
                <p className="tloader-loading"><i className="ui-loading"/></p>
            </div>
        ) : null;

        var style = pullHeight ? {
            WebkitTransform: `translate3d(0,${pullHeight}px,0)`
        } : null;

        var progressClassName = '';
        if(!progressed){
            if(initializing > 0) progressClassName += ' tloader-progress';
            if(initializing > 1) progressClassName += ' ed';
        }

        return (
            <div ref="panel" className={'tloader state-' + loaderState + ' ' + className + progressClassName} onTouchStart={this.touchStart} onTouchMove={this.touchMove} onTouchEnd={this.touchEnd} onAnimationEnd={this.animationEnd}>
                <div className="tloader-symbol">
                    <p className="tloader-msg"><i/></p>
                    <p className="tloader-loading"><i className="ui-loading"/></p>
                </div>
                <div className="tloader-body" style={style}>{this.props.children}</div>
                {footer}
            </div>
        );
    }
});
