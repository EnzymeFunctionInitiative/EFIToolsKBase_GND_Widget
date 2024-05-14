

// This class should be a singleton object.
// Not thread-safe.

const LOAD_ALL = 1;     // Load all of the diagrams in the input list or cluster
const LOAD_NEXT = 2;    // Load the next batch of data
const LOAD_RELOAD = 3;  // Reload what's present on the screen (scale factor/window change)


class GndController {
    constructor(msgRouter, gndDb, gndHttp, gndVars, gndView, gndFilter, bigscape, uniRefSupport) {
        this.Http = gndHttp;
        this.Vars = gndVars;
        this.Db = gndDb;
        this.View = gndView;
        this.Filter = gndFilter;
        this.getUrlFn = function(a,b){};
        this.initUrlFn = function(){};
        this.msgRouter = msgRouter;
        this.query = "";
        this.indexRange = [];
        this.useRange = true;
        this.maxIndex = 0;
        this.bigscape = bigscape;
        this.uniRefSupport = uniRefSupport;
        this.supportsUniRef = false;
        this.firstLoad = true;
        this.hasProtId = false;
        this.realtimeId = "";
        this.isRealtime = false;

        this.reset(false);
    }

    getGetUrl(start, end) {
        var data = this.getUrlFn(start, end);
        var paramsStr = "";
        for (var k in data.params) {
            if (paramsStr)
                paramsStr += "&";
            paramsStr += k + "=" + data.params[k];
        }
        
        var scriptUrl = data.url + "?" + paramsStr;
        return scriptUrl;
    }
    getMaxIndex() {
        return this.maxIndex;
    }
    getMaxViewIndex() {
        return this.View.getDiagramCount();
    }

    // The input to this function is the diagram index (e.g. the view).  This function computes
    // the actual arrow data index from the diagram index start and end.  This is used in
    // the HTTP request to optimize data retrieval.
    computeRange(start, end) {
        if (this.indexRange.length == 0)
            return 0;

        var ranges = [];

        var blockStart = 0;
        for (var bi = 0; bi < this.indexRange.length; bi++) {
            var block = this.indexRange[bi];
            var blockEnd = blockStart + (block[1] - block[0]);
            var sb = -1, eb = -1;
            if (start >= blockStart && start <= blockEnd)
                sb = block[0] + (start - blockStart);
            if (end >= blockStart && end <= blockEnd)
                eb = block[0] + (end - blockStart);
            if (start < blockStart && end > blockEnd) {
                sb = block[0];
                eb = block[1];
            }
            
            if (sb < 0 && eb >= 0)
                sb = block[0];
            if (sb >= 0 && eb < 0)
                eb = block[1];

            if (sb >= 0 && eb >= 0)
                ranges.push([sb, eb]);
            blockStart = blockEnd + 1;
        }

        return ranges;
    }

    serializeRange(ranges) {
        var str = "";
        for (var i = 0; i < ranges.length; i++) {
            if (str)
                str += ",";
            str += ranges[i][0] + "-" + ranges[i][1];
        }
        return str;
    }

    getScaleFactor() {
        return this.scaleFactor;
    }
    getScaleType() {
        return this.scaleType;
    }
    getWindow() {
        return this.window;
    }
    // Sets the window size and resets the scale type to window.  Refreshes the view.
    setWindow(value) {
        this.window = value;
        this.scaleType = SCALE_TYPE_WINDOW;
        this.reload();
    }
    // Updates the scale factor based on the zoom factor.  Refreshes the view.
    setZoom(zoomFactor) {
        this.scaleFactor = this.scaleFactor * zoomFactor;
        this.scaleType = SCALE_TYPE_FACTOR;
        this.reload();
    }

