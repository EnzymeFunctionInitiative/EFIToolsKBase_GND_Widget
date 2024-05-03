

// This code is not thread-safe.

class GndHttp {
    constructor(msgRouter) {
        this.msgRouter = msgRouter;
        this.initialize(-1, function(a,b){});
    }


    ///////////////////////////////////////////// PRIVATE /////////////////////////////////////////////
    makeDiagramHttpRequest(scriptUrl, handleData, startIndex, endIndex) {
        var params = this.scriptFn(startIndex, endIndex);
        this.performHttpRequest(scriptUrl, params, handleData);
    }

    performHttpRequest(scriptUrl, params, handleData) {
        var paramsStr = "";
        for (var k in params.params) {
            if (paramsStr)
                paramsStr += "&";
            paramsStr += k + "=" + params.params[k];
        }
        
        var isPost = typeof params.method !== "undefined" && params.method === "POST";
        // If the request is too long for GET, switch to POST even if the user requested GET
        if (paramsStr.length > 1800)
            isPost = true;
        var method = isPost ? "POST" : "GET";
        if (!isPost)
            scriptUrl += "?" + paramsStr;

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, scriptUrl, true);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.onload = function() {
            if (this.readyState == 4 && this.status == 200) {
                var data = null;
                var isError = false;
                try {
                    data = JSON.parse(this.responseText);
                } catch (e) {
                    isError = true;
                }
                handleData(data);
            }
        };
        console.log(paramsStr);
        xmlhttp.send(isPost ? paramsStr : null);
    }


    ///////////////////////////////////////////// PUBLIC //////////////////////////////////////////////
    initialize(maxIndex, getUrlFn) {
        this.diagramIndex = 0;
        this.maxIndex = maxIndex;
        this.scriptFn = getUrlFn;
    }

    // Call this initially to get the extent of the data.
    fetchInit(scriptUrl, initUrlFn, handleInitCb) {
        var params = initUrlFn();
        this.scriptUrl = scriptUrl;
        this.performHttpRequest(this.scriptUrl, params, handleInitCb);
    }

    // Call this to retrieve diagrams from the server.  It chunks the data to allow for more responsive
    // retrieval and drawing.
    fetchDiagrams(numDiagrams, handleData, onFinishCb) {
        this.doFetch(this.diagramIndex, numDiagrams, handleData, onFinishCb);
    }

    doFetch(startIndex, numDiagrams, handleData, onFinishCb) {
        var endIndex = startIndex + numDiagrams - 1;
        if (numDiagrams < 0 || endIndex > this.maxIndex) // load all
            endIndex = this.maxIndex;

        var chunkSize = 20;
        var chunkIndex = startIndex;

        var that = this;

        function batchRetrieve() {
            var endChunkIndex = chunkIndex + chunkSize - 1;
            if (endChunkIndex >= endIndex)
                endChunkIndex = endIndex;
            if (chunkIndex <= endIndex) {
                var onReceiveCb = function(data) {
                    if (data !== null)
                        handleData(chunkIndex, endChunkIndex, data);
                    else
                        handleData(chunkIndex, endChunkIndex, []);
                    chunkIndex = endChunkIndex + 1;
                    setTimeout(batchRetrieve, 1); // allows the UI to draw
                };
                //var xmlhttp = that.makeDiagramHttpRequest(onReceiveCb, chunkIndex, endChunkIndex);
                //xmlhttp.send(null);
                that.makeDiagramHttpRequest(that.scriptUrl, onReceiveCb, chunkIndex, endChunkIndex);
                
                var pct = Math.trunc(100 * (chunkIndex - startIndex) / (endIndex - startIndex));
                var payload = new Payload(); payload.MessageType = "DataRetrievalStatus"; payload.Data = { Retrieving: true, Message: "Retrieving diagrams...", PercentCompleted: pct};
                that.msgRouter.sendMessage(payload);
            } else {
                that.diagramIndex = endChunkIndex + 1;
                onFinishCb();
            }
        };

        var pct = 50;
        var payload = new Payload(); payload.MessageType = "DataRetrievalStatus"; payload.Data = { Retrieving: true, Message: "Retrieving diagrams...", PercentCompleted: 0};
        this.msgRouter.sendMessage(payload);
        batchRetrieve();
    }

    reloadDiagrams(handleData, onFinishCb) {
        this.doFetch(0, this.diagramIndex, handleData, onFinishCb);
    }
}


