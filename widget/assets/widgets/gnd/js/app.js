
var DEFAULT_PAGE_SIZE = 50;

function ArrowApp(arrows, popupIds) {

    this.arrows = arrows;
    this.popupIds = popupIds;
    this.inputObj = document.getElementById("search-input");
    this.advancedInputObj = document.getElementById("advanced-search-input");
    this.progressObj = $("#progress-loader");
    this.showMoreObj = $("#show-more-arrows-button");
    this.showMore100Obj = $("#show-more-arrows-button-100");
    this.showAllObj = $("#show-all-arrows-button");
    this.filterListObj = $("#filter-container");
    this.filterContainerToggleObj = $("#filter-container-toggle");
    this.filterLegendObj = $("#active-filter-list");
    this.diagramsDisplayed = $("#diagrams-displayed-count");
    this.diagramsTotal = $("#diagrams-total-count");
    this.firstRun = true;
    this.showFamsById = false;
    this.idKeyQueryString = "";
    this.baseIdKeyQueryString = ""; // used for toggling bigscape ordering
    this.showAll = false;
    this.useBigscape = true; // Default to bigscape if it's available
    this.bigscapeRunning = false;

    this.filterRevMap = {};

    var that = this;
    this.filterLegendObj.empty();
    $("#search-cluster-button").click(function() {
            that.advancedInputObj.value = that.inputObj.value;
            that.search(that.inputObj);
        });
//    $("input").on('keypress', function(e) {
//            if (e.which == 13) {
//                that.advancedInputObj.value = that.inputObj.value;
//                that.search(that.inputObj);
//                e.preventDefault();
//            }
//        });
    $("#advanced-search-cluster-button").click(function() {
            that.showAll = false;
            that.search(that.advancedInputObj);
        });

    $("#filter-cb-toggle-dashes").click(function() { $(".an-arrow").toggleClass("dashed-arrow"); });

    this.showMoreObj.click(function() {
        that.startProgressBar();
        that.arrows.nextPage(function(isEod, isError) {
            that.nextPageCallback(isEod);
            that.populateFilterList();
            that.stopProgressBar();
            that.updateCountFields();
        }, DEFAULT_PAGE_SIZE);
    });

    this.showMore100Obj.click(function() {
        that.startProgressBar();
        that.arrows.nextPage(function(isEod, isError) {
            that.nextPageCallback(isEod);
            that.populateFilterList();
            that.stopProgressBar();
            that.updateCountFields();
        }, 100);
    });

    $("#refresh-window").click(function(e) {
        var nbSize = $("#window-size").val();
        that.setNeighborhoodWindow(nbSize);
        that.refreshAll();
    });
    $("#scale-factor").keyup(function (e) {
        if (e.which == 13) {
            that.setScaleFactor($("#scale-factor").val());
            that.refreshAll();
        }
    });
    $("#scale-zoom-in-large").click(function(e) {
        that.zoom(4);
        that.refreshAll();
    });
    $("#scale-zoom-in-small").click(function(e) {
        that.zoom(1.125);
        that.refreshAll();
    });
    $("#scale-zoom-out-small").click(function(e) {
        that.zoom(0.8888888888888);
        that.refreshAll();
    });
    $("#scale-zoom-out-large").click(function(e) {
        that.zoom(0.25);
        that.refreshAll();
    });
    
    this.showAllObj.click(function() {
        that.startProgressBar();
        that.showAll = true;
        
        var finishCb = function(isEod, isError) {
            that.stopProgressBar();
            if (!isError) {
                that.updateMoreButtonStatus(isEod);
                that.populateFilterList();
                that.updateCountFields();
            } else {
                showAlertMsg();
            }
        };

        that.arrows.searchArrows(!that.showAll, finishCb);
    });

    $("#filter-clear").click(function() {
            that.clearFilter();
        });

    $("#download-data").tooltip({delay: {show: 50}, placement: 'top', trigger: 'hover'});
    $(".zoom-btn").tooltip({delay: {show: 50}, placement: 'top', trigger: 'hover'});

    this.enableSaveButton();
}

ArrowApp.prototype.refreshAll = function() {
    var that = this;
    that.startProgressBar();
    that.refreshCanvas(!that.showAll, function(isEod, isError) {
        that.stopProgressBar();
    });
}

ArrowApp.prototype.refreshCanvas = function(pageResults, callback) {
    this.arrows.refreshCanvas(pageResults, callback);
}

