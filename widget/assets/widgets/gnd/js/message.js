

// If a class wants to listen for messages it needs to implement a function onMessage
// that receives a single parameter:
//
//     onMessage(payload) {
//         //Do something
//     }
//
// This method must return quickly since it is a blocking call.
//
// Classes can also use the router to send messages.
//
// A payload must contain a MessageType property and a Data property.  These are
// message-specific.


// This can be used, or classes can implement their own object type.
function Payload() {
    this.MessageType = "";
    this.Data = {};
}


class GndMessageRouter {
    constructor() {
        this.listeners = [];
    }

    addListener(obj) {
        if (typeof(obj.onMessage) == "function")
            this.listeners.push(obj);
    }

    sendMessage(payload) {
        var that = this;
//        setTimeout(function() {
            for (var i = 0; i < that.listeners.length; i++) {
                that.listeners[i].onMessage(payload);
            }
//        }, 0);
    }
}

