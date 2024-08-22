

const ZOOM_FACTOR_OUT_LARGE = 0.25;
const ZOOM_FACTOR_OUT_SMALL = 0.88888888888888888;
const ZOOM_FACTOR_IN_SMALL = 1.125;
const ZOOM_FACTOR_IN_LARGE = 4;


function checkBrowserSupport() {
    //TODO: do check for class support
    var supported = (navigator.userAgent.search("Chrome") >= 0 ||
                         navigator.userAgent.search("Firefox") >= 0 ||
                         (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0)) &&
                        navigator.userAgent.search("Edge") < 0;

    if (supported) {
        $("#save-canvas-button").show();
        $("#save-canvas-as-png-button").show();
    } else {
        $("#save-canvas-button").hide();
        $("#save-canvas-as-png-button").hide();
    }
    return supported;
}



class GndUi {
    constructor(msgRouter, controller, uiFilter, gndVars, uniRefSupport) {
        this.msgRouter = msgRouter;
        this.XT = controller;
        this.uiFilter = uiFilter;
        this.gndVars = gndVars;

        this.filterAnnoToggleId = "";
        this.filterAnnoToggleLabelId = "";
        this.diagramCountId = "";
        this.diagramTotalId = "";
        this.loaderMessageId = "";
        this.progressBarId = "";
        this.searchPanelId = "";
        this.uniRefContainerId = "";
        this.uniRefIds = {};
        this.uniRefSupport = uniRefSupport;
        this.hasProtId = false;
        this.windowValueId = "";

        this.msgRouter.addListener(this);
    }

    onMessage(payload) {
//        if (payload.MessageType == "UpdateShowButtonStatus") {
//            console.log("Update " + payload.Data.Disabled);
//            if (payload.Data.Disabled) {
//                this.showMoreBtn.prop("disabled", "true").addClass("disabled");
//                this.showAllBtn.prop("disabled", "true").addClass("disabled");
//            } else {
//                this.showMoreBtn.prop("disabled", "false").removeClass("disabled");
//                this.showAllBtn.prop("disabled", "false").removeClass("disabled");
//            }
//        } else
        if (payload.MessageType == "DataRetrievalStatus") {
            this.errorLoader.addClass("hidden-placeholder");
            if (payload.Data.Retrieving) {  // Called at start of retrieval
                this.progressLoader.removeClass("hidden-placeholder");
                if (!payload.Data.Initial) {
                    this.updateProgressBar(payload.Data.PercentCompleted);
                    $(this.loaderMessageId).hide();
                } else {
                    $(this.loaderMessageId).text(payload.Data.Message).show();
                }
                $(".zoom-btn").attr("disabled", true).addClass("disabled");
                this.showMoreBtn.attr("disabled", "true").addClass("disabled");
                this.showAllBtn.attr("disabled", "true").addClass("disabled");
                $(this.uniRefContainerId + " label").attr("disabled", true);
                $(this.uniRefContainerId).addClass("disabled");
            } else {
                $(this.loaderMessageId).hide();
                this.progressLoader.addClass("hidden-placeholder");
                this.updateProgressBar(-1);
                $(".zoom-btn").attr("disabled", false).removeClass("disabled");
                var enableSp = this.uiFilter.getFilterHasSwissProt();
                if (enableSp) {
                    $(this.filterAnnoToggleId).attr("disabled", false);
                    $(this.filterAnnoToggleLabelId).attr("data-original-title", "").removeClass("disabled");
                } else {
                    $(this.filterAnnoToggleId).attr("disabled", true);
                    $(this.filterAnnoToggleLabelId).attr("data-original-title", "No SwissProt annotated proteins are present.").addClass("disabled");
                }
                if (!payload.Data.EndOfData) {
                    this.showMoreBtn.removeAttr("disabled").removeClass("disabled");
                    this.showAllBtn.removeAttr("disabled").removeClass("disabled");
                }
                $(this.diagramCountId).text(payload.Data.DiagramCount);
                if (!this.hasProtId) {
                    $(this.uniRefContainerId + " label").attr("disabled", false);
                    $(this.uniRefContainerId).removeClass("disabled");
                }
            }
        } else if (payload.MessageType == "InitDataRetrieved") {
            if (payload.Data.Error) {
                $(this.loaderMessageId).text("Data Retrieval Error").show();
                this.progressLoader.addClass("hidden-placeholder");
                this.errorLoader.removeClass("hidden-placeholder");
            }
            this.setTotalCount(payload.Data.TotalCount);
            if (payload.Data.SupportsUniRef !== false) {
                if (this.uniRefSupport.getShowUniRefUi())
                    $(this.uniRefContainerId).show();
                else
                    $(this.searchPanelId).hide();

                if (payload.Data.FirstLoad) {
                    // On the first load of the page, set the default version which comes from the server.
                    this.uniRefSupport.setSupportedVersion(payload.Data.SupportsUniRef); // SupportsUniRef = version of UR that is supported (50 or 90)
                    var uniRefVer = this.uniRefSupport.getVersion();
                    if (uniRefVer == 50) {
                        $("#"+this.uniRefIds.uniref50Cb).prop("checked", true);
                        $("#"+this.uniRefIds.uniref50Btn).addClass("active");
                        $("#"+this.uniRefIds.uniprotBtn).removeClass("active");
                    } else if (uniRefVer == 90) {
                        $("#"+this.uniRefIds.uniref90Cb).prop("checked", true);
                        $("#"+this.uniRefIds.uniref90Btn).addClass("active");
                        $("#"+this.uniRefIds.uniprotBtn).removeClass("active");
                    }
                    if (payload.Data.SupportsUniRef == 90)
                        $("#"+this.uniRefIds.uniref50Btn).hide();
                }
                if (this.uniRefSupport.getShowUniRefUi()) {
                    var titleText = this.uniRefSupport.getTitleIdText();
                    $("#" + this.uniRefIds.uniRefTitleId).empty();
                    if (titleText) {
                       $("#" + this.uniRefIds.uniRefTitleId).append($("<br>"));
                       $("#" + this.uniRefIds.uniRefTitleId).append(titleText);
                    }
                }
            } else {
                $(this.uniRefContainerId).hide();
            }
        }
    }


