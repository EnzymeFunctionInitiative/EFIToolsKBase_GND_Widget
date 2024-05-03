

const DISPLAY_NAME = 100;
const DISPLAY_ID = 101;


class GndFilterUi {
    constructor(gndRouter, gndFilter, gndColor, pfamFilterContainerId, interproFilterContainerId, legendContainerId, numDiagramsFilteredId) {
        this.pfamFilterContainer = $(pfamFilterContainerId);
        this.interproFilterContainer = $(interproFilterContainerId);
        this.legendContainer = $(legendContainerId);
        this.numDiagramsFilteredId = numDiagramsFilteredId;
        this.filter = gndFilter;
        this.color = gndColor;
        this.nameMap = {};
        this.annoToggleId = "";
        this.legendList = {};

        this.displayMode = DISPLAY_NAME;

        gndRouter.addListener(this);
    }

    
    onMessage(payload) {
        if (payload.MessageType == "DataRetrievalStatus") {
            if (!payload.Data.Retrieving) {
                this.addAllFamiliesToLegend();
                this.filter.refreshNumDiagramsFiltered();
                this.updateNumDiagramsFiltered();
            } else if (payload.Data.Initial) {
                this.filter.reset();
                this.toggleAnnotationFilter(false);
            }
        } else if (payload.MessageType == "FilterUpdate") {
            for (var i = 0; i < payload.Data.Family.length; i++) {
                var famId = payload.Data.Family[i];
                if (famId in this.nameMap) {
                    var data = this.nameMap[famId];
                    var legendIndex = data[0];
                    if (payload.Data.IsActive) { // Remove
                        this.deleteLegendItem(legendIndex);
                    } else {
                        this.addSelectedLegendItem(legendIndex, famId, data[1]);
                        $("#filter-cb-" + legendIndex).prop("checked", true);
                    }
                }
            }
            this.updateNumDiagramsFiltered();
        }
    }


    toggleAnnotationFilter(checked) {
        this.filter.setFilterBySwissProt(checked);
        this.updateNumDiagramsFiltered();
    }


    // valid input: pfam, interpro
    setFamilySelection(familyType) {
        if (familyType == "pfam") {
            this.filter.setFilterByPfam();
        } else if (familyType == "interpro") {
            this.filter.setFilterByInterPro();
        }
    }


    setAnnotationToggle(id) {
        this.annoToggleId = id;
    }


    getFilterHasSwissProt() {
        return this.filter.hasSwissProt();
    }


    changeFamilyText(checked) {
        if (checked)
            this.displayMode = DISPLAY_ID;
        else
            this.displayMode = DISPLAY_NAME;
        this.addAllFamiliesToLegend();
    }


    updateNumDiagramsFiltered() {
        var numDiagrams = this.filter.getNumDiagramsFiltered();
        if (numDiagrams >= 0) {
            $(this.numDiagramsFilteredId).show();
            $(this.numDiagramsFilteredId + " span").text(numDiagrams);
        } else {
            $(this.numDiagramsFilteredId).hide();
        }
    }


