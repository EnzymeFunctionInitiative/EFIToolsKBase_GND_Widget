

class UniRef {
    constructor(uniRefVersion = false, uniRefId = "") {
        this.version = uniRefVersion;
        this.uniRefId = uniRefId;
        console.log("UNIREF INIT: " + uniRefVersion + " " + uniRefId);
    }

    setVersion(version) {
        this.version = version;
    }
    getVersion() {
        return this.version;
    }
    getId() {
        return this.uniRefId;
    }
    hasUniRefQueryId() {
        return this.uniRefId ? true : false;
    }
    setSupportedVersion(version) {
        this.supportedVersion = version;
    }

    getTitleIdText() {
        if (this.version === false)
            return "";
        if (!this.uniRefId) {
            return "(UniRef" + this.version + " IDs)";
        } else {
            var urText = "", clusterText = "";
            if (this.version == 50) {
                urText = "UniRef90";
                clusterText = "UniRef50";
            } else if (this.version == 90) {
                urText = "UniProt";
                clusterText = "UniRef90";
            } else {
                return "";
            }
            return "(" + urText + " IDs in " + clusterText + " cluster ID " + this.uniRefId + ")";
        }
    }
    getShowUniRefUi() {
        if (this.uniRefId)
            return false;
        else
            return true;
    }

    getRequestParams() {
        var parms = {};
        var idType = this.version ? this.version : "uniprot";
        //var idTypeParm = idType ? "&id-type=" + idType : "";
        if (idType)
            parms["id-type"] = idType;
        if (this.uniRefId)
            //idTypeParm += "&uniref-id=" + this.uniRefId;
            parms["uniref-id"] = this.uniRefId;
        //return idTypeParm;
        return parms;
    }
    // When going down to the next level (e.g. UR50->UR90, UR90->UP), use this function
    updateLinkRequestParams(uniRefId, params) {
        var nextIdType = this.version == 50 ?
                            (this.uniRefId ? 90 : 50) :
                        (this.version == 90 ?
                            (this.uniRefId ? "" : 90) :
                            ""
                        );
        params.set("id-type", nextIdType);
        //var nextIdTypeParm = nextIdType ? "&id-type=" + nextIdType : "";
        if (nextIdType)
            params.set("uniref-id", uniRefId);
            //nextIdTypeParm += "&uniref-id=" + uniRefId;
        //return nextIdTypeParm;
    }
    showUniRefExpandButton(data) {
        var ur50sz = data.hasOwnProperty("uniref50_size") ? data.uniref50_size : 0;
        var ur90sz = data.hasOwnProperty("uniref90_size") ? data.uniref90_size : 0;
        var size = 0;
        if (this.version == 50) {
            size = this.uniRefId ? ur90sz : ur50sz;
        } else if (this.version == 90) {
            size = this.uniRefId ? 0 : ur90sz;
        }
        return size > 1;
    }
    showUniRefTitleInfo() {
        if (this.version === false || this.version < 50)
            return false;
        var showTitle = this.version == 50 ?
                            true :
                        (this.version == 90 ?
                            (this.uniRefId ? false : true) :
                            false
                        );
        return showTitle;
    }
    getUniRefSizeFieldInfo(data) {
        var ur50sz = data.hasOwnProperty("uniref50_size") ? data.uniref50_size : 0;
        var ur90sz = data.hasOwnProperty("uniref90_size") ? data.uniref90_size : 0;
        var info = {};
        if (this.version == 50) {
            if (this.uniRefId) {
                info.ValueFieldName = "UniProt";
                info.UniRefType = "UniRef90";
                info.UniRefSize = ur90sz;
            } else {
                info.ValueFieldName = "UniRef90";
                info.UniRefType = "UniRef50";
                info.UniRefSize = ur50sz;
            }
        } else if (this.version == 90) {
            if (this.uniRefId) {
                info.ValueFieldName = "";
                info.UniRefType = "";
                info.UniRefSize = 0;
            } else {
                info.ValueFieldName = "UniProt";
                info.UniRefType = "UniRef90";
                info.UniRefSize = ur90sz;
            }
        } else {
            info.ValueFieldName = "";
            info.UniRefType = "";
            info.UniRefSize = 0;
        }
        return info;
    }
}