ArrowApp.prototype.setScaleFactor = function(scaleFactor) {
    this.arrows.setScaleFactor(scaleFactor);
}

ArrowApp.prototype.zoom = function(zoomFactor) {
    var sf = this.arrows.getScaleFactor();
    sf = sf * zoomFactor;
    this.arrows.setScaleFactor(sf);
}

ArrowApp.prototype.setNeighborhoodWindow = function(nbSize) {
    this.arrows.setNeighborhoodWindow(nbSize);
}

ArrowApp.prototype.setQueryString = function(idKeyQueryString) {
    this.idKeyQueryString = idKeyQueryString;
    this.baseIdKeyQueryString = this.idKeyQueryString;
    this.idKeyQueryString = this.baseIdKeyQueryString + (this.useBigscape ? "&bigscape=1" : "");
    this.arrows.setJobInfo(this.idKeyQueryString);
}

ArrowApp.prototype.showDefaultDiagrams = function() {
    this.startProgressBar();
    this.doSearch("1");
}

ArrowApp.prototype.search = function(inputObj) {
    this.startProgressBar();
    var idList = this.getIdList(inputObj);
    this.doSearch(idList);
}

ArrowApp.prototype.doSearch = function(idList) {
    this.arrows.clearFamilyData();
    this.arrows.resetScaleFactor();
    this.clearFilter();
    
    var that = this;
    var finishCb = function(isEod, isError) {
        that.populateFilterList();
        that.updateMoreButtonStatus(isEod);
        that.stopProgressBar();
        that.updateCountFields();
    };
    
    this.arrows.setIdList(idList);
    this.showAll = false;
    $("#start-info").hide();
    this.arrows.searchArrows(!this.showAll, finishCb);
}

ArrowApp.prototype.uiFilterUpdate = function(fam, doRemove) {
    console.log(fam + " " + doRemove);
    if (fam in this.filterRevMap) {
        var data = this.filterRevMap[fam];
        var i = data[0];
        var text = data[1];

        var checkbox = $("#filter-cb-" + i);
        checkbox.prop('checked', !checkbox.prop('checked'));

        if (doRemove)
            $("#legend-" + i).remove();
        else
            this.addLegendItem(i, fam, data[1]);

    }
}

ArrowApp.prototype.populateFilterList = function() {
    this.fams = this.arrows.getFamilies(this.showFamsById);
    this.filterListObj.empty();
    this.filterLegendObj.empty();
    this.filterRevMap = {};

    var that = this;
    $.each(this.fams, function(i, fam) {
        var famText = that.showFamsById ? fam.id : fam.name;
        //var ttText = that.showFamsById ? fam.name : fam.id;
        var ttText = famText;
        var isChecked = fam.checked ? "checked" : "";

        var entry = $("<div class='filter-cb-div' title='" + ttText + "'></div>").appendTo(that.filterListObj);
        $("<input id='filter-cb-" + i + "' class='filter-cb' type='checkbox' value='" + i + "' " + isChecked + "/>")
            .appendTo(entry)
            .click(function(e) {
                console.log("cb clicked");
                if (this.checked) {
                    that.arrows.addPfamFilter(fam.id);
                    that.addLegendItem(i, fam.id, famText);
                } else {
                    that.arrows.removePfamFilter(fam.id);
                    $("#legend-" + i).remove();
                }
            });
         $("<span id='filter-cb-text-" + i + "' class='filter-cb-number'><label for='filter-cb-" + i + "'>" + famText + "</label></span>").
            appendTo(entry);
         
         that.filterRevMap[fam.id] = [i, famText];

         if (fam.checked)
             that.addLegendItem(i, fam.id, famText);
    });

    if (this.firstRun) {
        $(".initial-hidden").removeClass("initial-hidden");
        this.firstRun = false;
    }

    $('.filter-cb-div').tooltip({delay: {show: 50}, placement: 'top', trigger: 'hover'});

}

ArrowApp.prototype.addLegendItem = function(index, id, text) {
    var color = this.arrows.getPfamColor(id);
    var activeFilter = $("<div id='legend-" + index + "'>" +
            "<span class='active-filter-icon' style='background-color:" + color + "'> </span> " + text + "</div>")
        .appendTo(this.filterLegendObj);
}

ArrowApp.prototype.clearFilter = function() {
    $("input.filter-cb:checked").prop("checked", false);
    this.filterLegendObj.empty();
    this.arrows.clearPfamFilters();
}