    doSearch(query) {
        this.uiFilter.clearFilter();
        this.XT.search(query);
        this.hasProtId = query.match(/[^\d\s]/);
        $(".initial-hidden").removeClass("initial-hidden");
    }
    initialDirectJobLoad() {
        this.doSearch("1");
    }
    resetEverything() {
        this.XT.resetEverything();
        this.uiFilter.clearFilter();
        $(this.windowValueId).val(this.gndVars.getWindow());
    }


    updateProgressBar(pct) {
        if (!this.progressBarId)
            return;
        if (pct < 0) {
            $(".progress").addClass("hidden");
            pct = 0;
        } else {
            $(".progress").removeClass("hidden");
        }
        $(this.progressBarId)
            .css("width", pct + "%")
            .attr("aria-valuenow", pct)
            .text(pct + "%")
    }


    registerLoaderMessage(id) {
        this.loaderMessageId = id;
    }
    registerProgressBar(id) {
        this.progressBarId = id;
    }
    setTotalCount(count) {
        $(this.diagramTotalId).text(count);
    }
    registerDiagramCountField(currentId, totalId) {
        this.diagramCountId = currentId;
        this.diagramTotalId = totalId;
    }
    registerFilterAnnotation(id, labelId) {
        var that = this;
        this.filterAnnoToggleId = id;
        this.filterAnnoToggleLabelId = labelId;
        this.uiFilter.setAnnotationToggle(id);
        $(id).click(function(e) {
            that.uiFilter.toggleAnnotationFilter(this.checked);
        });
    }
    registerFilterFamilyGroup(pfamId, interproId) {
        var that = this;
        var toggleIndicator = function(e) {
            var obj = $(e)
                .prev(".panel-heading")
                .find(".accordion-arrow")
                .toggleClass("fa-caret-right fa-caret-down");
        };
        $(pfamId).on("show.bs.collapse", function() {
            that.uiFilter.setFamilySelection("pfam");
            toggleIndicator(this);
        });
        $(interproId).on("show.bs.collapse", function() {
            that.uiFilter.setFamilySelection("interpro");
            toggleIndicator(this);
        });
        $(pfamId).on("hide.bs.collapse", function() {
            toggleIndicator(this);
        });
        $(interproId).on("hide.bs.collapse", function() {
            toggleIndicator(this);
        });
    }
    registerFilterClear(id) {
        var that = this;
        $(id).click(function(e) {
            that.uiFilter.clearFilter();
        });
    }
    registerFilterControl(id) {
        var that = this;
        $(id).click(function(e) {
            that.uiFilter.changeFamilyText(this.checked);
        });
    }
    registerSearchBtn(id, inputId, startInfoId, searchPanelId) {
        var that = this;
        this.searchPanelId = searchPanelId;
        $(id).click(function(e) {
            $(startInfoId).hide();
            var input = $(inputId).val();
            var query = input.replace(/\n/g, " ").replace(/\r/g, " ");
            that.doSearch(query);
        });
    }
    registerSearchResetToInitialBtn(id, inputId) {
        var that = this;
        $(id).click(function(e) {
            $(inputId).val("");
            that.initialDirectJobLoad();
        });
    }
    registerSearchClearBtn(id, inputId) {
        var that = this;
        $(id).click(function(e) {
            $(inputId).val("");
            that.resetEverything();
        });
    }
    registerUniRefControl(containerId, groupId, uniRefIds) {
        var that = this;
        this.uniRefIds = uniRefIds;
        this.uniRefContainerId = containerId;
        if (!this.uniRefSupport.getShowUniRefUi()) {
            var titleText = this.uniRefSupport.getTitleIdText();
            $("#" + uniRefIds.uniRefTitleId).empty().append($("<br>"));
            $("#" + uniRefIds.uniRefTitleId).append(titleText);
        }
        $('input[name="'+groupId+'"]').change(function(e) {
            var val = $(this).val();
            val = (val == 50 || val == 90) ? val : false;
            that.uniRefSupport.setVersion(val);
            that.XT.reloadForIdTypeChange();
        });
    }
    registerWindowUpdateBtn(id, inputId) {
        var that = this;
        this.windowValueId = inputId;
        $(id).click(function(e) {
            var nbSize = $(inputId).val();
            that.XT.setWindow(nbSize);
        });
    }
    registerProgressLoader(id) {
        this.progressLoader = $(id);
    }
    registerErrorLoader(id) {
        this.errorLoader = $(id);
    }
    registerShowMoreBtn(id) {
        var that = this;
        this.showMoreBtn = $(id);
        this.showMoreBtn.click(function(e) {
            that.XT.loadNext();
        });
    }
    registerShowAllBtn(id) {
        var that = this;
        this.showAllBtn = $(id);
        this.showAllBtn.click(function(e) {
            that.XT.loadAll();
        });
    }
    registerZoom(outLarge, outSmall, inSmall, inLarge) {
        var that = this;
        var factors = [];
        this.zoomOutLarge = $(outLarge);
        this.zoomOutSmall = $(outSmall);
        this.zoomInSmall = $(inSmall);
        this.zoomInLarge = $(inLarge);
        this.zoomOutLarge.click(function(e) { that.XT.setZoom(ZOOM_FACTOR_OUT_LARGE); });
        this.zoomOutSmall.click(function(e) { that.XT.setZoom(ZOOM_FACTOR_OUT_SMALL); });
        this.zoomInSmall.click(function(e) { that.XT.setZoom(ZOOM_FACTOR_IN_SMALL); });
        this.zoomInLarge.click(function(e) { that.XT.setZoom(ZOOM_FACTOR_IN_LARGE); });
    }
    registerBigScape(bigscape, buttonId, buttonLabelId, modalId, confirmId, rejectId) {
        var that = this;
        $(buttonId).click(function(e) {
            if (bigscape.getStatus() == "FINISH") {
                var bigscapeOn = bigscape.toggleUseBigScape();
                $(buttonLabelId).text( bigscapeOn ? "Use BiG-SCAPE Synteny" : "Use BiG-SCAPE Synteny" );
                that.XT.reloadForIdTypeChange();
            } else {
                $(modalId).modal("show");
                if (!bigscape.getStatus() || bigscape.getStatus() == 0) {
                    $(confirmId).click(function (e) {
                        var completionHandler = function(status, message) {
                            $(modalId + " .modal-body div").text(bigscape.getConfirmText(status, message));
                            $(confirmId).hide();
                            $(rejectId).text("Close");
                            $(buttonLabelId).text("BiG-SCAPE Pending");
                        };
                        bigscape.run(completionHandler);
                    });
                }
            }
        });
    }
}