    // Called every time we load a cluster/put in a new set of inputs in the query box.
    onLoad(query) {

        //var queryEscaped = query.replace(/\n/g, " ").replace(/\r/g, " ");
        var queryEscaped = query.replace(/[^A-Za-z0-9\-, ]/g, " ");
        var authString = this.Vars.getAuthString();
        var authParams = this.Vars.getAuthParams();
        var scriptUrl = this.Vars.getUrlPath();
        var isSuperfamily = this.Vars.getSuperfamilySupport() === true;
        var bsParm = this.bigscape.getUseBigScape() ? true : false;

        var that = this;
        var getDataHttpParms = function(start, end) {
            var params = {};
            var win = that.getWindow();
            var sf = that.getScaleFactor();
            var scaleType = that.getScaleType();
            for (var k in authParams) {
                params[k] = authParams[k];
            }
            params["window"] = win;
            params["scale-factor"] = sf;
            if (that.useRange) {
                var ranges = that.computeRange(start, end);
                var rangeStr = that.serializeRange(ranges);
                params["range"] = rangeStr;
            } else {
                if (!isSuperfamily)
                    params["query"] = queryEscaped;
                params["sidx"] = start;
                params["eidx"] = start;
            }
            if (bsParm)
                params["bigscape"] = 1;
            if (that.isRealtime) {
                params["mode"] = "rt";
                params["rt_id"] = that.realtimeId;
            }
            if (!that.hasProtId) {
                var urParms = that.uniRefSupport.getRequestParams();
                for (var k in urParms) {
                    params[k] = urParms[k];
                }
            }
            return params;
        };
        var mkGetUrlFn = function(paramsFn, usePost = false) {
            return function (start, end) {
                var params = paramsFn(start, end);
                var method = usePost ? "POST" : "GET";
                return {method: method, params: params, url: scriptUrl};
            }
        };
        this.getUrlFn = mkGetUrlFn(getDataHttpParms);

        var getInitHttpParams = function() {
            var params = {};
            var win = that.getWindow();
            for (var k in authParams) {
                params[k] = authParams[k];
            }
            params["window"] = win;
            if (!isSuperfamily)
                params["query"] = queryEscaped;
            params["stats"] = 1;
            if (!that.hasProtId && (!that.firstLoad || that.uniRefSupport.hasUniRefQueryId())) {
                var urParms = that.uniRefSupport.getRequestParams();
                for (var k in urParms) {
                    params[k] = urParms[k];
                }
            }
            if (bsParm)
                params["bigscape"] = 1;
            return params;
        }; 
        this.initUrlFn = mkGetUrlFn(getInitHttpParams);

        var that = this;
        var handleInitRequest = function(jsonData) {
            if (jsonData !== null && jsonData.error === false && typeof jsonData.stats !== 'undefined' && typeof jsonData.stats.max_index !== 'undefined') {
                that.Http.initialize(jsonData.stats.max_index, that.getUrlFn);
                that.scaleFactor = jsonData.stats.scale_factor;
                that.View.setLegendScale(jsonData.stats.legend_scale);
                that.maxIndex = jsonData.stats.max_index;
                that.indexRange = jsonData.stats.index_range;
                that.supportsUniRef = jsonData.stats.has_uniref !== false ? jsonData.stats.has_uniref : false;
                var firstLoad = that.firstLoad;
                that.firstLoad = false;
                if (typeof jsonData.totaltime !== "undefined")
                    console.log("Init load duration: " + jsonData.totaltime);
                if (firstLoad && that.supportsUniRef !== false && !that.uniRefSupport.hasUniRefQueryId())
                    that.uniRefSupport.setVersion(that.supportsUniRef);
                if (typeof jsonData.rt !== "undefined") {
                    that.isRealtime = true;
                    that.realtimeId = jsonData.rt.rt_id;
                }
                
                var totalCount = jsonData.stats.max_index + 1; // zero-based index
                var payload = new Payload(); payload.MessageType = "InitDataRetrieved"; payload.Data = { TotalCount: totalCount, Error: false, SupportsUniRef: that.supportsUniRef, FirstLoad: firstLoad };
                that.msgRouter.sendMessage(payload);

                that.loadNext(); // Retrieve the first batch of arrows.
            } else {
                console.log("Invalid json data: ");
                console.log(jsonData);
                var payload = new Payload(); payload.MessageType = "InitDataRetrieved"; payload.Data = { TotalCount: 0, Error: true };
                that.msgRouter.sendMessage(payload);
            }
        };

        var payload = new Payload(); payload.MessageType = "DataRetrievalStatus"; payload.Data = { Retrieving: true, Message: "Retrieving initial data...", Initial: true };
        that.msgRouter.sendMessage(payload);

        this.Http.fetchInit(scriptUrl, this.initUrlFn, handleInitRequest);
    }

    search(query) {
        this.reset(true);
        this.query = query;
        // If the query contains a non numeric or non space character then assume it contains a protein ID
        this.hasProtId = this.query.match(/[^\d\s]/);
        this.View.setQueryHasProteinId(this.hasProtId);
        this.onLoad(this.query);
    }

    reloadForIdTypeChange() {
        this.reset(true);
        this.onLoad(this.query);
    }

    // Private
    // Reloads the view with the given sequences, (i.e. reset for zoom/window)
    reload() {
        if (this.maxIndex >= 0) {
            this.View.clearCanvas();
            this.doLoad(LOAD_RELOAD);
        }
    }

    loadAll() {
        this.doLoad(LOAD_ALL);
    }

    loadNext() {
        this.doLoad(LOAD_NEXT);
    }

    resetEverything() {
        this.reset(true);
    }
    // Private
    reset(fullReset) {
        this.scaleFactor = this.Vars.getDefaultScaleFactor();
        this.scaleType = this.Vars.getDefaultScaleType();
        this.window = this.Vars.getWindow();

        // fullReset = true if this isn't the first load of the app.
        if (fullReset) {
            this.Filter.reset();
            this.View.clearCanvas();
        }
    }

    // Private
    // Once an query is established, this can be called to retrieve more sequences.
    doLoad(loadAction) {
        var that = this;

        var pageSize = loadAction == LOAD_ALL ? -1 : this.Vars.getPageSize();

        // Handles one block of data from the server.
        var handleData = function(startIndex, endIndex, jsonData) {
            var drawables = that.Db.update(startIndex, endIndex, jsonData);
            var viewData = that.Db.getViewData(jsonData);
            that.View.addDiagrams(drawables, viewData);
            if (typeof jsonData.totaltime !== "undefined")
                console.log("Processing duration: " + jsonData.totaltime);
        };

        // After all data has been retrieved and drawn, this is called.
        var handleFinish = function() {
            that.View.finishDrawFetched();
            var diagramCount = that.View.getDiagramCount();
            var isEod = that.View.getEndOfData();
            var payload = new Payload(); payload.MessageType = "DataRetrievalStatus"; payload.Data = { Retrieving: false, DiagramCount: diagramCount, EndOfData: isEod };
            that.msgRouter.sendMessage(payload);
        };

//        var payload = new Payload(); payload.MessageType = "UpdateShowButtonStatus"; payload.Data = { Disabled: true };
//        this.msgRouter.sendMessage(payload);

        // This returns immediately, and retrieves asynchronously.
        if (loadAction == LOAD_NEXT || loadAction == LOAD_ALL)
            this.Http.fetchDiagrams(pageSize, handleData, handleFinish);
        else
            this.Http.reloadDiagrams(handleData, handleFinish);
    }
}