ArrowApp.prototype.getLegendSvg = function() {

    var selLegendItems = $("#active-filter-list div");
    var allLegendItems = []; //TODO: get the list of all families

    var width = 300;
    var rowHeight = 25;
    var xOffsetAll = 1000;
    var xOffsetSel = allLegendItems.length > 0 ? 1300 : 1000;
    var selHeight = rowHeight*selLegendItems.length;
    var allHeight = rowHeight*allLegendItems.length;

    var code = '<div style="background-color: white; width: 500px; height: 500px; position: absolute; left: 400px; top: 200px; display: none">' +
        '<svg width="' + width + 'px" height="' + selHeight + 'px" viewBox="0 0 ' + width + ' ' + selHeight + '" id="legend-export-selected"></svg>' +
        '<svg width="' + width + 'px" height="' + allHeight + 'px" viewBox="0 0 ' + width + ' ' + allHeight + '" id="legend-export-all"></svg>' +
        '</div>';
    var newCanvas = $("body").append(code);
    $("#legend-export-selected").empty();
    $("#legend-export-all").empty();

//    var that = this;
//    var allSvg = Snap("#legend-export-all");
//    G = allSvg.paper.group();
//    allLegendItems.each(function(i, elem) {
//        var span = elem.childNodes[0];
//        if (span !== undefined) {
//            var color = that.arrows.getPfamColor(id);
//            var text = elem.childNodes[1];
//            if (text !== undefined) {
//                var g = G.group();
//                g.text(28+xOffsetAll, rowHeight*i+22, text.data).attr({'font-size': "15px"});
//                var c = g.rect(5+xOffsetAll, rowHeight*i+5, 20, 20);
//                c.attr({fill: color});
//            }
//        }
//    });
//
//    var allSvgMarkup = allSvg.outerSVG();
    var allSvgMarkup = "";

    var svg = Snap("#legend-export-selected");
    var G = svg.paper.group();
    selLegendItems.each(function(i, elem) {
        var span = elem.childNodes[0];
        if (span !== undefined) {
            var color = span.style.backgroundColor;
            var text = elem.childNodes[1];
            if (text !== undefined) {
                var g = G.group();
                g.text(28+xOffsetSel, rowHeight*i+22, text.data).attr({'font-size': "15px"});
                var c = g.rect(5+xOffsetSel, rowHeight*i+5, 20, 20);
                c.attr({fill: color});
            }
        }
    });

    var selSvgMarkup = svg.outerSVG();

    return [allSvgMarkup, selSvgMarkup, allHeight, selHeight];
}

ArrowApp.prototype.togglePfamNamesNumbers = function(isChecked) {
    this.showFamsById = isChecked; // true == sort by ID
    this.populateFilterList();
    //$(".filter-cb-name").toggleClass("hidden");
    //$(".filter-cb-number").toggleClass("hidden"); 
}

ArrowApp.prototype.startProgressBar = function() {
    this.progressObj.removeClass("hidden-placeholder");
    $(".zoom-btn").prop("disabled", true).addClass("disabled");
}

ArrowApp.prototype.stopProgressBar = function() {
    this.progressObj.addClass("hidden-placeholder");
    $(".zoom-btn").prop("disabled", false).removeClass("disabled");
}

ArrowApp.prototype.getIdList = function(inputObj) {
    var idList = inputObj.value;
    return idList;
}

ArrowApp.prototype.updateMoreButtonStatus = function (isEod) {
    if (isEod) {
        this.showMoreObj.prop('disabled', true).addClass("disabled");
        this.showMore100Obj.prop('disabled', true).addClass("disabled");
        this.showAllObj.prop('disabled', true).addClass("disabled");
    } else {
        this.showMoreObj.prop('disabled', false).removeClass("disabled");
        this.showMore100Obj.prop('disabled', false).removeClass("disabled");
        this.showAllObj.prop('disabled', false).removeClass("disabled");
    }
}

ArrowApp.prototype.nextPageCallback = function (isEod) {
    this.populateFilterList();
    this.updateMoreButtonStatus(isEod);
    //$('html,body').animate({scrollTop: document.body.scrollHeight},{duration:800});
}

ArrowApp.prototype.enableSaveButton = function() {
    
    var saveSupported = (navigator.userAgent.search("Chrome") >= 0 ||
                         navigator.userAgent.search("Firefox") >= 0 ||
                         (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0)) &&
                        navigator.userAgent.search("Edge") < 0;

    if (saveSupported) {
        $("#save-canvas-button").show();

//        $("#save-canvas-button").canvas(function(e) {
//                
//            });
    } else {
        $("#save-canvas-button").hide();
    }
}