    addAllFamiliesToLegend() {
        this.legendList = {};
        this.legendContainer.empty();
        this.addFamiliesToLegend(this.pfamFilterContainer, FILTER_PFAM);
        this.addFamiliesToLegend(this.interproFilterContainer, FILTER_INTERPRO);
    }
    addFamiliesToLegend(filterContainer, filterMode) {
        filterContainer.empty();

        var showFamsById = this.displayMode == DISPLAY_ID;
        var families = [];
        if (filterMode == FILTER_PFAM)
            families = this.filter.getPfamFamilies(showFamsById);
        else if (filterMode == FILTER_INTERPRO)
            families = this.filter.getInterProFamilies(showFamsById);

        var that = this;

        $.each(families, function(i, fam) {
            var legendIndex = filterMode + "-" + i;
            var famId = fam.Id;
            var famName = fam.Name;
            var famText = that.displayMode == DISPLAY_ID ? famId : famName;
            var tooltipText = that.displayMode == DISPLAY_ID ? famName : famId;
            var isChecked = fam.Selected ? "checked" : "";
            that.nameMap[fam.Id] = [legendIndex, famName];
    
            var entry = $("<div class='filter-cb-div' title='" + tooltipText + "'></div>").appendTo(filterContainer);
            $("<input id='filter-cb-" + legendIndex + "' class='filter-cb' type='checkbox' value='" + legendIndex + "' " + isChecked + "/>")
                .appendTo(entry)
                .click(function(e) {
                    $(that.annoToggleId).prop("checked", false);
                    if (this.checked) {
                        that.filter.addFamilyFilter(famId);
                        that.addSelectedLegendItem(legendIndex, famId, famName);
                        that.updateNumDiagramsFiltered();
                    } else {
                        that.removeFamilyFilter(famId, legendIndex);
                    }
                });
            $("<span id='filter-cb-text-" + legendIndex + "' class='filter-cb-number'><label for='filter-cb-" + legendIndex + "'>" + famText + " <span class='filter-small'>(" + tooltipText + ")</span></label></span>") .
                appendTo(entry);
            
            if (fam.Selected)
                that.addSelectedLegendItem(legendIndex, famId, famName);
        });
    
        $('.filter-cb-div').tooltip({delay: {show: 50}, placement: 'top', trigger: 'hover'});
    }


    removeFamilyFilter(famId, legendIndex) {
        this.filter.removeFamilyFilter(famId);
        this.deleteLegendItem(legendIndex);
        this.updateNumDiagramsFiltered();
    }
    deleteLegendItem(legendIndex) {
        $("#filter-cb-" + legendIndex).prop("checked", false);
        $("#legend-" + legendIndex).remove();
        delete this.legendList[legendIndex];
    }


    addSelectedLegendItem(index, famId, famName, displayText) {
        var displayText = this.displayMode == DISPLAY_ID ? (famId + " (" + famName + ")") : (famName + " (" + famId + ")");
        if (!(index in this.legendList)) {
            var that = this;
            var color = this.color.getPfamColor(famId);
            var activeFilter = $("<div id='legend-" + index + "' title='" + famName + "'>" +
                "<span class='active-filter-icon' style='background-color:" +
                color +
                "'><i class='fas fa-times active-filter-icon-clear' aria-hidden='true' style='visibility:hidden;'></i></span> " +
                displayText + "</div>")
                .appendTo(this.legendContainer);
            $(activeFilter).find("span").mouseover(function(e) {
                $(this).css("background-color", "transparent");
                $(this).find("i").css("visibility", "visible");
            }).mouseout(function(e) {
                $(this).css("background-color", color);
                $(this).find("i").css("visibility", "hidden");
            }).click(function(e) {
                that.removeFamilyFilter(famId, index);
            });
            this.legendList[index] = famId;
        }
    }


    clearFilter() {
        $("input.filter-cb:checked").prop("checked", false);
        this.legendContainer.empty();
        this.legendList = {};
        this.filter.clearFilters();
        this.updateNumDiagramsFiltered();
        $(this.annoToggleId).prop("checked", false);
    }

    getLegendSvg() {
        var selLegendItems = this.legendContainer.children();
        var allLegendItems = []; //TODO: get the list of all families
    
        var width = 300;
        var rowHeight = 25;
        var xOffsetAll = 1000;
        var xOffsetSel = allLegendItems.length > 0 ? 1300 : 1000;
        var selHeight = rowHeight * selLegendItems.length;
        var allHeight = rowHeight * allLegendItems.length;
    
        var code = '<div style="background-color: white; width: 500px; height: 500px; position: absolute; left: 400px; top: 200px; display: none">' +
            '<svg width="' + width + 'px" height="' + selHeight + 'px" viewBox="0 0 ' + width + ' ' + selHeight + '" id="legend-export-selected"></svg>' +
            '<svg width="' + width + 'px" height="' + allHeight + 'px" viewBox="0 0 ' + width + ' ' + allHeight + '" id="legend-export-all"></svg>' +
            '</div>';
        var newCanvas = $("body").append(code);
        $("#legend-export-selected").empty();
        $("#legend-export-all").empty();
    
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
}

