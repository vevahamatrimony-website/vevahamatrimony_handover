// Default stub for call-manager.js to resolve 404 missing file and handle WebRTC initialization
console.log('VM Call Manager script loaded successfully');
if (!window.CallManager) {
    window.CallManager = {
        init: function() { console.log('CallManager init stub called'); },
        endCall: function() { console.log('CallManager endCall stub called'); }
    };
}
