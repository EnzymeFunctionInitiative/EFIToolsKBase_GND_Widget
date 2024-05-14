

const SCALE_TYPE_WINDOW = 90;
const SCALE_TYPE_FACTOR = 91;
const DEFAULT_SCALE_FACTOR = 5;
const DEFAULT_WINDOW = 10;
const DEFAULT_PAGE_SIZE = 200;


class GndVars {
    constructor() {
        this.authString = "";
        this.authParams = {};
        this.urlPath = "";
        this.pageSize = DEFAULT_PAGE_SIZE;
        this.window = DEFAULT_WINDOW;
        this.hasSuperfamily = false;
    }


    getAuthParams() {
        return this.authParams;
    }
    getAuthString() {
        return this.authString;
    }
    setAuthString(value) {
        this.authString = value;
        var parts = value.split("&");
        for (var i = 0; i < parts.length; i++) {
            var args = parts[i].split("=");
            this.authParams[args[0]] = args[1];
        }
    }


    getUrlPath() {
        return this.urlPath;
    }
    setUrlPath(value) {
        this.urlPath = value;
    }


    getPageSize() {
        return this.pageSize;
    }
    setPageSize(value) {
        this.pageSize = value;
    }

    getWindow() {
        return this.window;
    }
    setWindow(value) {
        this.window = value;
    }


    getDefaultScaleType() {
        return SCALE_TYPE_WINDOW;
    }
    getDefaultScaleFactor() {
        return DEFAULT_SCALE_FACTOR;
    }


    setSuperfamilySupport(state) {
        this.hasSuperfamily = state;
    }
    getSuperfamilySupport() {
        return this.hasSuperfamily;
    }
}