ArrowApp.prototype.getMatchedUniProtIds = function(callback) {
   var xmlhttp = new XMLHttpRequest();
   xmlhttp.open("GET", "get_direct_ids.php?" + this.idKeyQueryString + "&type=matched", true);
   xmlhttp.onload = function() {
       if (this.readyState == 4 && this.status == 200) {
           var data = JSON.parse(this.responseText);
           typeof callback === 'function' && callback(data);
       }
   };
   xmlhttp.send(null);
}

ArrowApp.prototype.getUnmatchedUniProtIds = function(callback) {
   var xmlhttp = new XMLHttpRequest();
   xmlhttp.open("GET", "get_direct_ids.php?" + this.idKeyQueryString + "&type=unmatched", true);
   xmlhttp.onload = function() {
       if (this.readyState == 4 && this.status == 200) {
           var data = JSON.parse(this.responseText);
           typeof callback === 'function' && callback(data);
       }
   };
   xmlhttp.send(null);
}

ArrowApp.prototype.formatIdList = function(idList) {
    var text = $("<div></div>");
    for (var i = 0; i < idList.length; i++) {
        text.append("<div>" + idList[i] + "</div>");
    }

    return text;
}

ArrowApp.prototype.updateCountFields = function() {
    var c = this.arrows.getDiagramCounts();
    this.diagramsDisplayed.text(c[0]);
    this.diagramsTotal.text(c[1]);
}

ArrowApp.prototype.downloadSvg = function(svg, gnnName) {

    var data = this.getLegendSvg();
    legendSvgMarkup = escape(data[1]);

    var dlForm = $("<form></form>");
    dlForm.attr("method", "POST");
    dlForm.attr("action", "download_diagram_image.php");
    dlForm.append('<input type="hidden" name="type" value="svg">');
    dlForm.append('<input type="hidden" name="name" value="' + gnnName + '">');
    dlForm.append('<input type="hidden" name="svg" value="' + svg + '">');
    dlForm.append('<input type="hidden" name="legend1-svg" value="' + legendSvgMarkup + '">');
    $("#download-forms").append(dlForm);
    dlForm.submit();
}

ArrowApp.prototype.toggleUseBigscape = function() {
    this.useBigscape = !this.useBigscape;
    this.idKeyQueryString = this.baseIdKeyQueryString + (this.useBigscape ? "&bigscape=1" : "");
    this.arrows.setJobInfo(this.idKeyQueryString);
    this.refreshAll();
}

ArrowApp.prototype.runBigscape = function(gnnId, gnnKey, jobType, completionHandler) {
    var fd = new FormData();
    fd.append("id", gnnId);
    fd.append("key", gnnKey);
    fd.append("type", jobType);
    
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "create_bigscape.php", true);
    xhr.send(fd);
    xhr.onreadystatechange  = function(){
        if (xhr.readyState == 4  ) {

            // Javascript function JSON.parse to parse JSON data
            var jsonObj = JSON.parse(xhr.responseText);

            // jsonObj variable now contains the data structure and can
            // be accessed as jsonObj.name and jsonObj.country.
            if (jsonObj.valid) {
                completionHandler(true, "");
            } else {
                completionHandler(false, jsonObj.message);
            }
        }
    }
    
}

ArrowApp.prototype.isOrderingBigscape = function() {
    return this.useBigscape;
}






////////////////////////////////////////////////////////////////////////////////////////////////////////////

function PopupIds() {
    this.ParentId = "info-popup";
    this.IdId = "info-popup-id";
    this.FamilyId = "info-popup-fam";
    this.FamilyDescId = "info-popup-fam-desc";
    this.IproFamilyId = "info-popup-ipro-fam";
    this.IproFamilyDescId = "info-popup-ipro-fam-desc";
    this.SpTrId = "info-popup-sptr";
    this.SeqLenId = "info-popup-seqlen";
    this.DescId = "info-popup-desc";
    this.CopyId = "copy-info";
}





function saveDataFn(filename, dataId) {
    var data = getDataFromDivs(dataId);
    var blob = new Blob([data], {type: 'text/plain'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
}
function getDataFromDivs(parentId) {
    var data = "";
    var parent = document.getElementById(parentId);
    for (var i = 0; i < parent.children.length; i++) {
        data += parent.children[i].innerHTML + "\n";
    }
    return data;
}


