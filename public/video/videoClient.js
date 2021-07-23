const socket = io.connect();
const video = document.querySelector("#videoPlayer");

video.onloadeddata = function(e) {
    socket.emit('videoStarted', {
        'date' : new Date().toISOString()
    });

    console.log(`date sent to server ${ e }`);
}