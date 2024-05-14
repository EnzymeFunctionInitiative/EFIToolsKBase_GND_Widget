

const FILTER_PFAM = 1;
const FILTER_INTERPRO = 2;
const FILTER_SWISSPROT = 4;


class GndFilter {
    constructor(gndRouter, gndDb) {
        this.gndRouter = gndRouter;
        this.db = gndDb;

        this.filterMode = FILTER_PFAM;
        this.saveFilterMode = FILTER_PFAM;

        this.familyMap = {};
        this.familyNames = {};
        this.swissProtMap = {}; // arrows with SwissProt annotation

        this.currentFamilies = {}; // families currently highlighted
        this.idMap = {}; // maps arrow IDs to families

        this.diagramFamilies = {}; // map diagram index to list of families highlighted
        this.familyDiagrams = {}; // map all families to diagrams that have the family
        this.numDiagramFilters = 0;
        this.diagramSwissProt = {}; // map arrow ID to diagram index for SwissProt purposes
        
        this.pfamList = {};
        this.interproList = {};
    }


    // Public
    clearFilters() {
        this.currentFamilies = {};
        this.diagramFamilies = {};
        this.numDiagramFilters = -1;
        this.filterMode = this.saveFilterMode = FILTER_PFAM;
        $(".an-arrow").removeClass("an-arrow-mute").removeClass("an-arrow-selected").removeClass("an-arrow-bold");
    }
    // Private
    checkForClearingFilter() {
        if (Object.keys(this.currentFamilies).length == 0 && !(this.filterMode & FILTER_SWISSPROT))
            this.clearFilters();
    }

