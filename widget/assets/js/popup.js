

// Handles storage and display of arrow info popup.


class GndInfoPopup {
    constructor(gndRouter, gndDb, popupIds) {
        this.db = gndDb;
        this.popupIds = popupIds;
        this.curInfo = false;

        this.popup = $("#" + this.popupIds.ParentId);

        var that = this;
        $("#" + this.popupIds.CopyId).click(function(ev) {
             if (that.selInfoBoxArrow !== false)
                 copyTextToClipboard(that.getInfoText());
        });
    }


    setAutoClose(autoClose) {
        this.autoClose = autoClose;
    }


    hidePopup() {
        if (this.autoClose)
            this.popup.addClass("hidden");
    }


    showPopup(xPos, yPos, arrowId) {
        var data = this.db.getData(arrowId);
        this.curInfo = data;

        this.popup.css({top: yPos, left: xPos});

        var pfam = data.PfamMerged.length > 0 ? data.PfamMerged.join(", ") : "none";
        var ipro = data.InterProMerged.length > 0 ? data.InterProMerged.join(", ") : "none";

//        console.log(data);
//
//        var family = "none";
//        if (data.Attr.pfam.length > 0)
//            family = data.Attr.pfam.join(", ");
//        var familyDesc = "none";
//        if (data.Attr.pfam_desc.length > 0)
//            familyDesc = data.Attr.pfam_desc.join(", ");
//        var familyMerged = "none";
//        if (data.Attr.pfam_merged.length > 0)
//            familyMerged = data.Attr.pfam_merged.join(", ");
//
//        var iproFamily = "none";
//        if (data.Attr.ipro_family.length > 0)
//            iproFamily = data.Attr.ipro_family.join(", ");
//        var iproFamilyDesc = "none";
//        if (data.Attr.ipro_family_desc.length > 0)
//            iproFamilyDesc = data.Attr.ipro_family_desc.join(", ");
//        var iproFamilyMerged = "none";
//        if (data.Attr.ipro_family_merged.length > 0)
//            iproFamilyMerged = data.Attr.ipro_family_merged.join(", ");

        //    family = family.join("-");
        $("#" + this.popupIds.IdId + " span").text(data.Attr.accession);
        $("#" + this.popupIds.IdId + " a").attr("href", "https://www.uniprot.org/uniprot/" + data.Attr.accession);
        $("#" + this.popupIds.DescId + " span").text(data.Attr.desc);
        $("#" + this.popupIds.SpTrId + " span").text(data.Attr.anno_status);
        $("#" + this.popupIds.SeqLenId + " span").text(data.Attr.seq_len) + " AA";

        $("#" + this.popupIds.FamilyId + " span").text(pfam);

//        if (familyMerged) {
//            if (family == "none")
//                $("#" + this.popupIds.FamilyId + " span").text(family);
//            else
//                $("#" + this.popupIds.FamilyId + " span").text(familyMerged);
//            $("#" + this.popupIds.FamilyDescId + " span").hide();
//        } else {
//            $("#" + this.popupIds.FamilyId + " span").text(family);
//            $("#" + this.popupIds.FamilyDescId + " span").text(familyDesc);
//            $("#" + this.popupIds.FamilyDescId + " span").show();
//        }

        $("#" + this.popupIds.IproFamilyId + " span").text(ipro);
//        if (iproFamilyMerged) {
//            if (iproFamily == "none")
//                $("#" + this.popupIds.IproFamilyId + " span").text(iproFamily);
//            else
//                $("#" + this.popupIds.IproFamilyId + " span").text(iproFamilyMerged);
//            $("#" + this.popupIds.IproFamilyDescId + " span").hide();
//        } else {
//            $("#" + this.popupIds.IproFamilyId + " span").text(iproFamily);
//            $("#" + this.popupIds.IproFamilyDescId + " span").text(iproFamilyDesc);
//            $("#" + this.popupIds.IproFamilyDescId + " span").show();
//        }

        this.popup.removeClass("hidden");
    }

    getInfoText() {
        var data = this.curInfo;
        var family = data.Attr.pfam;
        if (!family || family.length == 0)
            family = "none";
        var familyDesc = data.Attr.pfam_desc;
        if (!familyDesc || familyDesc.length == 0)
            familyDesc = "none";
        var familyMerged = data.Attr.pfam_merged;
        if (!familyMerged || familyMerged.length == 0)
            familyMerged = "";
        if (family == "none")
            familyMerged = "none";

        var iproFamily = data.Attr.ipro_family;
        if (!iproFamily || iproFamily.length == 0)
            iproFamily = "none";
        var iproFamilyDesc = data.Attr.ipro_family_desc;
        if (!iproFamilyDesc || iproFamilyDesc.length == 0)
            iproFamilyDesc = "none";
        var iproFamilyMerged = data.Attr.ipro_family_merged;
        if (!iproFamilyMerged || iproFamilyMerged.length == 0)
            iproFamilyMerged = "";
        if (iproFamily == "none")
            iproFamilyMerged = "none";

        var acc = data.Attr.accession;
        var desc = data.Attr.desc;
        var annoStatus = data.Attr.anno_status;
        var seqLen = data.Attr.seq_len + " AA";

        var text =
            "UniProt ID\t" + acc + "\n" +
            "Description\t" + desc + "\n" +
            "Annotation Status\t" + annoStatus + "\n";
        if (familyMerged)
            text += "Pfam\t" + familyMerged + "\n";
        else
            text += "Pfam\t" + family + "\n" + "Pfam Description\t" + familyDesc + "\n";
        if (iproFamilyMerged)
            text += "InterPro\t" + iproFamilyMerged + "\n";
        else
            text += "InterPro\t" + iproFamily + "\n" + "InterPro Desc\t" + iproFamilyDesc + "\n";
        text += "Sequence Length\t" + seqLen + "\n";

        return text;
    }

}

function copyTextToClipboard(text) {
    var temp = document.createElement('textarea');
    temp.textContent = text;
    temp.style.position = "fixed";
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
    } catch (ex) {
        console.warn("Unable to copy to clipboard: ", ex);
    } finally {
        document.body.removeChild(temp);
    }
}


