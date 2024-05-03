
class BigScape {
    constructor(gnnId, gnnKey, jobType, bigscapeStatus) {
        this.useBigscape = false;
        this.gnnId = gnnId;
        this.gnnKey = gnnKey;
        this.jobType = jobType;
        this.status = bigscapeStatus;
    }

    toggleUseBigScape() {
        this.useBigscape = !this.useBigscape;
    }

    getUseBigScape() {
        return this.useBigscape;
    }

    getStatus() {
        return this.status;
    }

    getConfirmText(status, message) {
        if (status)
            return "The BiG-SCAPE clustering is currently pending or executing.  You will receive an email when the clustering has begun and completed.";
        else
            return message;
            //return "There was an error running BiG-SCAPE.";
    }

    run(completionHandler) {
        var fd = new FormData();
        fd.append("id", this.gnnId);
        fd.append("key", this.gnnKey);
        fd.append("type", this.jobType);
        
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
}