    reset() {
        this.familyMap = {};
        this.familyNames = {};
        this.familyDiagrams = {}; // map all families to diagrams that have the family
        this.pfamList = {};
        this.interproList = {};
        this.swissProtMap = {};
        this.diagramSwissProt = {}; // map arrow ID to diagram index for SwissProt purposes
        this.clearFilters();
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // PUBLIC SET WHICH ATTRIBUTE TO FILTER/HIGHLIGHT BY
    //
    setFilterByPfam() {
        this.filterMode = FILTER_PFAM;
    }
    setFilterByInterPro() {
        this.filterMode = FILTER_INTERPRO;
    }
    setFilterBySwissProt(show) {
        if (show) {
            this.muteAll();
            this.saveFilterMode = this.filterMode;
            this.filterMode = FILTER_SWISSPROT;
        }

        for (var arrowId in this.swissProtMap) {
            this.updateArrowClass(this.swissProtMap[arrowId], show);
        }

        if (!show) {
            this.filterMode = this.saveFilterMode;
            this.checkForClearingFilter();
            if (Object.keys(this.currentFamilies).length > 0)
                this.muteAll();
            for (var family in this.currentFamilies) {
                this.updateClasses(this.familyMap[family], true);
                this.updateDiagramCount(family, true);
            }
        } else {
            this.numDiagramFilters = Object.keys(this.diagramSwissProt).length;
        }
        // This code is for when we add functionality to show SwissProt and highlight by family at the same time.
        //if (show)
        //    this.filterMode = this.filterMode | FILTER_SWISSPROT;
        //else
        //    this.filterMode = this.filterMode ^ FILTER_SWISSPROT;
        //this.setArrowFilterBySwissProt();
    }
    getNumDiagramsFiltered() {
        return this.numDiagramFilters;
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // PUBLIC INITIALIZE ARROW
    //

    // Public
    // Adds an SVG arrow object to the filter mappings. This should be called
    // for every arrow in each diagram that is retrieved.
    // The arrow parameter is a jQuery/SnapSVG object.
    // The data parameter is a GndDrawableArrow
    // family-specific colors to the arrow.
    addArrow(arrowGroup, data, diagramIndex = 0) {
        var updateFams = [];
        for (var i = 0; i < data.Pfam.length; i++) {
            var fam = data.Pfam[i];
            if (this.addArrowHelper(fam, data.PfamDesc[i], this.pfamList, arrowGroup, diagramIndex, data.Id))
                updateFams.push(fam);
        }
        for (var i = 0; i < data.InterPro.length; i++) {
            var fam = data.InterPro[i];
            if (this.addArrowHelper(fam, data.InterProDesc[i], this.interproList, arrowGroup, diagramIndex, data.Id))
                updateFams.push(fam);
        }

        if (data.IsSwissProt) {
            this.swissProtMap[data.Id] = arrowGroup;
            this.diagramSwissProt[diagramIndex] = 1;
        }

        var isSwissProt = this.filterMode & FILTER_SWISSPROT;
        if (updateFams.length > 0 || (data.IsSwissProt && isSwissProt))
            this.updateArrowClass(arrowGroup, true);
        else if (Object.keys(this.currentFamilies).length > 0 || (isSwissProt && !data.IsSwissProt))
            this.updateArrowClass(arrowGroup, false);
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // PUBLIC FILTER ADD/REMOVE
    //
    addFamilyFilter(family) {
        // If this is the first time we add a filter, then we mute all the arrows.
        if (Object.keys(this.currentFamilies).length == 0)
            this.muteAll();
        this.updateCurrentFamilies(family, true);
        this.updateDiagramCount(family, true);
        this.updateClasses(this.familyMap[family], true);
    }
    removeFamilyFilter(family) {
        this.updateCurrentFamilies(family, false);
        this.updateDiagramCount(family, false);
        this.updateClasses(this.familyMap[family], false);
        this.checkForClearingFilter();
    }
    // Used when the user clicks on the diagram to toggle the filter.
    // Currently only highlights related Pfams, not InterPros.
    toggleFamilyFilterByArrowId(arrowId, classList) {
        var isActive = classList.includes("an-arrow-selected");
        var data = this.db.getData(arrowId);

        var addFilter = !isActive;

        var list = [];
        // Only do PFam. InterPro complicates the filtering.
        this.addFamilyListFilter(data.Pfam, addFilter, list);
        //if (this.filterMode == FILTER_PFAM)
        //    this.addFamilyListFilter(data.Pfam, addFilter, list);
        //else if (this.filterMode == FILTER_INTERPRO)
        //    this.addFamilyListFilter(data.InterPro, addFilter, list);

        // Send a message to the user interface to check/uncheck the corresponding family boxes.
        var msg = new Payload(); msg.MessageType = "FilterUpdate"; msg.Data = {Family: list, IsActive: isActive};
        this.gndRouter.sendMessage(msg);
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // FAMILY METHODS
    //
    getFamilies(sortById = true) { // All families, both types
        return this.getFamiliesFromMap(this.familyMap, this.familyNames, sortById);
    }
    getPfamFamilies(sortById = true) {
        var fams = this.getFamiliesFromMap(this.pfamList, this.familyNames, sortById);
        return fams;
    }
    getInterProFamilies(sortById = true) {
        var fams = this.getFamiliesFromMap(this.interproList, this.familyNames, sortById);
        return fams;
    }
    //Private
    getFamiliesFromMap(listMap, nameList, sortById) {
        var list = Object.keys(listMap);
        var fams = [];
        for (var i = 0; i < list.length; i++) {
            var famId = list[i];
            var famName = "";
            if (famId == "none")
                famName = "None";
            else
                famName = nameList[famId];

            var isSelected = famId in this.currentFamilies;
            fams.push({Id: famId, Name: famName, Selected: isSelected});
        }

        if (sortById)
            fams.sort(function(a, b) { return a.Id.localeCompare(b.Id); });
        else
            fams.sort(function(a, b) { return a.Name.localeCompare(b.Name); });

        return fams;
    }
    hasSwissProt() {
        return Object.keys(this.swissProtMap).length > 0;
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // PRIVATE METHODS
    //

    // These methods only update the data structures.
    // View is updated later.
    updateCurrentFamilies(family, addFilter) {
        if (addFilter)
            this.currentFamilies[family] = 1;
        else if (family in this.currentFamilies)
            delete this.currentFamilies[family];
    }
    addFamilyListFilter(families, addFilter, list) {
        for (var i = 0; i < families.length; i++) {
            var family = families[i];
            if (addFilter)
                this.addFamilyFilter(family);
            else
                this.removeFamilyFilter(family);
            list.push(family);
        }
    }
    
    
    updateDiagramCount(family, addFilter, count = true) {
        // Wow. This is crazy complicated.
        //TODO: optimize this
        var diagrams = Object.keys(this.familyDiagrams[family]);
        for (var i = 0; i < diagrams.length; i++) {
            var diagram = diagrams[i];
            if (diagram in this.diagramFamilies) {
                if (family in this.diagramFamilies[diagram]) {
                    if (!addFilter)
                        delete this.diagramFamilies[diagram][family];
                } else if (addFilter) {
                    this.diagramFamilies[diagram][family] = 1;
                }
            } else if (addFilter) {
                this.diagramFamilies[diagram] = {};
                this.diagramFamilies[diagram][family] = 1;
            }
        }
        if (count)
            this.countNumDiagramFilters();
    }
    // Called at the end of a data retrieval
    refreshNumDiagramsFiltered() {
        var fams = Object.keys(this.currentFamilies);
        for (var i = 0; i < fams.length; i++) {
            this.updateDiagramCount(fams[i], true, false);
        }
        this.countNumDiagramFilters();
    }
    countNumDiagramFilters() {
        if (this.filterMode & FILTER_SWISSPROT) {
            this.numDiagramFilters = Object.keys(this.diagramSwissProt).length;
        } else {
            var numFilters = Object.keys(this.currentFamilies).length;
            var selDiagrams = Object.keys(this.diagramFamilies);
            if (numFilters > 0) {
                this.numDiagramFilters = 0;
                for (var i = 0; i < selDiagrams.length; i++) {
                    var numFams = Object.keys(this.diagramFamilies[selDiagrams[i]]).length;
                    if (numFams == numFilters)
                        this.numDiagramFilters++;
                }
            } else {
                this.numDiagramFilters = -1; // Don't show the text on the main UI
            }
        }
    }


    // Updates the view for a list of arrows.
    updateClasses(arrowGroups, addFilter) {
        for (var ai = 0; ai < arrowGroups.length; ai++) {
            var arrowId = arrowGroups[ai][0];
            var group = arrowGroups[ai][1];
            if (!addFilter) {
                var atLeastOneOfTheArrowFusionFamiliesIsCurrentlySelected = false;
                for (var i = 0; i < this.idMap[arrowId].length; i++) {
                    if (this.idMap[arrowId][i] in this.currentFamilies)
                        atLeastOneOfTheArrowFusionFamiliesIsCurrentlySelected = true;
                }
                if (!atLeastOneOfTheArrowFusionFamiliesIsCurrentlySelected)
                    this.updateArrowClass(group, false);
            } else {
                this.updateArrowClass(group, addFilter);
            }
        }
    }
    // Updates the view for an individual arrow.
    updateArrowClass(arrowGroup, addFilter) {
        var removeClass = addFilter ? "an-arrow-mute" : "an-arrow-selected";
        var addClass = addFilter ? "an-arrow-selected" : "an-arrow-mute";
        arrowGroup.arrow.removeClass(removeClass);
        arrowGroup.arrow.addClass(addClass);
        for (var si = 0; si < arrowGroup.subArrows.length; si++) {
            arrowGroup.subArrows[si].removeClass(removeClass);
            arrowGroup.subArrows[si].addClass(addClass);
        }
    }
    muteAll() {
        $(".an-arrow").removeClass("an-arrow-selected").addClass("an-arrow-mute");
    }


    // Private helper. Return true if the arrow is in the current filter selection.
    addArrowHelper(fam, famName, secondaryMap, arrowGroup, diagramIndex, arrowId) {
        if (!(fam in this.familyMap)) {
            this.familyMap[fam] = [];
            this.familyNames[fam] = famName;
        }

        if (!(fam in this.familyDiagrams))
            this.familyDiagrams[fam] = {};
        if (!(diagramIndex in this.familyDiagrams[fam]))
            this.familyDiagrams[fam][diagramIndex] = 1;

        this.familyMap[fam].push([arrowId, arrowGroup]);

        if (!(arrowId in this.idMap))
            this.idMap[arrowId] = [];
        this.idMap[arrowId].push(fam);

        if (!(fam in secondaryMap))
            secondaryMap[fam] = [];
        secondaryMap[fam].push(arrowGroup);

        if (fam in this.currentFamilies) {
            return true;
        } else {
            return false;
        }
    }
}

